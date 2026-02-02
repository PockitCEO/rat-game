// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IAction.sol";

interface IAgentRegistry {
    function isAlive(address agent) external view returns (bool);
    function heal(address agent, uint256 amount) external;
}

interface IGameItems {
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function burn(address from, uint256 id, uint256 amount) external;
    function CHEESE_ID() external view returns (uint256);
}

/// @title UseItem - Use items from inventory
/// @notice Action contract for item usage
contract UseItem is IAction {
    IAgentRegistry public registry;
    IGameItems public items;
    
    uint256 public constant CHEESE_HEAL = 8;
    
    event ItemUsed(address indexed agent, uint256 itemId, string effect);
    
    constructor(address _registry, address _items) {
        registry = IAgentRegistry(_registry);
        items = IGameItems(_items);
    }
    
    /// @notice Execute a use item action
    /// @param actor Agent using the item
    /// @param params Encoded (uint256 itemId) - which item to use
    function execute(address actor, bytes calldata params) external override returns (bool) {
        uint256 itemId = abi.decode(params, (uint256));
        
        // Check agent is alive
        require(registry.isAlive(actor), "Agent is dead");
        
        // Check agent has the item
        require(items.balanceOf(actor, itemId) > 0, "Don't have this item");
        
        // Use item based on type
        if (itemId == items.CHEESE_ID()) {
            // Cheese: heal 8 HP
            items.burn(actor, itemId, 1);
            registry.heal(actor, CHEESE_HEAL);
            emit ItemUsed(actor, itemId, "Healed 8 HP");
        } else {
            revert("Item not usable");
        }
        
        return true;
    }
}
