import { type Address, type Hex, recoverAddress, hashMessage } from 'viem'

export interface SignedAction {
  worldId: string
  agentAddress: Address
  action: string        // Contract function name
  params: any[]         // Function arguments
  nonce: number
  timestamp: number
  signature: Hex
}

/**
 * ActionQueue - Buffer signed actions between ticks
 */
export class ActionQueue {
  private queue: SignedAction[] = []
  private processedNonces: Map<Address, Set<number>> = new Map()
  
  /**
   * Add signed action to queue
   */
  push(action: SignedAction): void {
    // Check for replay attacks (duplicate nonce)
    const agentNonces = this.processedNonces.get(action.agentAddress) || new Set()
    if (agentNonces.has(action.nonce)) {
      throw new Error(`Duplicate nonce ${action.nonce} for agent ${action.agentAddress}`)
    }
    
    this.queue.push(action)
  }
  
  /**
   * Flush all queued actions and mark nonces as processed
   */
  flush(): SignedAction[] {
    const actions = [...this.queue]
    this.queue = []
    
    // Mark nonces as processed
    for (const action of actions) {
      const agentNonces = this.processedNonces.get(action.agentAddress) || new Set()
      agentNonces.add(action.nonce)
      this.processedNonces.set(action.agentAddress, agentNonces)
    }
    
    return actions
  }
  
  /**
   * Get current queue size
   */
  size(): number {
    return this.queue.length
  }
  
  /**
   * Clear all queued actions (e.g., on world reset)
   */
  clear(): void {
    this.queue = []
    this.processedNonces.clear()
  }
}

/**
 * SignatureVerifier - Verify EIP-191 signed messages
 */
export class SignatureVerifier {
  /**
   * Verify a signed action and recover signer address
   */
  static async verify(signedAction: SignedAction): Promise<boolean> {
    try {
      const message = this.encodeActionMessage(signedAction)
      const recovered = await recoverAddress({
        hash: hashMessage(message),
        signature: signedAction.signature
      })
      
      return recovered.toLowerCase() === signedAction.agentAddress.toLowerCase()
    } catch (error) {
      return false
    }
  }
  
  /**
   * Encode action into signable message
   */
  private static encodeActionMessage(action: SignedAction): string {
    return JSON.stringify({
      worldId: action.worldId,
      action: action.action,
      params: action.params,
      nonce: action.nonce,
      timestamp: action.timestamp
    })
  }
}
