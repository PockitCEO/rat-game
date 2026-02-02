import { WorldServer } from '../src/server/WorldServer.js'

async function main() {
  const server = new WorldServer({
    port: 3000,
    tickRate: 1000 // 1 tick per second
  })
  
  await server.start()
  
  console.log('═══════════════════════════════════════')
  console.log('  🐀 RAT GAME - WORLD SERVER')
  console.log('═══════════════════════════════════════')
  console.log('  Listening on: http://localhost:3000')
  console.log('  WebSocket: ws://localhost:3000')
  console.log('  Tick rate: 1000ms')
  console.log('═══════════════════════════════════════')
  console.log('')
  console.log('  POST /world/create           Create world')
  console.log('  POST /world/:id/action       Submit action')
  console.log('  GET  /world/:id/state        Get state')
  console.log('  POST /world/:id/destroy      Destroy world')
  console.log('═══════════════════════════════════════')
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[Server] Shutting down...')
    await server.stop()
    process.exit(0)
  })
}

main().catch(console.error)
