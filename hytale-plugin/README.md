# Hytale Plugin

Java plugin scaffold for syncing Hytale inventory to blockchain.

## Build

```bash
cd hytale-plugin
mvn clean package
```

Output: `target/ratgamebridge-1.0.0.jar`

## Install

1. Copy JAR to `plugins/` folder
2. Edit `plugins/RatGameBridge/config.yml`
3. Restart server

## TODO

- [ ] Replace Bukkit/Spigot API with Hytale API when available
- [ ] Implement player wallet linking (store address → UUID mapping)
- [ ] Add JSON parsing for inventory sync
- [ ] Add item spawning logic
- [ ] Handle edge cases (inventory full, item not exists, etc.)

## Notes

This is a **Bukkit/Spigot scaffold** for testing. Hytale will have its own plugin API.

The core logic (HTTP calls to bridge API) will transfer directly.
