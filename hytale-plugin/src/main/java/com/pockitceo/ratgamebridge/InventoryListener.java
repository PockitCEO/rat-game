package com.pockitceo.ratgamebridge;

import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.universe.PlayerRef;

import javax.annotation.Nonnull;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.util.logging.Logger;

/**
 * Listens to inventory changes and syncs with blockchain
 */
public class InventoryListener {
    
    private final JavaPlugin plugin;
    private final String bridgeUrl;
    private final HttpClient httpClient;
    private final Logger logger;
    
    public InventoryListener(@Nonnull JavaPlugin plugin, @Nonnull String bridgeUrl, @Nonnull HttpClient httpClient) {
        this.plugin = plugin;
        this.bridgeUrl = bridgeUrl;
        this.httpClient = httpClient;
        this.logger = plugin.getLogger();
    }
    
    /**
     * Called when player picks up an item
     * TODO: Hook into actual Hytale inventory events once API is documented
     */
    public void onItemPickup(@Nonnull PlayerRef player, @Nonnull String itemId, int amount) {
        String walletAddress = getPlayerWallet(player);
        if (walletAddress == null) {
            return;
        }
        
        Integer tokenId = mapItemToToken(itemId);
        if (tokenId == null) {
            return; // Item not tracked
        }
        
        // Mint on blockchain
        mintItem(walletAddress, tokenId, amount);
    }
    
    /**
     * Called when player consumes an item
     * TODO: Hook into actual Hytale inventory events once API is documented
     */
    public void onItemConsume(@Nonnull PlayerRef player, @Nonnull String itemId, int amount) {
        String walletAddress = getPlayerWallet(player);
        if (walletAddress == null) {
            return;
        }
        
        Integer tokenId = mapItemToToken(itemId);
        if (tokenId == null) {
            return;
        }
        
        // Burn on blockchain
        burnItem(walletAddress, tokenId, amount);
    }
    
    /**
     * Mint item on blockchain
     */
    private void mintItem(@Nonnull String walletAddress, int tokenId, int amount) {
        try {
            String json = String.format(
                "{\"playerAddress\":\"%s\",\"itemId\":%d,\"amount\":%d}",
                walletAddress, tokenId, amount
            );
            
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(bridgeUrl + "/bridge/mint"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
            
            HttpResponse<String> response = httpClient.send(request,
                HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                logger.info("Minted token " + tokenId + " for " + walletAddress);
            } else {
                logger.warning("Failed to mint: " + response.body());
            }
        } catch (Exception e) {
            logger.severe("Error minting item: " + e.getMessage());
        }
    }
    
    /**
     * Burn item on blockchain
     */
    private void burnItem(@Nonnull String walletAddress, int tokenId, int amount) {
        try {
            String json = String.format(
                "{\"playerAddress\":\"%s\",\"itemId\":%d,\"amount\":%d}",
                walletAddress, tokenId, amount
            );
            
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(bridgeUrl + "/bridge/burn"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
            
            HttpResponse<String> response = httpClient.send(request,
                HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                logger.info("Burned token " + tokenId + " for " + walletAddress);
            } else {
                logger.warning("Failed to burn: " + response.body());
            }
        } catch (Exception e) {
            logger.severe("Error burning item: " + e.getMessage());
        }
    }
    
    /**
     * Map Hytale item ID to ERC1155 token ID
     */
    private Integer mapItemToToken(@Nonnull String itemId) {
        // TODO: Load from config
        switch (itemId) {
            case "hytale:cheese": return 1;
            case "hytale:void_scythe": return 2;
            default: return null;
        }
    }
    
    /**
     * Get player's wallet address
     * TODO: Implement storage (player data, database, etc.)
     */
    private String getPlayerWallet(@Nonnull PlayerRef player) {
        // For now, return null - needs implementation
        // Store wallet → player UUID mapping
        return null;
    }
}
