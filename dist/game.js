/**
 * Rat Game - Game Engine (TypeScript)
 * Syncs between in-memory state and tevm contract calls
 */
export var TileType;
(function (TileType) {
    TileType[TileType["Empty"] = 0] = "Empty";
    TileType[TileType["Navigable"] = 1] = "Navigable";
    TileType[TileType["Blocked"] = 2] = "Blocked";
    TileType[TileType["Shop"] = 3] = "Shop";
})(TileType || (TileType = {}));
export class RatGame {
    constructor(gridSize = 100) {
        this.blockNumber = 0;
        this.gridSize = 100;
        this.agents = new Map();
        this.cheeses = new Map();
        this.tiles = new Map();
        this.marketPrice = 1;
        this.shopTile = { x: 0, y: 0 };
        this.gridSize = gridSize;
    }
    /**
     * Initialize the game board with random obstacles
     */
    init() {
        this.blockNumber = 0;
        // Set up default tiles (all navigable, some random blocked)
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const pos = `${x},${y}`;
                // 10% chance of blocked tile (except shop)
                if (!(x === 0 && y === 0) && Math.random() < 0.1) {
                    this.tiles.set(pos, TileType.Blocked);
                }
                else if (x === 0 && y === 0) {
                    this.tiles.set(pos, TileType.Shop);
                }
                else {
                    this.tiles.set(pos, TileType.Navigable);
                }
            }
        }
        console.log(`✓ Game initialized: ${this.gridSize}x${this.gridSize} grid`);
    }
    /**
     * Spawn an agent at a position
     */
    spawnAgent(agentId, x, y) {
        if (x >= this.gridSize || y >= this.gridSize || x < 0 || y < 0) {
            throw new Error('Out of bounds');
        }
        this.agents.set(agentId, {
            id: agentId,
            x,
            y,
            speed: 1,
            cheeseInventory: 0,
            lastMoveBlock: this.blockNumber,
        });
        console.log(`✓ Agent ${agentId} spawned at (${x}, ${y})`);
    }
    /**
     * Spawn cheese at random navigable location
     */
    spawnCheese() {
        let x, y, pos;
        do {
            x = Math.floor(Math.random() * this.gridSize);
            y = Math.floor(Math.random() * this.gridSize);
            pos = `${x},${y}`;
        } while (this.tiles.get(pos) === TileType.Blocked ||
            this.tiles.get(pos) === TileType.Shop);
        const cheeseId = `cheese_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        this.cheeses.set(cheeseId, { id: cheeseId, x, y, exists: true });
        console.log(`🧀 Cheese ${cheeseId} spawned at (${x}, ${y})`);
        return cheeseId;
    }
    /**
     * Move agent greedily toward target
     */
    moveToward(agentId, targetX, targetY) {
        const agent = this.agents.get(agentId);
        if (!agent)
            throw new Error('Agent not found');
        if (agent.x === targetX && agent.y === targetY) {
            return false; // Already at target
        }
        let newX = agent.x;
        let newY = agent.y;
        // Greedy: move closer on dominant axis
        if (agent.x < targetX)
            newX++;
        else if (agent.x > targetX)
            newX--;
        else if (agent.y < targetY)
            newY++;
        else if (agent.y > targetY)
            newY--;
        // Check bounds
        if (newX < 0 ||
            newX >= this.gridSize ||
            newY < 0 ||
            newY >= this.gridSize) {
            return false; // Out of bounds
        }
        // Check tile type
        const tileType = this.tiles.get(`${newX},${newY}`);
        if (tileType === TileType.Blocked) {
            return false; // Can't move through blocked
        }
        agent.x = newX;
        agent.y = newY;
        console.log(`👣 Agent ${agentId} moved to (${newX}, ${newY})`);
        return true;
    }
    /**
     * Collect cheese at agent's current position
     */
    collectCheese(agentId, cheeseId) {
        const agent = this.agents.get(agentId);
        const cheese = this.cheeses.get(cheeseId);
        if (!agent)
            throw new Error('Agent not found');
        if (!cheese || !cheese.exists)
            throw new Error('Cheese not found');
        if (agent.x !== cheese.x || agent.y !== cheese.y) {
            throw new Error('Not at cheese location');
        }
        agent.cheeseInventory++;
        cheese.exists = false;
        console.log(`✓ Agent ${agentId} collected cheese`);
    }
    /**
     * Eat cheese for speed boost
     */
    eatCheese(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent)
            throw new Error('Agent not found');
        if (agent.cheeseInventory === 0)
            throw new Error('No cheese to eat');
        agent.cheeseInventory--;
        agent.speed++;
        console.log(`🍽️  Agent ${agentId} ate cheese. Speed now: ${agent.speed}`);
    }
    /**
     * Sell cheese at shop
     */
    sellCheese(agentId, quantity) {
        const agent = this.agents.get(agentId);
        if (!agent)
            throw new Error('Agent not found');
        if (agent.x !== this.shopTile.x || agent.y !== this.shopTile.y) {
            throw new Error('Not at shop');
        }
        if (agent.cheeseInventory < quantity) {
            throw new Error('Insufficient cheese');
        }
        agent.cheeseInventory -= quantity;
        const totalValue = quantity * this.marketPrice;
        console.log(`💰 Agent ${agentId} sold ${quantity} cheese for ${totalValue}`);
        return totalValue;
    }
    /**
     * Step the game forward one block
     */
    stepBlock() {
        this.blockNumber++;
        console.log(`⏳ Block ${this.blockNumber}`);
    }
    /**
     * Get current game state snapshot
     */
    getState() {
        return {
            blockNumber: this.blockNumber,
            gridSize: this.gridSize,
            agents: Array.from(this.agents.values()),
            cheeses: Array.from(this.cheeses.values()).filter((c) => c.exists),
            marketPrice: this.marketPrice,
            shopTile: this.shopTile,
        };
    }
    /**
     * Get single agent state
     */
    getAgent(agentId) {
        return this.agents.get(agentId) || null;
    }
    /**
     * Get tile type at position
     */
    getTile(x, y) {
        return this.tiles.get(`${x},${y}`) || TileType.Empty;
    }
    /**
     * Get all agents
     */
    getAgents() {
        return Array.from(this.agents.values());
    }
    /**
     * Get all cheeses
     */
    getCheeses() {
        return Array.from(this.cheeses.values()).filter((c) => c.exists);
    }
}
export default new RatGame(100);
//# sourceMappingURL=game.js.map