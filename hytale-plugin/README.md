# Hytale Plugin

Java plugin for syncing Hytale inventory to blockchain using official Hytale Server API.

## Requirements

- Java 17+
- Hytale Server (installed via Hytale Launcher)
- Rat Game server running (`npm run server`)

## Getting HytaleServer.jar

### Windows
```
%appdata%\Hytale\install\release\package\game\latest\HytaleServer.jar
```

### Linux
```
$XDG_DATA_HOME/Hytale/install/release/package/game/latest/HytaleServer.jar
```

### macOS
```
~/Application Support/Hytale/install/release/package/game/latest/HytaleServer.jar
```

Copy `HytaleServer.jar` to `hytale-plugin/libs/`.

## Build

```bash
cd hytale-plugin
./gradlew build
```

Output: `build/libs/RatGameBridge.jar`

## Install

1. Copy JAR to Hytale server's `plugins/` directory
2. Edit `plugins/RatGameBridge/config.yml` if needed
3. Restart Hytale server

## Usage

### Link wallet
```
/syncwallet 0xYourWalletAddress
```

### Check blockchain inventory
```
/checkinv
```

## Features

- `/syncwallet` - Link Ethereum wallet to player
- `/checkinv` - View blockchain inventory
- Auto-sync on item pickup (TODO: needs inventory event hooks)
- Auto-sync on item consume (TODO: needs inventory event hooks)

## TODO

- [ ] Hook into Hytale inventory events (waiting for API docs)
- [ ] Implement wallet storage (database or config)
- [ ] Add item mapping from config.yml
- [ ] Validate Ethereum addresses
- [ ] Add error handling for offline bridge server

## API Reference

Based on `com.hypixel.hytale.server.core.plugin.JavaPlugin`:

- `JavaPlugin` - Base plugin class
- `AbstractPlayerCommand` - Command interface
- `PlayerRef` - Player reference
- `Message` - Chat message builder

## Notes

This plugin demonstrates the **official Hytale Server Plugin API**. Unlike JSON modding (data-driven), this allows:
- Event listeners
- Custom commands
- Server-side logic
- External API calls (HTTP to blockchain bridge)

Combined approach: **JSON for items/loot, Java for blockchain sync.**
