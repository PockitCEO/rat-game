import { GameWorld } from '../world/GameWorld.js'
import { ActionQueue, type SignedAction, SignatureVerifier } from './ActionQueue.js'

export interface TickEngineConfig {
  tickRate: number // milliseconds between ticks
  maxActionsPerTick?: number // Optional rate limiting
}

/**
 * TickEngine - Executes queued actions on a fixed tick schedule
 */
export class TickEngine {
  private world: GameWorld
  private config: TickEngineConfig
  private actionQueue: ActionQueue
  private tickInterval: NodeJS.Timeout | null = null
  private tickCount: number = 0
  private running: boolean = false
  
  constructor(world: GameWorld, config: TickEngineConfig) {
    this.world = world
    this.config = config
    this.actionQueue = new ActionQueue()
  }
  
  /**
   * Start the tick loop
   */
  start(): void {
    if (this.running) {
      throw new Error('TickEngine already running')
    }
    
    this.running = true
    this.tickInterval = setInterval(() => {
      this.tick().catch(err => {
        console.error('[TickEngine] Tick failed:', err)
      })
    }, this.config.tickRate)
    
    console.log(`[TickEngine] Started for world ${this.world.id} @ ${this.config.tickRate}ms`)
  }
  
  /**
   * Stop the tick loop
   */
  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
    this.running = false
    console.log(`[TickEngine] Stopped for world ${this.world.id}`)
  }
  
  /**
   * Queue a signed action for next tick
   */
  async queueAction(signedAction: SignedAction): Promise<void> {
    // Verify signature
    const valid = await SignatureVerifier.verify(signedAction)
    if (!valid) {
      throw new Error('Invalid signature')
    }
    
    // Verify world ID matches
    if (signedAction.worldId !== this.world.id) {
      throw new Error(`Action for wrong world: ${signedAction.worldId} !== ${this.world.id}`)
    }
    
    // Add to queue
    this.actionQueue.push(signedAction)
  }
  
  /**
   * Execute one tick
   */
  private async tick(): Promise<void> {
    this.tickCount++
    
    // Flush queued actions
    const actions = this.actionQueue.flush()
    
    if (actions.length === 0) {
      // console.log(`[Tick ${this.tickCount}] No actions`)
      return
    }
    
    console.log(`[Tick ${this.tickCount}] Processing ${actions.length} actions`)
    
    // Execute each action onchain
    const results = []
    for (const action of actions) {
      try {
        const result = await this.world.executeAction(
          action.agentAddress,
          action.action, // Contract name (e.g., "Movement")
          'execute',     // Standard function name for actions
          action.params
        )
        results.push({ action, result, success: true })
      } catch (error) {
        console.error(`[Tick ${this.tickCount}] Action failed:`, error)
        results.push({ action, error, success: false })
      }
    }
    
    // TODO: Broadcast state update to connected clients
    
    return
  }
  
  /**
   * Get current tick count
   */
  getTickCount(): number {
    return this.tickCount
  }
  
  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.actionQueue.size()
  }
}
