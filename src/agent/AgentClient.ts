import { privateKeyToAccount } from 'viem/accounts'
import { type Address, type Hex, hashMessage, encodeAbiParameters } from 'viem'
import type { SignedAction } from '../server/ActionQueue.js'

/**
 * AgentClient - Sign and submit actions to the world server
 */
export class AgentClient {
  private account: ReturnType<typeof privateKeyToAccount>
  private nonce: number = 0
  private worldId: string
  private serverUrl: string
  
  constructor(privateKey: Hex, worldId: string, serverUrl: string = 'http://localhost:3000') {
    this.account = privateKeyToAccount(privateKey)
    this.worldId = worldId
    this.serverUrl = serverUrl
  }
  
  get address(): Address {
    return this.account.address
  }
  
  /**
   * Sign an action
   */
  async signAction(action: string, params: any[]): Promise<SignedAction> {
    const timestamp = Date.now()
    const nonce = this.nonce++
    
    const message = JSON.stringify({
      worldId: this.worldId,
      action,
      params,
      nonce,
      timestamp
    })
    
    const signature = await this.account.signMessage({
      message
    })
    
    return {
      worldId: this.worldId,
      agentAddress: this.account.address,
      action,
      params,
      nonce,
      timestamp,
      signature
    }
  }
  
  /**
   * Submit a signed action to the server
   */
  async submitAction(action: string, params: any[]): Promise<any> {
    const signedAction = await this.signAction(action, params)
    
    const response = await fetch(`${this.serverUrl}/world/${this.worldId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(signedAction)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Action submission failed')
    }
    
    return await response.json()
  }
  
  /**
   * Join the world
   */
  async join(x: number, y: number): Promise<any> {
    // Call AgentRegistry.join() via server
    return await this.submitAction('AgentRegistry', [x, y])
  }
  
  /**
   * Move in a direction
   */
  async move(dx: number, dy: number): Promise<any> {
    return await this.submitAction('Movement', [dx, dy])
  }
}
