package com.pockitceo.ratgamebridge;

import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.server.core.command.system.basecommands.AbstractPlayerCommand;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

import javax.annotation.Nonnull;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;

/**
 * /checkinv - Check blockchain inventory
 */
public class CheckInventoryCommand extends AbstractPlayerCommand {
    
    private final RatGameBridge plugin;
    
    public CheckInventoryCommand(@Nonnull String name, @Nonnull String description, boolean requiresConfirmation, @Nonnull RatGameBridge plugin) {
        super(name, description, requiresConfirmation);
        this.plugin = plugin;
    }
    
    @Override
    protected void execute(
            @Nonnull CommandContext commandContext,
            @Nonnull Store<EntityStore> store,
            @Nonnull Ref<EntityStore> ref,
            @Nonnull PlayerRef playerRef,
            @Nonnull World world
    ) {
        // TODO: Get player's wallet address from storage
        String walletAddress = "0xYourWalletHere";
        
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(plugin.getBridgeUrl() + "/bridge/inventory/" + walletAddress))
                .GET()
                .build();
            
            HttpResponse<String> response = plugin.getHttpClient().send(request,
                HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                playerRef.sendMessage(Message.raw("Blockchain Inventory:"));
                playerRef.sendMessage(Message.raw(response.body()));
            } else {
                playerRef.sendMessage(Message.raw("Failed to fetch inventory"));
            }
        } catch (Exception e) {
            playerRef.sendMessage(Message.raw("Error: " + e.getMessage()));
        }
    }
}
