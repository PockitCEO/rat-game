package com.pockitceo.ratgamebridge;

import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;

import javax.annotation.Nonnull;
import java.net.http.HttpClient;

/**
 * RatGameBridge - Sync Hytale inventory to blockchain
 * 
 * Listens to inventory events and syncs with Rat Game server via REST API.
 */
public class RatGameBridge extends JavaPlugin {
    
    private String bridgeUrl;
    private HttpClient httpClient;
    private InventoryListener inventoryListener;
    
    public RatGameBridge(@Nonnull JavaPluginInit init) {
        super(init);
    }
    
    @Override
    protected void setup() {
        super.setup();
        
        // Load config
        bridgeUrl = getConfig().getString("bridge-url", "http://localhost:3000");
        httpClient = HttpClient.newHttpClient();
        
        // Register inventory listener
        inventoryListener = new InventoryListener(this, bridgeUrl, httpClient);
        
        // Register commands
        this.getCommandRegistry().registerCommand(
            new SyncCommand("syncwallet", "Sync your wallet to blockchain", false, this)
        );
        this.getCommandRegistry().registerCommand(
            new CheckInventoryCommand("checkinv", "Check blockchain inventory", false, this)
        );
        
        getLogger().info("RatGameBridge enabled! Bridge URL: " + bridgeUrl);
    }
    
    @Override
    protected void cleanup() {
        super.cleanup();
        getLogger().info("RatGameBridge disabled");
    }
    
    public String getBridgeUrl() {
        return bridgeUrl;
    }
    
    public HttpClient getHttpClient() {
        return httpClient;
    }
}
