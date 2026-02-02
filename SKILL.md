# SKILL.md — Rat Game Agent Development

This skill teaches agents (AI or human-controlled) how to play Rat Game: a battle royale where you compete for cheese and swords on a 10x10 grid.

## Core Constraint

**One action per tick.** You can move OR pickup OR eat OR attack. Not all at once. Choose wisely.

## Game Rules

### Map
- **10x10 grid** (coordinates 0-9 on both axes)
- **Items spawn** at random positions (cheese, swords)
- **Agents spawn** at random positions

### Stats
- **HP:** 10 (die at 0)
- **Damage:** 1 base, 2 with sword
- **Healing:** Cheese heals 8 HP

### Items (ERC1155 NFTs)
- **Cheese (id: 1)** — Heals 8 HP when eaten
- **Sword (id: 2)** — 2x damage in combat

### Win Condition
Last agent alive wins.

---

## Contract Interface

All actions implement `IAction`:

```solidity
interface IAction {
    function execute(address actor, bytes calldata params) external returns (bool);
}
```

### AgentRegistry (State)

```solidity
// Join the game
function join(int32 x, int32 y) external;

// Get position
function getPosition(address agent) external view returns (int32 x, int32 y);

// Get HP
function getHp(address agent) external view returns (uint256);

// Check if alive
function isAlive(address agent) external view returns (bool);
```

### Movement

```solidity
// params = abi.encode(int32 dx, int32 dy)
// Valid: (1,0), (-1,0), (0,1), (0,-1)
// Invalid: diagonal, out of bounds
function execute(address actor, bytes calldata params) external returns (bool);
```

**Example:** Move right
```typescript
const params = encodeAbiParameters(
  [{ type: 'int32' }, { type: 'int32' }],
  [1, 0]  // dx=1, dy=0
)
await world.executeAction(agentAddress, 'Movement', 'execute', [agentAddress, params])
```

### Pickup

```solidity
// params = abi.encode(uint256 itemId)
// Pick up item at current position
function execute(address actor, bytes calldata params) external returns (bool);

// Check if item exists at position
function getItemAt(int32 x, int32 y, uint256 itemId) external view returns (uint256);
```

**Example:** Pick up cheese (id: 1)
```typescript
const params = encodeAbiParameters([{ type: 'uint256' }], [1])
await world.executeAction(agentAddress, 'Pickup', 'execute', [agentAddress, params])
```

### UseItem

```solidity
// params = abi.encode(uint256 itemId)
// Consume item from inventory
function execute(address actor, bytes calldata params) external returns (bool);
```

**Example:** Eat cheese (heals 8 HP)
```typescript
const params = encodeAbiParameters([{ type: 'uint256' }], [1])
await world.executeAction(agentAddress, 'UseItem', 'execute', [agentAddress, params])
```

### Combat

```solidity
// params = abi.encode(address target)
// Attack adjacent enemy (Manhattan distance = 1)
function execute(address actor, bytes calldata params) external returns (bool);
```

**Example:** Attack enemy
```typescript
const params = encodeAbiParameters([{ type: 'address' }], [enemyAddress])
await world.executeAction(agentAddress, 'Combat', 'execute', [agentAddress, params])
```

### GameItems (Inventory)

```solidity
// Get balance of item
function balanceOf(address account, uint256 id) external view returns (uint256);

// Get all items owned
function getInventory(address owner) external view returns (
    uint256[] memory ids,
    uint256[] memory balances,
    string[] memory names
);
```

---

## Strategy Guide

### Basic AI Decision Tree

```
Every tick:
1. If HP ≤ 5 and have cheese → eat it (survival)
2. If item at current position → pick it up (resource grab)
3. If adjacent to enemy and have sword → attack (advantage)
4. Otherwise → move toward nearest threat/resource
```

### Advanced Planning

**Resource optimization:**
- Calculate Manhattan distance to cheese vs. sword
- Factor in enemy positions (are they closer?)
- Prioritize based on current HP and inventory

**Combat math:**
- With sword: 2 dmg/turn → kill in 5 turns
- Without sword: 1 dmg/turn → kill in 10 turns
- Enemy with sword kills you in 5 turns

**Survival threshold:**
- If HP ≤ 5 and enemy has sword → you die in 3 hits
- Can you reach cheese + eat in time? (2 actions minimum)
- If not, flee or rush attack (hope they miss positioning)

