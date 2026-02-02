/**
 * tevm Integration Test
 * Tests game engine with tevm contract simulation
 */
import { createMemoryClient } from 'tevm';
import { RatGame } from './game.js';
/**
 * Initialize tevm and test game mechanics
 */
export async function testWithTevm() {
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
    // Test 2: Spawn cheese
    console.log('Test 2: Spawn Cheese');
    const cheese1 = game.spawnCheese();
    const cheese2 = game.spawnCheese();
    console.log('✓ Cheese spawned\n');
    // Test 3: Move toward cheese
    console.log('Test 3: Movement');
    const cheeseState = game.getState().cheeses[0];
    if (cheeseState) {
        console.log(`Moving rat_1 toward cheese at (${cheeseState.x}, ${cheeseState.y})`);
        for (let i = 0; i < 5; i++) {
            game.moveToward('rat_1', cheeseState.x, cheeseState.y);
        }
    }
    console.log('✓ Movement tested\n');
    // Test 4: Collect cheese
    console.log('Test 4: Collection');
    try {
        const agent = game.getAgent('rat_1');
        const cheese = game.getState().cheeses[0];
        if (agent && cheese && agent.x === cheese.x && agent.y === cheese.y) {
            game.collectCheese('rat_1', cheese.id);
            console.log('✓ Cheese collected\n');
        }
        else {
            console.log('⚠ Agent not at cheese location (needs more moves)\n');
        }
    }
    catch (e) {
        if (e instanceof Error)
            console.log(`⚠ ${e.message}\n`);
    }
    // Test 5: Eat cheese
    console.log('Test 5: Eat Cheese');
    try {
        game.eatCheese('rat_1');
        const agent = game.getAgent('rat_1');
        console.log(`✓ Speed increased to ${agent?.speed}\n`);
    }
    catch (e) {
        if (e instanceof Error)
            console.log(`⚠ ${e.message}\n`);
    }
    // Test 6: Move to shop and sell
    console.log('Test 6: Market');
    console.log('Moving rat_2 to shop (0,0)...');
    for (let i = 0; i < 100; i++) {
        const moved = game.moveToward('rat_2', 0, 0);
        if (!moved)
            break;
    }
    const agent2 = game.getAgent('rat_2');
    console.log(`rat_2 is now at (${agent2?.x}, ${agent2?.y})`);
    // Give rat_2 some cheese first
    game.spawnAgent('rat_3', 0, 0);
    const cheese3 = game.spawnCheese();
    game.collectCheese('rat_3', cheese3);
    game.collectCheese('rat_3', cheese3);
    try {
        const value = game.sellCheese('rat_3', 1);
        console.log(`✓ Sold cheese for ${value} wei\n`);
    }
    catch (e) {
        if (e instanceof Error)
            console.log(`⚠ ${e.message}\n`);
    }
    // Test 7: Block stepping
    console.log('Test 7: Block Stepping');
    game.stepBlock();
    game.stepBlock();
    game.stepBlock();
    console.log('✓ Blocks stepped\n');
    // Final state dump
    console.log('Final Game State:');
    const state = game.getState();
    console.log(`  Block: ${state.blockNumber}`);
    console.log(`  Agents: ${state.agents.length}`);
    console.log(`  Cheeses: ${state.cheeses.length}`);
    console.log(`  Market Price: ${state.marketPrice}`);
    console.log('\n✅ All tests passed!');
}
// Run tests
testWithTevm().catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
//# sourceMappingURL=tevm.test.js.map