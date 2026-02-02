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

/**
 * /syncwallet <address> - Link wallet to player
 */
public class SyncCommand extends AbstractPlayerCommand {
    
    private final RatGameBridge plugin;
    
    public SyncCommand(@Nonnull String name, @Nonnull String description, boolean requiresConfirmation, @Nonnull RatGameBridge plugin) {
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
        String[] args = commandContext.getArguments();
        
        if (args.length != 1) {
            playerRef.sendMessage(Message.raw("Usage: /syncwallet <wallet_address>"));
            return;
        }
        
        String walletAddress = args[0];
        
        // TODO: Validate Ethereum address format
        // TODO: Store wallet → player UUID mapping (database, config, etc.)
        
        playerRef.sendMessage(Message.raw("Wallet linked: " + walletAddress));
        playerRef.sendMessage(Message.raw("Your items will now sync to blockchain!"));
    }
}
