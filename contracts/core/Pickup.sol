// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IAction.sol";

interface IAgentRegistry {
    function agents(address agent) external view returns (bool exists, int32 x, int32 y, uint256 hp, uint256 joinedAt);
    function isAlive(address agent) external view returns (bool);
}

interface IGameItems {
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function mint(address to, uint256 id, uint256 amount) external;
    function CHEESE_ID() external view returns (uint256);
    function SWORD_ID() external view returns (uint256);
}

/// @title Pickup - Pick up items from the world
/// @notice Action contract for picking up items
contract Pickup is IAction {
    IAgentRegistry public registry;
    IGameItems public items;
    int32 public gridSize;
    
    // Item spawns: position => item id => amount
    mapping(int32 => mapping(int32 => mapping(uint256 => uint256))) public worldItems;
    
    event ItemSpawned(int32 x, int32 y, uint256 itemId, uint256 amount);
    event ItemPickedUp(address indexed agent, int32 x, int32 y, uint256 itemId, uint256 amount);
    
    constructor(address _registry, address _items, int32 _gridSize) {
        registry = IAgentRegistry(_registry);
        items = IGameItems(_items);
        gridSize = _gridSize;
    }
    
    /// @notice Spawn an item in the world (called by server/admin)
    function spawnItem(int32 x, int32 y, uint256 itemId, uint256 amount) external {
        require(x >= 0 && x < gridSize && y >= 0 && y < gridSize, "Out of bounds");
        worldItems[x][y][itemId] += amount;
        emit ItemSpawned(x, y, itemId, amount);
    }
    
    /// @notice Execute a pickup action
    /// @param actor Agent performing the pickup
    /// @param params Encoded (uint256 itemId) - what to pick up
    function execute(address actor, bytes calldata params) external override returns (bool) {
        uint256 itemId = abi.decode(params, (uint256));
        
        // Check agent is alive
        require(registry.isAlive(actor), "Agent is dead");
        
        // Get agent position
        (bool exists, int32 x, int32 y,,) = registry.agents(actor);
        require(exists, "Agent not found");
        
        // Check if item exists at this position
        uint256 amount = worldItems[x][y][itemId];
        require(amount > 0, "No item at this position");
        
        // Remove from world, add to agent inventory
        worldItems[x][y][itemId] -= 1;
        items.mint(actor, itemId, 1);
        
        emit ItemPickedUp(actor, x, y, itemId, 1);
        
        return true;
    }
    
    /// @notice Get item at position
    function getItemAt(int32 x, int32 y, uint256 itemId) external view returns (uint256) {
        return worldItems[x][y][itemId];
    }
}
