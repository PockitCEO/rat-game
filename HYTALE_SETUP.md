# Hytale Server Setup Guide

Complete guide to setting up and running a Hytale server, based on official documentation and hands-on testing.

## Prerequisites

- **Java 25** (OpenJDK Temurin recommended)
- **4GB RAM minimum** (scales with view distance)
- **UDP port 5520** open on firewall
- **Hytale game installed** (to extract server files)

## Installation

### 1. Install Java 25

**macOS:**
```bash
# Download Adoptium Temurin 25
curl -L https://api.adoptium.net/v3/binary/latest/25/ga/mac/aarch64/jdk/hotspot/normal/eclipse -o temurin25.pkg

# Install
open temurin25.pkg
# Or: sudo installer -pkg temurin25.pkg -target /

# Verify
java -version
# Should show: openjdk version "25.0.1"
```

**Linux:**
```bash
wget https://api.adoptium.net/v3/binary/latest/25/ga/linux/x64/jdk/hotspot/normal/eclipse -O temurin25.tar.gz
tar -xzf temurin25.tar.gz
sudo mv jdk-25.0.1+8 /opt/jdk-25
export PATH=/opt/jdk-25/bin:$PATH
```

**Windows:**
Download from: https://adoptium.net/temurin/releases/?version=25

### 2. Extract Hytale Server Files

**From installed game:**

**macOS:**
```bash
# Server files location
cd ~/Library/Application\ Support/Hytale/install/release/package/game/latest/

# Copy to server directory
mkdir -p ~/hytale-server
cp HytaleServer.jar ~/hytale-server/
cp HytaleServer.aot ~/hytale-server/
cp Assets.zip ~/hytale-server/
```

**Windows:**
```powershell
cd %APPDATA%\Hytale\install\release\package\game\latest\
mkdir C:\hytale-server
copy HytaleServer.jar C:\hytale-server\
copy HytaleServer.aot C:\hytale-server\
copy Assets.zip C:\hytale-server\
```

**Linux:**
```bash
cd ~/.local/share/Hytale/install/release/package/game/latest/
mkdir -p ~/hytale-server
cp HytaleServer.jar ~/hytale-server/
cp HytaleServer.aot ~/hytale-server/
cp Assets.zip ~/hytale-server/
```

### 3. First Boot

```bash
cd ~/hytale-server
java -XX:AOTCache=HytaleServer.aot -jar HytaleServer.jar --assets Assets.zip
```

**Expected output:**
```
[INFO] Hytale Server Booted! [Multiplayer] took 3sec 150ms
[WARN] No server tokens configured. Use /auth login to authenticate.
```

### 4. Authentication

**Device flow (easiest):**

In server console, run:
```
/auth login device
```

Visit the displayed URL and enter the code. Server will authenticate with your Hytale account.

**Token-based (for headless):**

1. Get token from Hytale launcher
2. Set environment variable:
   ```bash
   export HYTALE_SERVER_TOKEN="your-token-here"
   ```
3. Or pass via CLI:
   ```bash
   java -jar HytaleServer.jar --token "your-token-here"
   ```

**License limits:** 100 servers per Hytale account.

## Server Configuration

### File Structure

```
hytale-server/
├── HytaleServer.jar         # Main server executable
├── HytaleServer.aot          # AOT cache (performance boost)
├── Assets.zip                # Game assets (2.3GB)
├── config.json               # Server config (auto-generated)
├── mods/                     # Plugins go here
├── universe/                 # World data
│   └── default/
│       ├── chunks/
│       └── players/
└── logs/
```

### config.json

Auto-generated on first run:

```json
{
  "server": {
    "name": "My Hytale Server",
    "port": 5520,
    "maxPlayers": 10,
    "viewDistance": 8,
    "gameMode": "survival"
  },
  "authentication": {
    "mode": "AUTHENTICATED"
  },
  "world": {
    "generator": "Default",
    "seed": 1770033720288
  }
}
```

### Important Settings

- **port**: UDP (not TCP!) — Default 5520
- **authentication**: `AUTHENTICATED` (requires login), `OFFLINE` (no auth, dev only)
- **viewDistance**: Higher = more RAM (8 chunks = ~4GB)
- **seed**: World generation seed (leave blank for random)

## Network Configuration

### Firewall Rules

**Allow UDP port 5520:**

**macOS:**
```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add ~/hytale-server/HytaleServer.jar
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock ~/hytale-server/HytaleServer.jar
```

**Linux (ufw):**
```bash
sudo ufw allow 5520/udp
```

**Windows:**
```powershell
New-NetFirewallRule -DisplayName "Hytale Server" -Direction Inbound -Protocol UDP -LocalPort 5520 -Action Allow
```

### Router Port Forwarding

If hosting publicly:
1. Forward UDP port 5520 → Your server's LAN IP
2. Find your public IP: `curl ifconfig.me`
3. Share: `your-public-ip:5520`

## Plugins

### Plugin Structure

```
mods/
└── YourPlugin/
    ├── manifest.json       # Plugin metadata
    └── YourPlugin.jar      # (Optional) Java code
```

### Example: JSON-Only Plugin

**manifest.json:**
```json
{
  "Group": "YourName",
  "Name": "Custom Items",
  "Version": "1.0",
  "Description": "Adds custom items",
  "Authors": [{ "Name": "You" }],
  "IncludesAssetPack": true
}
```