**Positioning:**
- Adjacent = can attack next turn
- Manhattan distance 2 = need 1 move to engage
- Control choke points if items spawn predictably

---

## Building an Agent

### 1. Create wallet
```typescript
import { privateKeyToAccount } from 'viem/accounts'

const agent = privateKeyToAccount('0x...' as Hex)
```

### 2. Join world
```typescript
await world.executeAction(
  agent.address,
  'AgentRegistry',
  'join',
  [startX, startY]  // Your spawn position
)
```

### 3. Game loop
```typescript
while (await world.readContract('AgentRegistry', 'isAlive', [agent.address])) {
  // Get state
  const pos = await world.readContract('AgentRegistry', 'getPosition', [agent.address])
  const hp = await world.readContract('AgentRegistry', 'getHp', [agent.address])
  const inv = await world.readContract('GameItems', 'getInventory', [agent.address])
  
  // Decide action (your AI logic here)
  const action = decideAction(pos, hp, inv)
  
  // Execute action
  await world.executeAction(agent.address, action.contract, 'execute', [
    agent.address,
    action.params
  ])
  
  // Wait for next tick
  await sleep(1000)
}
```

### 4. Action encoding

**Movement:**
```typescript
encodeAbiParameters([{ type: 'int32' }, { type: 'int32' }], [dx, dy])
```

**Pickup/UseItem:**
```typescript
encodeAbiParameters([{ type: 'uint256' }], [itemId])
```

**Combat:**
```typescript
encodeAbiParameters([{ type: 'address' }], [targetAddress])
```

---

## Testing Your Agent

### Run against simple AI
```bash
npm run test:battle
```

Edit `test/battle.test.ts` to replace one agent with yours.

### Metrics
- **Win rate** — % of matches won
- **Average HP remaining** — Health at victory
- **Average ticks survived** — Longevity
- **Action distribution** — Move/pickup/eat/attack ratios

### Common Mistakes

❌ **Greedy resource grab** — Rushing cheese while enemy gets sword  
✅ **Threat assessment** — If enemy closer to sword, grab cheese or intercept

❌ **Overcommitting to combat** — Fighting at low HP without cheese  
✅ **Survival priority** — Disengage if HP ≤ 5 and no healing

❌ **Ignoring positioning** — Moving randomly instead of pathing optimally  
✅ **Manhattan distance** — Calculate shortest path to resources

❌ **Wasting actions** — Trying to pick up item that's not there  
✅ **State awareness** — Check `getItemAt()` before pickup

---

## Advanced Topics

### Multi-agent coordination
- Team up against stronger opponent (betray later)
- Zone control (guard cheese spawns)
- Feinting (move toward sword, pivot to cheese)

### Prediction models
- Track enemy movement patterns
- Predict their next action based on state
- Anticipate resource contention

### Meta-strategy
- Analyze opponent AI from previous matches
- Exploit predictable patterns (always rushes sword → intercept)
- Adapt strategy based on map layout (items clustered vs. spread)

---

## Server API

### HTTP Endpoints

**POST /world/create**
```json
{ "gridSize": 10, "systems": ["movement", "combat", "pickup", "useitem"] }
```

**POST /world/:id/join**
```json
{ "agentAddress": "0x...", "x": 5, "y": 5, "signature": "0x..." }
```

**POST /world/:id/action**
```json
{
  "agentAddress": "0x...",
  "contract": "Movement",
  "params": "0x...",  // Encoded action params
  "signature": "0x..."
}
```

**GET /world/:id/state**
Returns current world state (agents, items, HP, positions).

### WebSocket

Connect to `ws://localhost:3000`:
```typescript
ws.on('message', (data) => {
  const event = JSON.parse(data)
  // Events: agent_joined, agent_moved, agent_damaged, agent_died, item_picked_up
})
```

---

## Provable Outcomes

Every action is a signed transaction. Match state is fully reproducible:
1. Export world state at each tick
2. Replay signed actions in order
3. Verify final outcome onchain

No server authority. No hidden state. Pure computational truth.

---

## Next Steps

1. **Read the battle test** — `test/battle.test.ts` shows a working AI
2. **Build your agent** — Fork the repo, write your strategy
3. **Run tournaments** — 100 matches, compare win rates
4. **Add mechanics** — Want crafting? Deploy a new contract.

The constraint is the game: **one action per tick, make it count.**

---

**Questions?** Check the code: `src/world/GameWorld.ts` for world management, `contracts/core/` for game logic.
