// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title RatGameDiamond
 * @dev Diamond proxy contract for Rat Game
 * Uses Diamond Standard (EIP-2535) for upgradeable game logic
 */

// Diamond storage (shared across all facets)
struct GameState {
    uint256 blockNumber;
    uint256 gridSize;
    mapping(uint256 => TileType) tiles; // packed position => type
    mapping(address => AgentState) agents;
    mapping(uint256 => CheeseSpawn) cheeses; // position => cheese data
    uint256 cheeseCount;
    address shopTile;
    uint256 marketPrice; // wei per cheese
}

enum TileType {
    Empty,      // 0
    Navigable,  // 1
    Blocked,    // 2
    Shop        // 3
}

struct AgentState {
    uint256 x;
    uint256 y;
    uint256 cheeseInventory;
    uint256 speed; // base 1, +1 for each cheese eaten
    uint256 lastMoveBlock;
    bool active;
}

struct CheeseSpawn {
    uint256 x;
    uint256 y;
    bool exists;
}

library LibRatGame {
    bytes32 constant GAME_STATE_STORAGE = keccak256("rat.game.storage");

    function gameState() internal pure returns (GameState storage gs) {
        bytes32 position = GAME_STATE_STORAGE;
        assembly {
            gs.slot := position
        }
    }

    // Encode x,y to single uint256 for tile storage
    function encodePosition(uint256 x, uint256 y, uint256 gridSize) internal pure returns (uint256) {
        return y * gridSize + x;
    }

    // Decode position
    function decodePosition(uint256 pos, uint256 gridSize) internal pure returns (uint256 x, uint256 y) {
        y = pos / gridSize;
        x = pos % gridSize;
    }

    // Manhattan distance for pathfinding heuristic
    function manhattanDistance(uint256 x1, uint256 y1, uint256 x2, uint256 y2) internal pure returns (uint256) {
        uint256 dx = x1 > x2 ? x1 - x2 : x2 - x1;
        uint256 dy = y1 > y2 ? y1 - y2 : y2 - y1;
        return dx + dy;
    }
}

/**
 * FACET: GameStateFacet
 * Handles game initialization and state queries
 */
contract GameStateFacet {
    using LibRatGame for *;

    event GameInitialized(uint256 gridSize, address shopTile);
    event BlockStepped(uint256 blockNumber);

    function initializeGame(uint256 gridSize, address shopTile) external {
        GameState storage gs = LibRatGame.gameState();
        gs.blockNumber = block.number;
        gs.gridSize = gridSize;
        gs.shopTile = shopTile;
        gs.marketPrice = 1 ether; // 1 wei per cheese initially
        
        emit GameInitialized(gridSize, shopTile);
    }

    function getGameState() external view returns (uint256 blockNumber, uint256 gridSize, address shop, uint256 price) {
        GameState storage gs = LibRatGame.gameState();
        return (gs.blockNumber, gs.gridSize, gs.shopTile, gs.marketPrice);
    }

    function stepBlock() external {
        GameState storage gs = LibRatGame.gameState();
        gs.blockNumber += 1;
        emit BlockStepped(gs.blockNumber);
    }

    function getAgentState(address agent) external view returns (uint256 x, uint256 y, uint256 cheese, uint256 speed) {
        GameState storage gs = LibRatGame.gameState();
        AgentState storage a = gs.agents[agent];
        return (a.x, a.y, a.cheeseInventory, a.speed);
    }

    function getTile(uint256 x, uint256 y) external view returns (TileType) {
        GameState storage gs = LibRatGame.gameState();
        uint256 pos = LibRatGame.encodePosition(x, y, gs.gridSize);
        return gs.tiles[pos];
    }
}

/**
 * FACET: MovementFacet
 * Handles movement, pathfinding, collision
 */
