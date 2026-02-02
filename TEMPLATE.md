# Rat Game Template Guide

This repo is designed as a **template for onchain game engines**. Fork it, swap the contracts, ship a new game.

## Architecture Overview

```
rat-game/
├── contracts/           # Solidity game logic
│   ├── interfaces/      # Universal interfaces (IAction.sol)
│   └── core/            # Game-specific contracts
├── src/
│   ├── world/           # TEVM wrapper (stays same)
│   ├── server/          # HTTP API (stays same)
│   └── agent/           # AI client (customize)
└── test/                # Integration + battle tests
```

**Core principle:** Contracts define rules, TypeScript engine executes them.

## What Stays the Same (Engine)

These files are **universal** — reuse across all games:

### Contracts
- `contracts/interfaces/IAction.sol` — Standard action interface

### TypeScript Engine
- `src/world/GameWorld.ts` — TEVM deployment + contract calls
- `src/server/WorldServer.ts` — HTTP API (submit actions, query state)
- `src/server/TickEngine.ts` — Turn-based execution loop
- `src/server/ActionQueue.ts` — Action buffering

**Don't modify these unless you need fundamentally different engine behavior.**

## What Changes Per Game

### 1. Contracts (`contracts/core/`)

**Rat Game has:**
- `AgentRegistry.sol` — HP, position, alive status
- `Movement.sol` — Grid movement validation
- `Combat.sol` — Adjacent attack (2 dmg)
- `Pickup.sol` — Item spawning + collection
- `UseItem.sol` — Consume cheese (heal 8 HP)
- `GameItems.sol` — ERC1155 inventory

**Chess game would have:**
- `ChessRegistry.sol` — Player color, king position, checkmate
- `ChessMovement.sol` — Validate legal moves (knight L-shape, bishop diagonal, etc.)
- `ChessCombat.sol` — Capture piece (remove from board)
- `ChessPieces.sol` — ERC1155 with 6 piece types

**Key pattern:** Each contract implements `IAction.execute()` or exposes game-specific methods.

### 2. Game Configuration

**Current hardcoded values (change these):**

In `test/battle.test.ts`:
```typescript
const world = new GameWorld({
  worldId: 'battle-' + Date.now(),
  gridSize: 10,  // ← Change for chess (8x8)
  systems: ['movement', 'inventory', 'combat', 'pickup', 'useitem']
})
```

In contracts:
- Grid size: `Movement.sol` constructor param
- Starting HP: `AgentRegistry.sol` (`hp = 10`)
- Item effects: `UseItem.sol` (cheese heals 8)
- Damage: `Combat.sol` (sword deals 2)

**TODO:** Extract these to a config file (`game-config.json`).

### 3. AI Logic (`test/battle.test.ts`)

**Rat Game AI decision tree:**
```typescript
if (myHp <= 5 && hasCheese) return { action: 'UseItem', params: [1] }
if (cheeseHere) return { action: 'Pickup', params: [1] }
if (isAdjacent && hasSword) return { action: 'Combat', params: [opponent] }
// ... move toward opponent
```

**Chess AI would:**
```typescript
const bestMove = minimax(board, depth)
return { action: 'ChessMovement', params: [from, to] }
```

### 4. Item Types (`GameItems.sol`)

**Rat Game:**
- ID 1: Cheese (heal)
- ID 2: Sword (weapon)
- ID 3: Shield (defense)

**Chess:**
- ID 1: Pawn
- ID 2: Knight
- ID 3: Bishop
- ID 4: Rook
- ID 5: Queen
- ID 6: King

## Fork Workflow

### Step 1: Clone Template

```bash
git clone https://github.com/PockitCEO/rat-game.git my-game
cd my-game
rm -rf .git
git init
```

### Step 2: Rename Project

```bash
# package.json
sed -i '' 's/rat-game/my-game/g' package.json

# README.md
echo "# My Game" > README.md
```

### Step 3: Replace Contracts

Delete rat-specific contracts:
```bash
rm contracts/core/*.sol
```

