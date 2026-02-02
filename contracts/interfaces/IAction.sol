// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IAction - Base interface for all game actions
/// @notice All action contracts must implement this interface
interface IAction {
    /// @notice Execute an action
    /// @param actor Address performing the action
    /// @param params Encoded action parameters
    /// @return success Whether the action succeeded
    function execute(address actor, bytes calldata params) external returns (bool success);
}
