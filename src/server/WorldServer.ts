import express, { type Request, type Response } from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { GameWorld, type WorldConfig } from '../world/GameWorld.js'
import { TickEngine, type TickEngineConfig } from './TickEngine.js'
import { type SignedAction } from './ActionQueue.js'
import { type Address } from 'viem'

export interface ServerConfig {
  port: number
  tickRate: number
}

/**
 * WorldServer - HTTP + WebSocket server for game world
 */
export class WorldServer {
  private app: express.Application
  private httpServer: ReturnType<typeof createServer>
  private wss: WebSocketServer
  private world: GameWorld | null = null
  private tickEngine: TickEngine | null = null
  private connectedClients: Map<string, WebSocket> = new Map()
  
  constructor(private config: ServerConfig) {
    this.app = express()
    this.httpServer = createServer(this.app)
    this.wss = new WebSocketServer({ server: this.httpServer })
    
    this.setupRoutes()
    this.setupWebSocket()
  }
  
  private setupRoutes(): void {
    this.app.use(express.json())
    
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', worldId: this.world?.id })
    })
    
    // Create world
    this.app.post('/world/create', async (req: Request, res: Response) => {
      try {
        const worldConfig: WorldConfig = req.body
        
        this.world = new GameWorld(worldConfig)
        this.tickEngine = new TickEngine(this.world, {
          tickRate: this.config.tickRate
        })
        
        // TODO: Deploy contracts based on worldConfig.systems
        
        this.tickEngine.start()
        
        res.json({
          worldId: this.world.id,
          config: worldConfig,
          tickRate: this.config.tickRate
        })
      } catch (error) {
        res.status(500).json({ error: (error as Error).message })
      }
    })
    
    // Submit signed action
    this.app.post('/world/:worldId/action', async (req: Request, res: Response) => {
      try {
        if (!this.world || !this.tickEngine) {
          return res.status(404).json({ error: 'No world created' })
        }
        
        const { worldId } = req.params
        if (worldId !== this.world.id) {
          return res.status(404).json({ error: 'World not found' })
        }
        
        const signedAction: SignedAction = req.body
        
        // Route action to correct contract
        // For now, assume action name = contract name
        // TODO: Better action routing system
        
        await this.tickEngine.queueAction(signedAction)
        
        res.json({
          queued: true,
          queueSize: this.tickEngine.getQueueSize(),
          nextTick: this.tickEngine.getTickCount() + 1
        })
      } catch (error) {
        res.status(400).json({ error: (error as Error).message })
      }
    })
    
    // Get world state
    this.app.get('/world/:worldId/state', async (req: Request, res: Response) => {
      try {
        if (!this.world) {
          return res.status(404).json({ error: 'No world created' })
        }
        
        const { worldId } = req.params
        if (worldId !== this.world.id) {
          return res.status(404).json({ error: 'World not found' })
        }
        
        // TODO: Serialize world state from contracts
        const state = {
          worldId: this.world.id,
          tickCount: this.tickEngine?.getTickCount(),
          contracts: this.world.getDeployedContracts().map(c => ({
            name: c.name,
            address: c.address
          }))
        }
        
        res.json(state)
      } catch (error) {
        res.status(500).json({ error: (error as Error).message })
      }
    })
    
    // Destroy world
    this.app.post('/world/:worldId/destroy', (req: Request, res: Response) => {
      try {
        if (!this.world) {
          return res.status(404).json({ error: 'No world created' })
        }
        
        this.tickEngine?.stop()
        this.world = null
        this.tickEngine = null
        
        // Close all WebSocket connections
        this.connectedClients.forEach(ws => ws.close())
        this.connectedClients.clear()
        
        res.json({ destroyed: true })
      } catch (error) {
        res.status(500).json({ error: (error as Error).message })
      }
    })
  }
  
  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = Math.random().toString(36).substring(7)
      this.connectedClients.set(clientId, ws)
      
      console.log(`[WS] Client ${clientId} connected`)
      
      ws.on('close', () => {
        this.connectedClients.delete(clientId)
        console.log(`[WS] Client ${clientId} disconnected`)
      })
      
      ws.on('error', (error) => {
        console.error(`[WS] Client ${clientId} error:`, error)
      })
      
      // Send initial state
      if (this.world) {
        ws.send(JSON.stringify({
          type: 'init',
          worldId: this.world.id,
          tickCount: this.tickEngine?.getTickCount()
        }))
      }
    })
  }
  
  /**
   * Broadcast state update to all connected clients
   */
  broadcast(message: any): void {
    const payload = JSON.stringify(message)
    this.connectedClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      }
    })
  }
  
  /**
   * Start the server
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.config.port, () => {
        console.log(`[WorldServer] Listening on port ${this.config.port}`)
        resolve()
      })
    })
  }
  
  /**
   * Stop the server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.tickEngine?.stop()
      this.wss.close(() => {
        this.httpServer.close(() => {
          console.log('[WorldServer] Stopped')
          resolve()
        })
      })
    })
  }
}
