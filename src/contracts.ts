import { readFileSync } from 'fs'
import { join } from 'path'

export function loadContract(name: string) {
  const abiPath = join(process.cwd(), 'compiled', `${name}.abi`)
  const binPath = join(process.cwd(), 'compiled', `${name}.bin`)
  
  const abi = JSON.parse(readFileSync(abiPath, 'utf-8'))
  const bytecode = `0x${readFileSync(binPath, 'utf-8')}`
  
  return { abi, bytecode }
}

export const AgentRegistry = loadContract('contracts_core_AgentRegistry_sol_AgentRegistry')
export const Movement = loadContract('contracts_core_Movement_sol_Movement')
export const GameItems = loadContract('contracts_core_GameItems_sol_GameItems')
export const Combat = loadContract('contracts_core_Combat_sol_Combat')
export const Pickup = loadContract('contracts_core_Pickup_sol_Pickup')
export const UseItem = loadContract('contracts_core_UseItem_sol_UseItem')
