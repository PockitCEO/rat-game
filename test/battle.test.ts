import { GameWorld } from '../src/world/GameWorld.js'
import { AgentRegistry, Movement, GameItems, Combat, Pickup, UseItem } from '../src/contracts.js'
import { type Hex, encodeAbiParameters, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function simpleAI(
  world: GameWorld,
  agent: Address,
  opponent: Address
): Promise<{ action: string, params: any[] }> {
  // Get agent state
  const pos = await world.readContract('AgentRegistry', 'getPosition', [agent])
  const hp = await world.readContract('AgentRegistry', 'getHp', [agent])
  const oppPos = await world.readContract('AgentRegistry', 'getPosition', [opponent])
  const oppHp = await world.readContract('AgentRegistry', 'getHp', [opponent])
  
  const x = Number(pos[0]), y = Number(pos[1])
  const ox = Number(oppPos[0]), oy = Number(oppPos[1])
  const myHp = Number(hp), oppHpNum = Number(oppHp)
  
  // Get inventory
  const inv = await world.readContract('GameItems', 'getInventory', [agent])
  const hasCheese = inv[0].some((id: any) => Number(id) === 1)
  const hasSword = inv[0].some((id: any) => Number(id) === 2)
  
  // Check if adjacent to opponent
  const dx = Math.abs(x - ox)
  const dy = Math.abs(y - oy)
  const isAdjacent = dx + dy === 1
  
  // Check if cheese at current position
  const cheeseHere = await world.readContract('Pickup', 'getItemAt', [x, y, 1])
  const swordHere = await world.readContract('Pickup', 'getItemAt', [x, y, 2])
  
  // Decision tree:
  // 1. If low HP and have cheese, eat it
  if (myHp <= 5 && hasCheese) {
    return { action: 'UseItem', params: [1] } // Eat cheese
  }
  
  // 2. If item at current position, pick it up
  if (Number(cheeseHere) > 0) {
    return { action: 'Pickup', params: [1] } // Pick up cheese
  }
  if (Number(swordHere) > 0 && !hasSword) {
    return { action: 'Pickup', params: [2] } // Pick up sword
  }
  
  // 3. If adjacent to opponent and has sword, attack
  if (isAdjacent && hasSword) {
    return { action: 'Combat', params: [opponent] }
  }
  
  // 4. If adjacent to opponent but no sword, move towards cheese/sword
  // 5. Otherwise, move towards opponent
  
  // Simple movement: move 1 step towards opponent
  let moveX = 0, moveY = 0
  
  if (x < ox) moveX = 1
  else if (x > ox) moveX = -1
  
  if (y < oy) moveY = 1
  else if (y > oy) moveY = -1
  
  // Pick one direction (prioritize horizontal)
  if (moveX !== 0) {
    return { action: 'Movement', params: [moveX, 0] }
  } else if (moveY !== 0) {
    return { action: 'Movement', params: [0, moveY] }
  }
  
  // Fallback: random move
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  const dir = dirs[randomInt(0, 3)]
  return { action: 'Movement', params: dir }
}

async function main() {
  console.log('⚔️  RAT BATTLE ROYALE\n')
  
  // 1. Create world
  console.log('1️⃣  Creating world...')
  const worldId = 'battle-' + Date.now()
  
  const world = new GameWorld({
    worldId,
    gridSize: 10,
    systems: ['movement', 'inventory', 'combat', 'pickup', 'useitem']
  })
  console.log(`   ✓ World created\n`)
  
  // 2. Deploy contracts
  console.log('2️⃣  Deploying contracts...')
  
  const registryAddr = await world.deployContract(
    'AgentRegistry',
    AgentRegistry.bytecode as Hex,
    AgentRegistry.abi
  )
  
  const itemsAddr = await world.deployContract(
    'GameItems',
    GameItems.bytecode as Hex,
    GameItems.abi
  )
  
  const movementAddr = await world.deployContract(
    'Movement',
    (Movement.bytecode + encodeAbiParameters(
      [{ type: 'address' }, { type: 'int32' }],
      [registryAddr, 10]
    ).slice(2)) as Hex,
    Movement.abi
  )
  
  const combatAddr = await world.deployContract(
    'Combat',
    (Combat.bytecode + encodeAbiParameters(
      [{ type: 'address' }, { type: 'address' }],
      [registryAddr, itemsAddr]
    ).slice(2)) as Hex,
    Combat.abi
  )
  
  const pickupAddr = await world.deployContract(
    'Pickup',
    (Pickup.bytecode + encodeAbiParameters(
      [{ type: 'address' }, { type: 'address' }, { type: 'int32' }],
      [registryAddr, itemsAddr, 10]
    ).slice(2)) as Hex,
    Pickup.abi
  )
  
  const useItemAddr = await world.deployContract(
    'UseItem',
    (UseItem.bytecode + encodeAbiParameters(
      [{ type: 'address' }, { type: 'address' }],
      [registryAddr, itemsAddr]
    ).slice(2)) as Hex,
    UseItem.abi
  )
  
  console.log(`   ✓ All contracts deployed\n`)
  
  // 3. Spawn items in the world
  console.log('3️⃣  Spawning items...')
  
  // Spawn 2 cheese at random positions
  const cheese1 = { x: randomInt(2, 7), y: randomInt(2, 7) }
  const cheese2 = { x: randomInt(2, 7), y: randomInt(2, 7) }
  
  // Spawn 2 swords
  const sword1 = { x: randomInt(2, 7), y: randomInt(2, 7) }
  const sword2 = { x: randomInt(2, 7), y: randomInt(2, 7) }
  
  // Use default deployer account for spawning
  const deployer = privateKeyToAccount(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as Hex
  )
  
  await world.executeAction(deployer.address, 'Pickup', 'spawnItem', [cheese1.x, cheese1.y, 1, 1])
  await world.executeAction(deployer.address, 'Pickup', 'spawnItem', [cheese2.x, cheese2.y, 1, 1])
  await world.executeAction(deployer.address, 'Pickup', 'spawnItem', [sword1.x, sword1.y, 2, 1])
  await world.executeAction(deployer.address, 'Pickup', 'spawnItem', [sword2.x, sword2.y, 2, 1])
  
  console.log(`   ✓ Cheese at (${cheese1.x}, ${cheese1.y}) and (${cheese2.x}, ${cheese2.y})`)
  console.log(`   ✓ Swords at (${sword1.x}, ${sword1.y}) and (${sword2.x}, ${sword2.y})\n`)
  
  // 4. Spawn agents at random positions
  console.log('4️⃣  Spawning agents...')
  
  const agent1 = privateKeyToAccount(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as Hex
  )
  
  const agent2 = privateKeyToAccount(
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as Hex
  )
  
  const pos1 = { x: randomInt(0, 9), y: randomInt(0, 9) }
  const pos2 = { x: randomInt(0, 9), y: randomInt(0, 9) }
  
  await world.executeAction(agent1.address, 'AgentRegistry', 'join', [pos1.x, pos1.y])
  await world.executeAction(agent2.address, 'AgentRegistry', 'join', [pos2.x, pos2.y])
  
  console.log(`   Agent 1 (${agent1.address.slice(0, 6)}...): (${pos1.x}, ${pos1.y}) - 10 HP`)
  console.log(`   Agent 2 (${agent2.address.slice(0, 6)}...): (${pos2.x}, ${pos2.y}) - 10 HP\n`)
  
  // 5. Battle simulation
  console.log('⚔️  BATTLE START\n')
  
  let turn = 0
  const maxTurns = 50
  
  while (turn < maxTurns) {
    turn++
    console.log(`--- Turn ${turn} ---`)
    
    // Check if both alive
    const alive1 = await world.readContract('AgentRegistry', 'isAlive', [agent1.address])
    const alive2 = await world.readContract('AgentRegistry', 'isAlive', [agent2.address])
    
    if (!alive1 || !alive2) {
      console.log('\n💀 Battle ended!')
      if (alive1) console.log(`   Winner: Agent 1 (${agent1.address.slice(0, 6)}...)`)
      else if (alive2) console.log(`   Winner: Agent 2 (${agent2.address.slice(0, 6)}...)`)
      else console.log(`   Both agents died!`)
      break
    }
    
    // Agent 1 turn
    try {
      const action1 = await simpleAI(world, agent1.address, agent2.address)
      
      if (action1.action === 'Combat') {
        await world.executeAction(
          agent1.address,
          'Combat',
          'execute',
          [agent1.address, encodeAbiParameters([{ type: 'address' }], [action1.params[0]])]
        )
      } else if (action1.action === 'Movement') {
        await world.executeAction(
          agent1.address,
          'Movement',
          'execute',
          [agent1.address, encodeAbiParameters([{ type: 'int32' }, { type: 'int32' }], action1.params)]
        )
      } else if (action1.action === 'Pickup') {
        await world.executeAction(
          agent1.address,
          'Pickup',
          'execute',
          [agent1.address, encodeAbiParameters([{ type: 'uint256' }], action1.params)]
        )
      } else if (action1.action === 'UseItem') {
        await world.executeAction(
          agent1.address,
          'UseItem',
          'execute',
          [agent1.address, encodeAbiParameters([{ type: 'uint256' }], action1.params)]
        )
      }
      
      console.log(`  Agent 1: ${action1.action}`)
    } catch (e: any) {
      console.log(`  Agent 1 failed: ${e.message.split('\n')[0]}`)
    }
    
    // Agent 2 turn
    try {
      const action2 = await simpleAI(world, agent2.address, agent1.address)
      
      if (action2.action === 'Combat') {
        await world.executeAction(
          agent2.address,
          'Combat',
          'execute',
          [agent2.address, encodeAbiParameters([{ type: 'address' }], [action2.params[0]])]
        )
      } else if (action2.action === 'Movement') {
        await world.executeAction(
          agent2.address,
          'Movement',
          'execute',
          [agent2.address, encodeAbiParameters([{ type: 'int32' }, { type: 'int32' }], action2.params)]
        )
      } else if (action2.action === 'Pickup') {
        await world.executeAction(
          agent2.address,
          'Pickup',
          'execute',
          [agent2.address, encodeAbiParameters([{ type: 'uint256' }], action2.params)]
        )
      } else if (action2.action === 'UseItem') {
        await world.executeAction(
          agent2.address,
          'UseItem',
          'execute',
          [agent2.address, encodeAbiParameters([{ type: 'uint256' }], action2.params)]
        )
      }
      
      console.log(`  Agent 2: ${action2.action}`)
    } catch (e: any) {
      console.log(`  Agent 2 failed: ${e.message.split('\n')[0]}`)
    }
    
    // Print status
    const hp1 = await world.readContract('AgentRegistry', 'getHp', [agent1.address])
    const hp2 = await world.readContract('AgentRegistry', 'getHp', [agent2.address])
    const pos1Now = await world.readContract('AgentRegistry', 'getPosition', [agent1.address])
    const pos2Now = await world.readContract('AgentRegistry', 'getPosition', [agent2.address])
    
    console.log(`  Agent 1: (${pos1Now[0]}, ${pos1Now[1]}) - ${hp1} HP`)
    console.log(`  Agent 2: (${pos2Now[0]}, ${pos2Now[1]}) - ${hp2} HP\n`)
    
    await sleep(100)
  }
  
  if (turn >= maxTurns) {
    console.log('⏱️  Time limit reached!')
  }
  
  console.log('\n✅ Battle complete!')
  process.exit(0)
}

main().catch(err => {
  console.error('❌ Battle failed:', err)
  process.exit(1)
})