Write your game contracts implementing `IAction`:
```solidity
// contracts/core/MyGameAction.sol
pragma solidity ^0.8.19;

import "../interfaces/IAction.sol";

contract MyGameAction is IAction {
    function execute(address agent, bytes calldata params) external override {
        // Your game logic
    }
}
```

### Step 4: Update Deployment

In `test/integration.test.ts` or `test/battle.test.ts`:

```typescript
// Deploy your contracts
const myActionAddr = await world.deployContract(
  'MyGameAction',
  (MyGameAction.bytecode + encodeAbiParameters(
    [{ type: 'address' }],
    [registryAddr]
  ).slice(2)) as Hex,
  MyGameAction.abi
)
```

### Step 5: Update AI

Rewrite `simpleAI()` function with your game logic.

### Step 6: Test

```bash
npm test                # Integration tests
npm run test:battle     # Battle simulation
npm run server          # HTTP API
```

### Step 7: Deploy (Optional)

When ready for production:

1. **Add deployment script** (`scripts/Deploy.s.sol`):
   ```solidity
   contract Deploy is Script {
       function run() external {
           vm.startBroadcast();
           // Deploy to Sepolia, Base, etc.
           vm.stopBroadcast();
       }
   }
   ```

2. **Deploy to testnet:**
   ```bash
   forge script scripts/Deploy.s.sol --rpc-url $SEPOLIA_RPC --broadcast
   ```

3. **Update WorldServer.ts** to use deployed addresses instead of TEVM.

## Extension Points

### Add New Action Types

1. Create contract implementing `IAction.sol`
2. Deploy in `GameWorld`
3. Add to AI decision tree
4. Test in battle simulation

### Add New Item Types

1. Mint new ID in `GameItems.sol`
2. Add spawn logic in `Pickup.sol`
3. Add consumption logic in `UseItem.sol`
4. Update AI to recognize new item

### Add Multiplayer

Current: 1v1 battle royale  
Extension: N-player free-for-all

```typescript
const agents = [agent1, agent2, agent3, agent4]
for (const agent of agents) {
  const action = await AI(world, agent, agents.filter(a => a !== agent))
  await world.executeAction(agent, action.contract, action.method, action.params)
}
```

### Add Tournament Mode

```typescript
const bracket = generateBracket(agents)
for (const match of bracket) {
  const winner = await battle(match[0], match[1])
  bracket.advance(winner)
}
```

## Example: Chess Game

**What changes:**

| Rat Game | Chess Game |
|----------|-----------|
| 10x10 grid | 8x8 grid |
| HP (10) | King alive (bool) |
| Movement (adjacent) | Piece-specific moves |
| Combat (sword dmg) | Capture (remove piece) |
| Items (cheese/sword) | Pieces (pawn/knight/etc) |
| AI (pathfinding) | AI (minimax) |

**Contracts to write:**
1. `ChessRegistry.sol` — Players, piece ownership, checkmate
2. `ChessMovement.sol` — Legal move validation per piece type
3. `ChessPieces.sol` — ERC1155 with 6 piece types
4. `ChessCapture.sol` — Remove opponent piece, check for check/checkmate

**AI approach:**
- Minimax with alpha-beta pruning
- Evaluate board state (material, position, king safety)
- Return best move

**Everything else (GameWorld, WorldServer, TickEngine) stays the same.**

## Design Philosophy

**Minimal code:** Rat game contracts are ~200 lines total. Keep it that way.

**One action per tick:** Forces strategy over APM. No batching, no rollback.

**Disposable worlds:** Each match = new TEVM instance. Throw away after battle.

**ERC1155 inventory:** Composable items, cross-game compatibility.

**TEVM-first:** Instant finality, no gas fees, zero DevOps. Deploy to L2 later if needed.

## Resources

- **Blog post:** [One Action Per Tick](https://pockitceo.github.io/blog/posts/260202-one-action-per-tick.html) (AI benchmark)
- **SKILL.md:** Agent development guide
- **README.md:** Quickstart
- **Contracts:** Full Solidity source in `contracts/`

## Contributing

Forks welcome! If you build something cool:
1. Tag @pockitmilady on Twitter
2. Open PR with link to your fork
3. We'll showcase it

---

**Built by Pockit Game Corp. Radical transparency. Code public forever.**
