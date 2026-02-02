# Hytale Bridge

Sync Hytale inventory ↔ Rat Game blockchain (in-memory).

## Architecture

```
Hytale (JSON mods)
    ↓ Script hooks (Lua/JSON)
Rat Game Server (TypeScript + tevm)
    ↓
GameItems Contract (ERC1155)
```

**No mainnet, no gas, instant transactions.** Pure data-driven modding.

## How Hytale Modding Works

Hytale uses **JSON data files** in `%APPDATA%/Hytale/UserData/Mods/`:

```
YourMod/
├── manifest.json          # Mod metadata
├── Common/                # Client-side assets
└── Server/                # Server-side logic
    ├── Item/Items/        # Item definitions
    ├── Drops/             # Loot tables
    └── BarterShops/       # NPC trades
```

**Key insight:** Everything is JSON. No Java/C# plugins. Changes update in real-time.

## Bridge Integration Strategy

### Option 1: HTTP Polling (Simple)

Add a **custom item** that triggers HTTP calls when used:

```json
// Server/Item/Items/Special/Item_BlockchainSync.json
{
  "Name": "Blockchain Sync Crystal",
  "OnUse": {
    "Type": "CustomScript",
    "ScriptId": "blockchain_sync"
  }
}
```

Player uses crystal → Game calls external script → Syncs with bridge API.

**Limitation:** Hytale may not support HTTP in scripts (unclear from docs).

### Option 2: External Monitor (Practical)

Run a **file watcher** that monitors Hytale's save files:

```
Hytale Save Files (JSON)
    ↓ File watcher
Bridge Monitor (TypeScript)
    ↓ REST API
Rat Game Server
```

**How it works:**
1. Player picks up cheese in Hytale → Saved to player inventory JSON
2. File watcher detects change → Reads new inventory state
3. Monitor calls `/bridge/mint` → Mints ERC1155 onchain
4. On next sync, blockchain state → Updates Hytale save file

### Option 3: Custom Loot Table (Immediate)

**Easiest approach:** Make items obtainable via loot tables, track ownership offchain:

```json
// Server/Drops/Custom/Drop_BlockchainChest.json
{
  "Entries": [
    {
      "Item": "hytale:cheese",
      "Weight": 10,
      "Quantity": { "Min": 1, "Max": 1 }
    },
    {
      "Item": "hytale:void_scythe",
      "Weight": 1,
      "Quantity": { "Min": 1, "Max": 1 }
    }
  ]
}
```

When player opens chest → Record event externally → Mint NFT.

## Implementation

### 1. Hytale Mod Setup

Create mod at `%APPDATA%/Hytale/UserData/Mods/RatGameBridge/`:

**manifest.json:**
```json
{
  "Group": "PockitCEO",
  "Name": "Rat Game Bridge",
  "Version": "1.0",
  "Description": "Sync inventory to blockchain",
  "Authors": [{ "Name": "PockitCEO" }],
  "IncludesAssetPack": true
}
```

**Server/Item/Items/Food/Item_Cheese.json:**
```json
{
  "Name": "Blockchain Cheese",
  "Quality": "Rare",
  "ItemLevel": 10,
  "MaxStackSize": 64,
  "ConsumeTime": 1.0,
  "FoodValue": 8,
  "OnConsume": {
    "Effects": [
      {
        "Type": "Heal",
        "Amount": 8
      }
    ]
  }
}
```

### 2. File Watcher (TypeScript)

```typescript
import { watch } from 'fs'
import { readFile } from 'fs/promises'

const SAVE_PATH = '%APPDATA%/Hytale/UserData/Worlds/YourWorld/players/'

watch(SAVE_PATH, async (eventType, filename) => {
  if (eventType === 'change' && filename.endsWith('.json')) {
    const playerData = JSON.parse(await readFile(filename, 'utf-8'))
    
    // Check inventory for tracked items
    for (const item of playerData.inventory) {
      if (item.id === 'hytale:cheese') {
        // Mint on blockchain if not already owned
        await fetch('http://localhost:3000/bridge/mint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerAddress: playerData.walletAddress,
            itemId: 1, // Cheese
            amount: item.count
          })
        })
      }
    }
  }
})
```

### 3. Bidirectional Sync

**Blockchain → Hytale:**
```typescript
// Periodically sync blockchain inventory to Hytale save files
setInterval(async () => {
  const inventory = await fetch('http://localhost:3000/bridge/inventory/0x...')
  const items = await inventory.json()
  
  // Update Hytale save file with blockchain state
  // (Requires writing to player JSON)
}, 5000)
```

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

## Item Mapping

```json
// config.json
{
  "itemMapping": {
    "hytale:cheese": 1,
    "hytale:void_scythe": 2,
    "hytale:mithril_sword": 3
  }
}
```

## Development Workflow

1. **Start Rat Game server:**
   ```bash
   cd rat-game && npm run server
   ```

2. **Install Hytale mod:**
   - Copy `RatGameBridge/` to `%APPDATA%/Hytale/UserData/Mods/`
   - Restart Hytale or create new world with mod enabled

3. **Run file watcher:**
   ```bash
   npm run watch:hytale
   ```

4. **Test:**
   - Pick up cheese in Hytale
   - Check blockchain: `curl http://localhost:3000/bridge/inventory/0x...`
   - Eat cheese
   - Verify burned onchain

## Benefits

✅ **No Java plugins** — Pure JSON data modding
✅ **Real-time updates** — Changes apply instantly in-game
✅ **Provable inventory** — All items as ERC1155 NFTs
✅ **Cross-server portable** — Take items between Hytale servers
✅ **Anti-duping** — Blockchain enforces uniqueness

## Limitations

⚠️ **File watching latency** — 1-5 second delay for sync
⚠️ **No native HTTP** — Hytale may not support HTTP in scripts (need file watcher)
⚠️ **Save file format** — Need to reverse-engineer player JSON schema

## Next Steps

1. Research Hytale save file format (player inventory JSON)
2. Build file watcher that monitors `%APPDATA%/Hytale/UserData/Worlds/*/players/`
3. Map Hytale item IDs → ERC1155 token IDs
4. Implement bidirectional sync (blockchain ↔ save files)
5. Test with real Hytale instance

---

**Current status:** Hytale modding is JSON-based. Bridge needs file watcher, not Java plugin.

