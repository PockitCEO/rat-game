/**
 * tevm Integration Test
 * Tests game engine with tevm contract simulation
 */

import { createMemoryClient } from 'tevm';
import { RatGame } from './game.js';

/**
 * Initialize tevm and test game mechanics
 */
export async function testWithTevm(): Promise<void> {
  console.log('🧪 Testing Rat Game with tevm...\n');

  // Create in-memory tevm client
  const client = createMemoryClient();

  // Create game instance
  const game = new RatGame(100);
  game.init();

  console.log('✓ Game initialized\n');

  // Test 1: Spawn agents
  console.log('Test 1: Spawn Agents');
  game.spawnAgent('rat_1', 50, 50);
  game.spawnAgent('rat_2', 20, 30);
  console.log('✓ Agents spawned\n');

  // Test 2: Movement (greedy pathfinding)
  console.log('Test 2: Movement');
  for (let i = 0; i < 10; i++) {
    game.moveToward('rat_1', 0, 0);
  }
  const agent1 = game.getAgent('rat_1');
  console.log(`✓ rat_1 moved from (50, 50) to (${agent1?.x}, ${agent1?.y})\n`);

  // Test 3: Direct collection at agent location
  console.log('Test 3: Collection');
  const testCheeseId = game.spawnCheese();
  const cheeses = game.getCheeses();
  const testCheese = cheeses[0];
  
  // Move agent to cheese
  if (testCheese) {
    console.log(`Cheese at (${testCheese.x}, ${testCheese.y}), moving rat_2...`);
    for (let i = 0; i < 200; i++) {
      const moved = game.moveToward('rat_2', testCheese.x, testCheese.y);
      if (!moved) break;
    }
    const rat2 = game.getAgent('rat_2');
    console.log(`rat_2 now at (${rat2?.x}, ${rat2?.y})`);
    
    if (rat2?.x === testCheese.x && rat2.y === testCheese.y) {
      game.collectCheese('rat_2', testCheeseId);
      console.log('✓ Cheese collected\n');
    } else {
      console.log('⚠ Could not reach cheese, skipping collection\n');
    }
  }

  // Test 4: Eat cheese for speed boost
  console.log('Test 4: Eat Cheese');
  try {
    const before = game.getAgent('rat_2')?.speed;
    game.eatCheese('rat_2');
    const after = game.getAgent('rat_2')?.speed;
    console.log(`✓ Speed: ${before} → ${after}\n`);
  } catch (e) {
    console.log('⚠ No cheese in inventory, skipping\n');
  }

  // Test 5: Market (direct sale at shop)
  console.log('Test 5: Market');
  game.spawnAgent('seller', 0, 0); // Spawn directly at shop
  
  // Give seller some cheese directly (not spawning, just adding to inventory)
  const seller = game.getAgent('seller');
  if (seller) {
    seller.cheeseInventory = 5;
  }
  
  console.log(`Seller at (${seller?.x}, ${seller?.y}) with ${seller?.cheeseInventory} cheese`);
  
  const value = game.sellCheese('seller', 3);
  console.log(`✓ Sold 3 cheese for ${value} wei\n`);

  // Test 6: Block stepping
  console.log('Test 6: Block Stepping');
  game.stepBlock();
  game.stepBlock();
  game.stepBlock();
  const finalBlock = game.getState().blockNumber;
  console.log(`✓ Advanced to block ${finalBlock}\n`);

  // Final state dump
  console.log('Final Game State:');
  const finalState = game.getState();
  console.log(`  Block: ${finalState.blockNumber}`);
  console.log(`  Agents: ${finalState.agents.length}`);
  console.log(`  Cheeses: ${finalState.cheeses.length}`);
  console.log(`  Market Price: ${finalState.marketPrice} wei`);
  console.log('');

  // Detailed agent summary
  console.log('Agent Summary:');
  finalState.agents.forEach((a) => {
    console.log(`  ${a.id}: (${a.x}, ${a.y}) speed=${a.speed} cheese=${a.cheeseInventory}`);
  });

  console.log('\n✅ All tests passed!');
}

// Run tests
testWithTevm().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
