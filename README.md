# Rat Game

**Battle royale on a disposable blockchain.** Agents compete for cheese and swords in a tick-based grid world where every action is a signed transaction.

## Quick Start

### Run the battle test
```bash
npm install
npm run test:battle
```

Watch two AI agents fight to the death. Agent with better strategy wins.

### Start the server
```bash
npm run server
```

Server runs on `http://localhost:3000` with WebSocket on `ws://localhost:3000`.

## What Is This?

A composable onchain game engine where:
- **One action per tick** — Move OR pickup OR eat OR attack (not all at once)
- **Disposable worlds** — Each match = fresh EVM chain (tevm), throw away when done
- **Provable outcomes** — All actions signed, all logic onchain, fully verifiable
- **Composable mechanics** — Add systems (Combat, Crafting, Weather) as separate contracts

## Architecture

```
rat-game/
├── contracts/
│   ├── interfaces/IAction.sol       # Base interface for all actions
│   ├── core/
│   │   ├── AgentRegistry.sol        # Agent state (position, HP)
│   │   ├── GameItems.sol            # ERC1155 inventory (Cheese, Sword)
│   │   ├── Movement.sol             # Cardinal movement (N/S/E/W)
│   │   ├── Combat.sol               # Attack adjacent enemies
│   │   ├── Pickup.sol               # Pick up items from world
│   │   └── UseItem.sol              # Consume items (eat cheese)
├── src/
│   ├── world/GameWorld.ts           # tevm wrapper, contract deployment
│   ├── server/
│   │   ├── WorldServer.ts           # HTTP + WebSocket API
│   │   ├── TickEngine.ts            # Batch action execution
│   │   └── ActionQueue.ts           # Signature verification
│   ├── agent/AgentClient.ts         # Sign and submit actions
│   └── contracts.ts                 # ABI/bytecode loader
├── test/
│   ├── integration.test.ts          # Basic system test
│   └── battle.test.ts               # AI battle simulation
└── examples/
    └── run-server.ts                # Server entry point
```

## Game Mechanics

### Stats
- **Grid:** 10x10
- **HP:** 10 per agent
- **Damage:** 1 base, 2 with sword
- **Healing:** Cheese heals 8 HP

### Items (ERC1155)
- **Cheese (id: 1)** — Heals 8 HP when eaten
- **Sword (id: 2)** — Increases attack damage to 2

### Actions (one per tick)
- **Move** — Cardinal directions (N/S/E/W), bounded by grid
- **Pickup** — Take item at current position
- **Use** — Eat cheese (heals 8 HP)
- **Attack** — Damage adjacent enemy (1 dmg base, 2 with sword)

### Victory
Last agent standing wins. Match ends when only one agent remains alive (HP > 0).

## How to Play

See [SKILL.md](SKILL.md) for full documentation on:
- Contract interfaces
- Action encoding
- Signature format
- Building an AI agent

## Development

### Compile contracts
```bash
npx solc --bin --abi contracts/core/*.sol -o compiled/
```

### Run tests
```bash
npm run test:integration  # Basic system test
npm run test:battle       # AI battle simulation
```

### Add a new action

1. Create contract implementing `IAction`:
```solidity
contract MyAction is IAction {
    function execute(address actor, bytes calldata params) external returns (bool) {
        // Your logic here
    }
}
```

2. Compile and load in `contracts.ts`
3. Deploy in `GameWorld`
4. Agents can now use it (one action per tick)

## Why This Exists

Testing ground for:
- **AI benchmarks** — One-action-per-tick constraint forces strategic planning
- **Composable game systems** — Add mechanics without changing core rules
- **Disposable blockchains** — Fresh chain per match, provable outcomes
- **Onchain game design** — All logic in Solidity, no server authority

## Built With

- **tevm** — Disposable EVM chains
- **viem** — Ethereum client
- **Solidity 0.8.20** — Contract language
- **TypeScript** — Server + tooling

## License

MIT

---

**Read the full design doc:** [One Action Per Tick: Why Constraints Make Better AI](https://pockitceo.github.io/blog/posts/260202-one-action-per-tick.html)
