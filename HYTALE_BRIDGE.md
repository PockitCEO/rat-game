# Hytale Bridge Plugin

Sync Hytale inventory ↔ Rat Game blockchain (in-memory).

## Architecture

```
Hytale Server (Java)
    ↓ REST API
Rat Game Server (TypeScript + tevm)
    ↓
GameItems Contract (ERC1155)
```

**No mainnet, no gas, instant transactions.** Just proving the pattern works.

## Setup

### 1. Start Rat Game Server

```bash
cd rat-game
npm run server
```

Server runs on `http://localhost:3000`.

### 2. Install Hytale Plugin

```
plugins/
└── RatGameBridge.jar
```

Configure in `plugins/RatGameBridge/config.yml`:
```yaml
bridge-url: http://localhost:3000
item-mapping:
  hytale:cheese: 1
  hytale:iron_sword: 2
```

### 3. Player joins

Plugin auto-syncs inventory from blockchain to Hytale.

## API Endpoints

### Mint Item (Player Picks Up)

**POST /bridge/mint**
```json
{
  "playerAddress": "0x...",
  "itemId": 1,
  "amount": 1
}
```

Response:
```json
{
  "success": true,
  "txHash": "0x..."
}
```

### Burn Item (Player Consumes)

**POST /bridge/burn**
```json
{
  "playerAddress": "0x...",
  "itemId": 1,
  "amount": 1
}
```

### Get Inventory (On Join)

**GET /bridge/inventory/:address**

Response:
```json
{
  "items": [
    { "id": 1, "balance": 3, "name": "Cheese" },
    { "id": 2, "balance": 1, "name": "Sword" }
  ]
}
```

## Event Flow

### Player Picks Up Cheese

1. Hytale fires `PlayerPickupItemEvent`
2. Plugin calls `POST /bridge/mint` (cheese, 1)
3. Server mints ERC1155 onchain (instant, in-memory)
4. Player keeps item in Hytale inventory

### Player Eats Cheese

1. Hytale fires `PlayerItemConsumeEvent`
2. Plugin calls `POST /bridge/burn` (cheese, 1)
3. Server burns ERC1155 onchain
4. Item removed from blockchain inventory

### Player Joins Server

1. Hytale fires `PlayerJoinEvent`
2. Plugin calls `GET /bridge/inventory/{address}`
3. Server returns onchain items
4. Plugin spawns items in Hytale inventory

## Item Mapping

```yaml
# config.yml
item-mapping:
  hytale:cheese: 1                # Cheese (heals)
  hytale:iron_sword: 2            # Sword (combat)
  hytale:golden_apple: 3          # Add more items
  hytale:diamond: 4
```

Maps Hytale item IDs → ERC1155 token IDs.

## Development

### Test Mint/Burn

```bash
# Mint cheese for player
curl -X POST http://localhost:3000/bridge/mint \
  -H "Content-Type: application/json" \
  -d '{"playerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","itemId":1,"amount":5}'

# Check inventory
curl http://localhost:3000/bridge/inventory/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# Burn cheese
curl -X POST http://localhost:3000/bridge/burn \
  -H "Content-Type: application/json" \
  -d '{"playerAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","itemId":1,"amount":1}'
```

## Plugin Code (Java)

See `hytale-plugin/` for full implementation:
- Event listeners (pickup, consume, join)
- REST client (calls bridge API)
- Item mapping (Hytale ↔ blockchain)
- Inventory sync on join

## Benefits

✅ **Instant transactions** — In-memory chain, no latency
✅ **Provable inventory** — All items as ERC1155 NFTs
✅ **Cross-server** — Take items to other Hytale servers using same bridge
✅ **Anti-duping** — Blockchain enforces uniqueness
✅ **Verifiable** — Query onchain inventory anytime

## Next Steps

1. Add more items to mapping
2. Implement trading (transfer between players)
3. Add crafting (burn multiple items, mint new one)
4. Build admin panel (spawn items, check player inventories)

---

**No mainnet, no gas, just proving the pattern works.**
