// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IAction.sol";

interface IAgentRegistry {
    function agents(address agent) external view returns (bool exists, int32 x, int32 y, uint256 joinedAt);
    function updatePosition(address agent, int32 newX, int32 newY) external;
}

/// @title Movement - Move agents around the grid
/// @notice Action contract for movement
contract Movement is IAction {
    IAgentRegistry public registry;
    int32 public gridSize;
    
    event Moved(address indexed agent, int32 toX, int32 toY);
    
    constructor(address _registry, int32 _gridSize) {
        registry = IAgentRegistry(_registry);
        gridSize = _gridSize;
    }
    
    /// @notice Execute a move action
    /// @param actor Agent performing the move
    /// @param params Encoded (int32 dx, int32 dy) - movement delta
    function execute(address actor, bytes calldata params) external override returns (bool) {
        (int32 dx, int32 dy) = abi.decode(params, (int32, int32));
        
        // Get current position
        (bool exists, int32 x, int32 y,) = registry.agents(actor);
        require(exists, "Agent not registered");
        
        // Calculate new position
        int32 newX = x + dx;
        int32 newY = y + dy;
        
        // Validate bounds
        require(newX >= 0 && newX < gridSize, "X out of bounds");
        require(newY >= 0 && newY < gridSize, "Y out of bounds");
        
        // Validate movement (only 1 step in cardinal directions)
        require(
            (dx == 0 && (dy == 1 || dy == -1)) || 
            (dy == 0 && (dx == 1 || dx == -1)),
            "Invalid movement"
        );
        
        // Update position
        registry.updatePosition(actor, newX, newY);
        
        emit Moved(actor, newX, newY);
        
        return true;
    }
}