**Server/Item/Items/Custom/Item_MagicSword.json:**
```json
{
  "Name": "Magic Sword",
  "Quality": "Legendary",
  "ItemLevel": 50,
  "Damage": 100,
  "Effects": [
    {
      "Type": "Fire",
      "Duration": 5.0
    }
  ]
}
```

Plugin updates apply **immediately** without restart!

### Recommended Plugins

- **Nitrado:WebServer** — HTTP API for server control
  - GitHub: https://github.com/nitrado/hytale-plugin-webserver
- **Nitrado:Query** — Server status queries
  - GitHub: https://github.com/nitrado/hytale-plugin-query
- **ApexHosting:PrometheusExporter** — Metrics monitoring
  - GitHub: https://github.com/apexhosting/hytale-plugin-prometheus

## Maven Repository

For Java plugin development:

```xml
<repository>
  <id>hytale-release</id>
  <url>https://maven.hytale.com/release</url>
</repository>

<dependency>
  <groupId>com.hypixel.hytale</groupId>
  <artifactId>Server</artifactId>
  <version>2026.01.28-87d03be09</version>
  <scope>provided</scope>
</dependency>
```

Latest version: https://maven.hytale.com/release/com/hypixel/hytale/Server/maven-metadata.xml

## Multiserver Architecture

Hytale supports **server clusters** with seamless player transfer:

### Server Redirect

```java
// In your plugin
PlayerRef player = ...;
player.referToServer("lobby", "play.example.com:5520");
```

**Player experience:**
1. Player on Server A
2. Server A redirects → Server B
3. Client reconnects to Server B automatically
4. No rejoin required

### Fallback Servers

```json
// config.json
{
  "fallback": {
    "enabled": true,
    "servers": [
      "backup1.example.com:5520",
      "backup2.example.com:5520"
    ]
  }
}
```

If primary crashes, clients auto-reconnect to fallback.

## Protocol Details

- **Transport:** QUIC over UDP (not TCP)
- **Port:** 5520 (configurable)
- **Packets:** Available in `com.hypixel.hytale.protocol.packets`
- **Hash verification:** Client/server protocol must match exactly

**Why QUIC?**
- Faster than TCP (no handshake overhead)
- Built-in multiplexing (no head-of-line blocking)
- Connection migration (survives IP changes)

## Development Tips

### Disable Sentry (Dev Only)

```bash
java -jar HytaleServer.jar --disable-sentry
```

Prevents crash reports during testing.

### Enable Verbose Logging

```bash
java -Xlog:aot -jar HytaleServer.jar
```

Shows AOT cache warnings in detail.

### Hot Reload Assets

Changes to JSON files in `mods/` apply **immediately** without restart. Perfect for rapid iteration.

### Access Server Console

Send commands via stdin:
```bash
echo "/time set day" | java -jar HytaleServer.jar
```

Or use Nitrado:WebServer plugin for HTTP API.

## Troubleshooting

### "No server tokens configured"

Run `/auth login device` in console or set `HYTALE_SERVER_TOKEN` env var.

### "Unable to map shared spaces" (AOT warning)

Non-critical. HytaleServer.aot timestamp mismatch. Server still works fine.

### "Restricted method warnings" (Java 25)

Expected. Native access warnings from Netty QUIC. Add `--enable-native-access=ALL-UNNAMED` to silence:
```bash
java --enable-native-access=ALL-UNNAMED -jar HytaleServer.jar
```

### Port 5520 already in use

Another Hytale server running. Kill it:
```bash
lsof -ti:5520 | xargs kill -9
```

Or change port in config.json.

### Client can't connect

1. Check firewall (UDP, not TCP!)
2. Verify server is listening: `netstat -an | grep 5520`
3. Test locally first: Connect to `localhost:5520`
4. Check authentication mode (must match client)

## Performance Tuning

### JVM Flags (Production)

```bash
java -Xms4G -Xmx4G \
     -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=50 \
     -XX:AOTCache=HytaleServer.aot \
     -jar HytaleServer.jar
```

- `-Xms4G -Xmx4G` — 4GB heap (adjust based on players)
- `-XX:+UseG1GC` — G1 garbage collector (low latency)
- `-XX:MaxGCPauseMillis=50` — Target 50ms GC pauses

### View Distance

Lower view distance = less RAM:
- 8 chunks: ~4GB RAM (default)
- 12 chunks: ~6GB RAM
- 16 chunks: ~8GB RAM

### Asset Caching

First boot loads all assets (~30k items). Subsequent boots use AOT cache:
- First boot: ~3.5 seconds
- With cache: ~1.5 seconds

## Official Resources

- **Server Manual:** https://support.hytale.com/hc/en-us/articles/45326769420827-Hytale-Server-Manual
- **Maven Repo:** https://maven.hytale.com/release
- **Example Plugin:** https://github.com/noel-lang/hytale-example-plugin
- **Discord:** https://discord.gg/hytale

## Quick Start Script

```bash
#!/bin/bash
# start-hytale.sh

cd ~/hytale-server

java -Xms4G -Xmx4G \
     -XX:+UseG1GC \
     -XX:AOTCache=HytaleServer.aot \
     --enable-native-access=ALL-UNNAMED \
     -jar HytaleServer.jar \
     --assets Assets.zip
```

Make executable: `chmod +x start-hytale.sh`

Run: `./start-hytale.sh`

---

**Status:** Tested and working on macOS (M2 Mac mini, Java 25, Hytale 2026.01.28).
