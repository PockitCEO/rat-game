import { WorldServer } from '../src/server/WorldServer.js'
import { GameWorld } from '../src/world/GameWorld.js'
import { AgentRegistry, Movement, GameItems } from '../src/contracts.js'
import { type Hex, encodeAbiParameters } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('🐀 RAT WORLD - Integration Test\n')
  
  // 1. Create world
  console.log('1️⃣  Creating world...')
  const worldId = 'test-world-' + Date.now()
  
  const world = new GameWorld({
    worldId,
    gridSize: 10,
    systems: ['movement', 'inventory']
  })
  console.log(`   ✓ World created: ${worldId}\n`)
  
  // 2. Deploy contracts
  console.log('2️⃣  Deploying contracts...')
  
  const registryAddress = await world.deployContract(
    'AgentRegistry',
    AgentRegistry.bytecode as Hex,
    AgentRegistry.abi
  )
  console.log(`   ✓ AgentRegistry: ${registryAddress}`)
  
  // Deploy GameItems (ERC1155 inventory)
  const itemsAddress = await world.deployContract(
    'GameItems',
    GameItems.bytecode as Hex,
    GameItems.abi
  )
  console.log(`   ✓ GameItems: ${itemsAddress}`)
  
  // Deploy Movement with constructor args (registry address, grid size)
  const movementBytecode = Movement.bytecode + 
    encodeAbiParameters(
      [{ type: 'address' }, { type: 'int32' }],
      [registryAddress, 10]
    ).slice(2) // Remove 0x prefix
  
  const movementAddress = await world.deployContract(
    'Movement',
    movementBytecode as Hex,
    Movement.abi
  )
  console.log(`   ✓ Movement: ${movementAddress}\n`)
  
  // 3. Create agents
  console.log('3️⃣  Creating agents...')
  
  const agent1 = privateKeyToAccount(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as Hex
  )
  
  const agent2 = privateKeyToAccount(
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as Hex
  )
  
  console.log(`   Agent 1: ${agent1.address}`)
  console.log(`   Agent 2: ${agent2.address}\n`)
  
  // 4. Agents join world
  console.log('4️⃣  Agents joining world...')
  
  // Agent 1 joins at (5, 5)
  await world.executeAction(
    agent1.address,
    'AgentRegistry',
    'join',
    [5, 5]
  )
  console.log('   ✓ Agent 1 joined at (5, 5)')
  
  // Give agent 1 starter pack (cheese + sword)
  await world.executeAction(
    agent1.address,
    'GameItems',
    'mint',
    [agent1.address, 1, 1] // 1 cheese
  )
  await world.executeAction(
    agent1.address,
    'GameItems',
    'mint',
    [agent1.address, 2, 1] // 1 sword
  )
  console.log('   ✓ Agent 1 received starter pack')
  
  // Agent 2 joins at (7, 7)
  await world.executeAction(
    agent2.address,
    'AgentRegistry',
    'join',
    [7, 7]
  )
  console.log('   ✓ Agent 2 joined at (7, 7)')
  
  // Give agent 2 starter pack
  await world.executeAction(
    agent2.address,
    'GameItems',
    'mint',
    [agent2.address, 1, 1] // 1 cheese
  )
  await world.executeAction(
    agent2.address,
    'GameItems',
    'mint',
    [agent2.address, 2, 1] // 1 sword
  )
  console.log('   ✓ Agent 2 received starter pack\n')
  
  // 5. Check inventories
  console.log('5️⃣  Checking inventories...')
  
  const inv1 = await world.readContract('GameItems', 'getInventory', [agent1.address])
  console.log(`   Agent 1 inventory:`)
  for (let i = 0; i < inv1[0].length; i++) {
    console.log(`     - ${inv1[2][i]}: ${inv1[1][i]}`)
  }
  
  const inv2 = await world.readContract('GameItems', 'getInventory', [agent2.address])
  console.log(`   Agent 2 inventory:`)
  for (let i = 0; i < inv2[0].length; i++) {
    console.log(`     - ${inv2[2][i]}: ${inv2[1][i]}`)
  }
  console.log('')
  
  // 6. Check positions
  console.log('6️⃣  Checking positions...')
  
  let pos1 = await world.readContract('AgentRegistry', 'getPosition', [agent1.address])
  console.log(`   Agent 1: (${pos1[0]}, ${pos1[1]})`)
  
  let pos2 = await world.readContract('AgentRegistry', 'getPosition', [agent2.address])
  console.log(`   Agent 2: (${pos2[0]}, ${pos2[1]})\n`)
  
  // 7. Move agents
  console.log('7️⃣  Moving agents...')
  
  // Agent 1 moves right (dx=1, dy=0)
  const moveParams1 = encodeAbiParameters(
    [{ type: 'int32' }, { type: 'int32' }],
    [1, 0]
  )
  
  await world.executeAction(
    agent1.address,
    'Movement',
    'execute',
    [agent1.address, moveParams1]
  )
  console.log('   ✓ Agent 1 moved right')
  
  // Agent 2 moves up (dx=0, dy=-1)
  const moveParams2 = encodeAbiParameters(
    [{ type: 'int32' }, { type: 'int32' }],
    [0, -1]
  )
  
  await world.executeAction(
    agent2.address,
    'Movement',
    'execute',
    [agent2.address, moveParams2]
  )
  console.log('   ✓ Agent 2 moved up\n')
  
  // 8. Check final positions
  console.log('8️⃣  Final positions...')
  
  pos1 = await world.readContract('AgentRegistry', 'getPosition', [agent1.address])
  console.log(`   Agent 1: (${pos1[0]}, ${pos1[1]}) - Expected (6, 5)`)
  
  pos2 = await world.readContract('AgentRegistry', 'getPosition', [agent2.address])
  console.log(`   Agent 2: (${pos2[0]}, ${pos2[1]}) - Expected (7, 6)\n`)
  
  // 9. Get agent count
  console.log('9️⃣  Agent count...')
  const count = await world.readContract('AgentRegistry', 'getAgentCount', [])
  console.log(`   Total agents: ${count}\n`)
  
  // 10. Verify
  console.log('🔟 Verifying...')
  
  // Convert to numbers for comparison
  const p1x = Number(pos1[0]), p1y = Number(pos1[1])
  const p2x = Number(pos2[0]), p2y = Number(pos2[1])
  const agentCount = Number(count)
  
  // Check inventory (each agent should have 2 items: cheese + sword)
  const hasItems1 = inv1[0].length === 2 && inv1[1].every((b: any) => Number(b) === 1)
  const hasItems2 = inv2[0].length === 2 && inv2[1].every((b: any) => Number(b) === 1)
  
  if (p1x === 6 && p1y === 5 && p2x === 7 && p2y === 6 && agentCount === 2 && hasItems1 && hasItems2) {
    console.log('   ✅ All assertions passed!')
    console.log('   ✓ Positions correct')
    console.log('   ✓ Agent count correct')
    console.log('   ✓ Inventories correct (2 items each: cheese + sword)\n')
  } else {
    console.log('   ❌ Assertion failed!\n')
    console.log(`   Expected: pos1=(6, 5), pos2=(7, 6), count=2, 2 items each`)
    console.log(`   Got: pos1=(${p1x}, ${p1y}), pos2=(${p2x}, ${p2y}), count=${agentCount}`)
    console.log(`   Items: agent1=${inv1[0].length}, agent2=${inv2[0].length}`)
    process.exit(1)
  }
  
  console.log('✅ Test complete!')
  process.exit(0)
}

main().catch(err => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
