import { createMemoryClient, type MemoryClient } from 'tevm'
import { type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

export interface WorldConfig {
  worldId: string
  gridSize: number
  systems: string[] // e.g. ['hunger', 'combat', 'crafting']
}

export interface DeployedContract {
  name: string
  address: Address
  abi: any[]
}

// Default deployer account (test private key)
const DEFAULT_DEPLOYER = privateKeyToAccount(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
)

/**
 * GameWorld - Single tevm instance representing one game world
 * Each world is an isolated EVM chain with deployed game contracts
 */
export class GameWorld {
  public readonly id: string
  public readonly tevm: MemoryClient
  public readonly config: WorldConfig
  
  private contracts: Map<string, DeployedContract> = new Map()
  
  constructor(config: WorldConfig) {
    this.id = config.worldId
    this.config = config
    this.tevm = createMemoryClient({
      account: DEFAULT_DEPLOYER
    })
  }
  
  /**
   * Deploy a contract to this world
   */
  async deployContract(name: string, bytecode: Hex, abi: any[]): Promise<Address> {
    try {
      // Deploy using tevm's contract action
      const deployResult = await this.tevm.tevmDeploy({
        bytecode,
        abi,
        createTransaction: true
      })
      
      if (!deployResult.createdAddress) {
        console.error('Deploy result:', deployResult)
        throw new Error(`Failed to deploy ${name}: ${deployResult.errors?.[0]?.message || 'unknown error'}`)
      }
      
      // Mine a block to persist the deployment
      await this.tevm.tevmMine()
      
      this.contracts.set(name, {
        name,
        address: deployResult.createdAddress,
        abi
      })
      
      return deployResult.createdAddress
    } catch (error) {
      console.error(`Deploy error for ${name}:`, error)
      throw new Error(`Failed to deploy ${name}`)
    }
  }
  
  /**
   * Get deployed contract by name
   */
  getContract(name: string): DeployedContract | undefined {
    return this.contracts.get(name)
  }
  
  /**
   * Execute an action contract call
   */
  async executeAction(
    agentAddress: Address,
    actionContract: string,
    functionName: string,
    args: any[]
  ) {
    const contract = this.contracts.get(actionContract)
    if (!contract) {
      throw new Error(`Contract ${actionContract} not deployed`)
    }
    
    const result = await this.tevm.tevmContract({
      to: contract.address,
      abi: contract.abi,
      functionName,
      args,
      caller: agentAddress, // Impersonate agent
      createTransaction: true // Persist state changes
    })
    
    if (result.errors && result.errors.length > 0) {
      throw new Error(`Action failed: ${result.errors[0].message}`)
    }
    
    // Mine block to persist
    await this.tevm.tevmMine()
    
    return result
  }
  
  /**
   * Read contract state
   */
  async readContract(
    contractName: string,
    functionName: string,
    args: any[] = []
  ) {
    const contract = this.contracts.get(contractName)
    if (!contract) {
      throw new Error(`Contract ${contractName} not deployed`)
    }
    
    const result = await this.tevm.tevmContract({
      to: contract.address,
      abi: contract.abi,
      functionName,
      args
    })
    
    if (result.errors && result.errors.length > 0) {
      throw new Error(`Read failed: ${result.errors[0].message}`)
    }
    
    return result.data
  }
  
  /**
   * Get all deployed contracts
   */
  getDeployedContracts(): DeployedContract[] {
    return Array.from(this.contracts.values())
  }
}
