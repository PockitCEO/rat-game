package com.pockitceo.ratgamebridge;

import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerPickupItemEvent;
import org.bukkit.event.player.PlayerItemConsumeEvent;
import org.bukkit.inventory.ItemStack;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;

/**
 * RatGameBridge - Sync Hytale inventory to blockchain
 */
public class RatGameBridge extends JavaPlugin implements Listener {
    
    private String bridgeUrl;
    private Map<String, Integer> itemMapping;
    private HttpClient httpClient;
    
    @Override
    public void onEnable() {
        // Save default config
        saveDefaultConfig();
        
        // Load config
        bridgeUrl = getConfig().getString("bridge-url", "http://localhost:3000");
        loadItemMapping();
        
        // Setup HTTP client
        httpClient = HttpClient.newHttpClient();
        
        // Register events
        getServer().getPluginManager().registerEvents(this, this);
        
        getLogger().info("RatGameBridge enabled! Bridge URL: " + bridgeUrl);
    }
    
    @Override
    public void onDisable() {
        getLogger().info("RatGameBridge disabled");
    }
    
    private void loadItemMapping() {
        itemMapping = new HashMap<>();
        
        // Load from config
        for (String key : getConfig().getConfigurationSection("item-mapping").getKeys(false)) {
            int tokenId = getConfig().getInt("item-mapping." + key);
            itemMapping.put(key, tokenId);
        }
        
        getLogger().info("Loaded " + itemMapping.size() + " item mappings");
    }
    
    private Integer getTokenId(ItemStack item) {
        String itemKey = item.getType().getKey().toString();
        return itemMapping.get(itemKey);
    }
    
    /**
     * When player joins, sync their blockchain inventory to Hytale
     */
    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        Player player = event.getPlayer();
        
        // Get player's wallet address (assume stored in player data)
        String address = getPlayerAddress(player);
        if (address == null) {
            return;
        }
        
        // Fetch inventory from blockchain
        getServer().getScheduler().runTaskAsynchronously(this, () -> {
            try {
                HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(bridgeUrl + "/bridge/inventory/" + address))
                    .GET()
                    .build();
                
                HttpResponse<String> response = httpClient.send(request, 
                    HttpResponse.BodyHandlers.ofString());
                
                if (response.statusCode() == 200) {
                    // Parse JSON and spawn items
                    // TODO: Implement JSON parsing and item spawning
                    getLogger().info("Synced inventory for " + player.getName());
                }
            } catch (Exception e) {
                getLogger().warning("Failed to sync inventory: " + e.getMessage());
            }
        });
    }
    
    /**
     * When player picks up item, mint on blockchain
     */
    @EventHandler
    public void onItemPickup(PlayerPickupItemEvent event) {
        Player player = event.getPlayer();
        ItemStack item = event.getItem().getItemStack();
        
        Integer tokenId = getTokenId(item);
        if (tokenId == null) {
            return; // Item not mapped
        }
        
        String address = getPlayerAddress(player);
        if (address == null) {
            return;
        }
        
        // Mint on blockchain
        getServer().getScheduler().runTaskAsynchronously(this, () -> {
            try {
                String json = String.format(
                    "{\"playerAddress\":\"%s\",\"itemId\":%d,\"amount\":1}",
                    address, tokenId
                );
                
                HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(bridgeUrl + "/bridge/mint"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
                
                HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString());
                
                if (response.statusCode() == 200) {
                    getLogger().info("Minted " + item.getType() + " for " + player.getName());
                }
            } catch (Exception e) {
                getLogger().warning("Failed to mint item: " + e.getMessage());
            }
        });
    }
    
    /**
     * When player consumes item, burn on blockchain
     */
    @EventHandler
    public void onItemConsume(PlayerItemConsumeEvent event) {
        Player player = event.getPlayer();
        ItemStack item = event.getItem();
        
        Integer tokenId = getTokenId(item);
        if (tokenId == null) {
            return; // Item not mapped
        }
        
        String address = getPlayerAddress(player);
        if (address == null) {
            return;
        }
        
        // Burn on blockchain
        getServer().getScheduler().runTaskAsynchronously(this, () -> {
            try {
                String json = String.format(
                    "{\"playerAddress\":\"%s\",\"itemId\":%d,\"amount\":1}",
                    address, tokenId
                );
                
                HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(bridgeUrl + "/bridge/burn"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
                
                HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString());
                
                if (response.statusCode() == 200) {
                    getLogger().info("Burned " + item.getType() + " for " + player.getName());
                }
            } catch (Exception e) {
                getLogger().warning("Failed to burn item: " + e.getMessage());
            }
        });
    }
    
    /**
     * Get player's wallet address
     * TODO: Implement proper storage (database, config file, etc.)
     */
    private String getPlayerAddress(Player player) {
        // For now, return null - needs implementation
        // Could store in player data, database, or ask player to link wallet
        return null;
    }
}
