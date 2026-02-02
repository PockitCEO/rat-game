/**
 * Rat Game - Node.js Game Loop
 * In-memory engine (tevm integration coming)
 * Controlled via OpenTUI
 */

// Game state
let gameState = {
  blockNumber: 0,
  gridSize: 100,
  agents: new Map(),
  cheeses: new Map(),
  tiles: new Map(), // position (x,y) => tileType
  marketPrice: 1, // wei per cheese
  shopTile: { x: 0, y: 0 },
};

// Simple in-memory game engine (before contract deployment)
const game = {
  // Initialize game board
  init: (gridSize = 100) => {
    gameState.gridSize = gridSize;
    gameState.blockNumber = 0;
    
    // Set up default tiles (all navigable, some random blocked)
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const pos = `${x},${y}`;
        // 10% chance of blocked tile (except shop)
        if (!(x === 0 && y === 0) && Math.random() < 0.1) {
          gameState.tiles.set(pos, 'blocked');
        } else {
          gameState.tiles.set(pos, 'navigable');
        }
      }
    }
    gameState.tiles.set('0,0', 'shop');
    console.log(`✓ Game initialized: ${gridSize}x${gridSize} grid`);
  },

  // Spawn agent at position
  spawnAgent: (agentId, x, y) => {
    if (x >= gameState.gridSize || y >= gameState.gridSize) {
      throw new Error('Out of bounds');
    }
    gameState.agents.set(agentId, {
      id: agentId,
      x,
      y,
      speed: 1,
      cheeseInventory: 0,
      lastMoveBlock: gameState.blockNumber,
    });
    console.log(`✓ Agent ${agentId} spawned at (${x}, ${y})`);
  },

  // Spawn cheese at random location
  spawnCheese: () => {
    let x, y, pos;
    do {
      x = Math.floor(Math.random() * gameState.gridSize);
      y = Math.floor(Math.random() * gameState.gridSize);
      pos = `${x},${y}`;
    } while (gameState.tiles.get(pos) === 'blocked' || gameState.tiles.get(pos) === 'shop');
    
    const cheeseId = `cheese_${Date.now()}_${Math.random()}`;
    gameState.cheeses.set(cheeseId, { x, y, exists: true });
    console.log(`🧀 Cheese ${cheeseId} spawned at (${x}, ${y})`);
    return cheeseId;
  },

  // Simple greedy pathfinding (toward target)
  moveToward: (agentId, targetX, targetY) => {
    const agent = gameState.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    
    if (agent.x === targetX && agent.y === targetY) {
      return false; // Already at target
    }

    let newX = agent.x;
    let newY = agent.y;

    // Greedy: move closer on dominant axis
    if (agent.x < targetX) newX++;
    else if (agent.x > targetX) newX--;
    else if (agent.y < targetY) newY++;
    else if (agent.y > targetY) newY--;

    // Check bounds
    if (newX < 0 || newX >= gameState.gridSize || newY < 0 || newY >= gameState.gridSize) {
      return false; // Out of bounds
    }

    // Check tile type
    const tileType = gameState.tiles.get(`${newX},${newY}`);
    if (tileType === 'blocked') {
      return false; // Can't move through blocked
    }

    agent.x = newX;
    agent.y = newY;
    return true;
  },

  // Collect cheese at current position
  collectCheese: (agentId, cheeseId) => {
    const agent = gameState.agents.get(agentId);
    const cheese = gameState.cheeses.get(cheeseId);
    
    if (!agent) throw new Error('Agent not found');
    if (!cheese || !cheese.exists) throw new Error('Cheese not found');
    
    if (agent.x !== cheese.x || agent.y !== cheese.y) {
      throw new Error('Not at cheese location');
    }

    agent.cheeseInventory++;
    cheese.exists = false;
    console.log(`✓ Agent ${agentId} collected cheese`);
  },

  // Eat cheese for speed boost
  eatCheese: (agentId) => {
    const agent = gameState.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    if (agent.cheeseInventory === 0) throw new Error('No cheese to eat');

    agent.cheeseInventory--;
    agent.speed++;
    console.log(`🍽️ Agent ${agentId} ate cheese. Speed now: ${agent.speed}`);
  },

  // Sell cheese at shop
  sellCheese: (agentId, quantity) => {
    const agent = gameState.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    
    if (agent.x !== gameState.shopTile.x || agent.y !== gameState.shopTile.y) {
      throw new Error('Not at shop');
    }
    if (agent.cheeseInventory < quantity) {
      throw new Error('Insufficient cheese');
    }

    agent.cheeseInventory -= quantity;
    const totalValue = quantity * gameState.marketPrice;
    console.log(`💰 Agent ${agentId} sold ${quantity} cheese for ${totalValue}`);
    return totalValue;
  },

  // Step the game block
  stepBlock: () => {
    gameState.blockNumber++;
    console.log(`⏳ Block ${gameState.blockNumber}`);
  },

  // Get game state snapshot
  getState: () => ({
    blockNumber: gameState.blockNumber,
    gridSize: gameState.gridSize,
    agents: Array.from(gameState.agents.values()),
    cheeses: Array.from(gameState.cheeses.entries()).map(([id, cheese]) => ({
      id,
      ...cheese,
    })),
    marketPrice: gameState.marketPrice,
  }),

  // Get agent state
  getAgent: (agentId) => {
    const agent = gameState.agents.get(agentId);
    return agent || null;
  },
};

// Export for CLI
export default game;
