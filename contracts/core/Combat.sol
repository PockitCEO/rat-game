// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IAction.sol";

interface IAgentRegistry {
    function agents(address agent) external view returns (bool exists, int32 x, int32 y, uint256 hp, uint256 joinedAt);
    function isAlive(address agent) external view returns (bool);
    function damage(address agent, uint256 amount) external;
}

interface IGameItems {
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function SWORD_ID() external view returns (uint256);
}

/// @title Combat - Attack other agents
/// @notice Action contract for combat
contract Combat is IAction {
    IAgentRegistry public registry;
    IGameItems public items;
    
    event Attacked(address indexed attacker, address indexed target, uint256 damage);
    
    constructor(address _registry, address _items) {
        registry = IAgentRegistry(_registry);
        items = IGameItems(_items);
    }
    
    /// @notice Execute an attack action
    /// @param actor Agent performing the attack
    /// @param params Encoded (address target) - who to attack
    function execute(address actor, bytes calldata params) external override returns (bool) {
        address target = abi.decode(params, (address));
        
        // Check both alive
        require(registry.isAlive(actor), "Attacker is dead");
        require(registry.isAlive(target), "Target is dead or doesn't exist");
        
        // Get positions
        (,int32 ax, int32 ay,,) = registry.agents(actor);
        (,int32 tx, int32 ty,,) = registry.agents(target);
        
        // Check if adjacent (Manhattan distance = 1)
        int32 dx = ax > tx ? ax - tx : tx - ax;
        int32 dy = ay > ty ? ay - ty : ty - ay;
        
        require(dx + dy == 1, "Target not adjacent");
        
        // Calculate damage (1 base, 2 if has sword)
        uint256 hasSword = items.balanceOf(actor, items.SWORD_ID());
        uint256 damage = hasSword > 0 ? 2 : 1;
        
        // Deal damage
        registry.damage(target, damage);
        
        emit Attacked(actor, target, damage);
        
        return true;
    }
}