contract MovementFacet {
    using LibRatGame for *;

    event AgentMoved(address indexed agent, uint256 x, uint256 y, uint256 blockNumber);
    event AgentSpawned(address indexed agent, uint256 x, uint256 y);

    function spawn(address agent, uint256 x, uint256 y) external {
        GameState storage gs = LibRatGame.gameState();
        require(x < gs.gridSize && y < gs.gridSize, "Out of bounds");
        
        AgentState storage a = gs.agents[agent];
        a.x = x;
        a.y = y;
        a.speed = 1; // base speed
        a.active = true;
        a.cheeseInventory = 0;
        
        emit AgentSpawned(agent, x, y);
    }

    // Simple greedy movement toward target
    // Returns true if moved, false if blocked or already at target
    function moveToward(address agent, uint256 targetX, uint256 targetY) external returns (bool) {
        GameState storage gs = LibRatGame.gameState();
        AgentState storage a = gs.agents[agent];
        
        require(a.active, "Agent not active");
        require(targetX < gs.gridSize && targetY < gs.gridSize, "Target out of bounds");

        // Current position
        uint256 x = a.x;
        uint256 y = a.y;

        // Already at target
        if (x == targetX && y == targetY) return false;

        // Greedy: move closer on x or y axis
        uint256 newX = x;
        uint256 newY = y;

        if (x < targetX) newX++;
        else if (x > targetX) newX--;

        if (y < targetY && newX == x) newY++;
        else if (y > targetY && newX == x) newY--;

        // Check if new tile is navigable
        uint256 newPos = LibRatGame.encodePosition(newX, newY, gs.gridSize);
        TileType tileType = gs.tiles[newPos];
        
        if (tileType == TileType.Blocked) return false;

        // Move
        a.x = newX;
        a.y = newY;
        a.lastMoveBlock = gs.blockNumber;

        emit AgentMoved(agent, newX, newY, gs.blockNumber);
        return true;
    }

    function setTile(uint256 x, uint256 y, TileType tileType) external {
        GameState storage gs = LibRatGame.gameState();
        uint256 pos = LibRatGame.encodePosition(x, y, gs.gridSize);
        gs.tiles[pos] = tileType;
    }
}

/**
 * FACET: ResourcesFacet
 * Handles cheese spawning, eating, inventory
 */
contract ResourcesFacet {
    using LibRatGame for *;

    event CheeseSpawned(uint256 indexed cheeseId, uint256 x, uint256 y, uint256 blockNumber);
    event CheeseEaten(address indexed agent, uint256 cheeseId, uint256 newSpeed);
    event CheeseCollected(address indexed agent, uint256 cheeseId);

    function spawnCheese(uint256 x, uint256 y) external returns (uint256) {
        GameState storage gs = LibRatGame.gameState();
        require(x < gs.gridSize && y < gs.gridSize, "Out of bounds");

        uint256 cheeseId = gs.cheeseCount;
        gs.cheeses[cheeseId] = CheeseSpawn(x, y, true);
        gs.cheeseCount++;

        emit CheeseSpawned(cheeseId, x, y, gs.blockNumber);
        return cheeseId;
    }

    function collectCheese(address agent, uint256 cheeseId) external {
        GameState storage gs = LibRatGame.gameState();
        AgentState storage a = gs.agents[agent];
        CheeseSpawn storage cheese = gs.cheeses[cheeseId];

        require(cheese.exists, "Cheese does not exist");
        require(a.x == cheese.x && a.y == cheese.y, "Not at cheese location");

        a.cheeseInventory++;
        cheese.exists = false;

        emit CheeseCollected(agent, cheeseId);
    }

    function eatCheese(address agent) external {
        GameState storage gs = LibRatGame.gameState();
        AgentState storage a = gs.agents[agent];

        require(a.cheeseInventory > 0, "No cheese to eat");
        a.cheeseInventory--;
        a.speed++;

        emit CheeseEaten(agent, 0, a.speed);
    }

    function getCheeseState(uint256 cheeseId) external view returns (uint256 x, uint256 y, bool exists) {
        GameState storage gs = LibRatGame.gameState();
        CheeseSpawn storage cheese = gs.cheeses[cheeseId];
        return (cheese.x, cheese.y, cheese.exists);
    }
}

/**
 * FACET: MarketFacet
 * Handles cheese selling at shop
 */
contract MarketFacet {
    using LibRatGame for *;

    event CheeseSold(address indexed agent, uint256 quantity, uint256 totalValue);
    event PriceUpdated(uint256 newPrice);

    function sellCheese(address agent, uint256 quantity) external returns (uint256) {
        GameState storage gs = LibRatGame.gameState();
        AgentState storage a = gs.agents[agent];

        require(a.x == 0 && a.y == 0, "Not at shop"); // Shop at 0,0 for now
        require(a.cheeseInventory >= quantity, "Insufficient cheese");

        a.cheeseInventory -= quantity;
        uint256 totalValue = quantity * gs.marketPrice;

        emit CheeseSold(agent, quantity, totalValue);
        return totalValue;
    }

    function updatePrice(uint256 newPrice) external {
        GameState storage gs = LibRatGame.gameState();
        gs.marketPrice = newPrice;
        emit PriceUpdated(newPrice);
    }

    function getMarketPrice() external view returns (uint256) {
        GameState storage gs = LibRatGame.gameState();
        return gs.marketPrice;
    }
}
