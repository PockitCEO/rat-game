// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title GameItems - ERC1155 inventory system
/// @notice Simplified ERC1155 for game items
contract GameItems {
    // ERC1155 events
    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value
    );
    
    event TransferBatch(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] values
    );
    
    // Balances: owner => id => balance
    mapping(address => mapping(uint256 => uint256)) private _balances;
    
    // Item types
    enum ItemType { None, Cheese, Sword }
    
    // Item metadata
    mapping(uint256 => ItemType) public itemTypes;
    mapping(uint256 => string) public itemNames;
    
    uint256 public constant CHEESE_ID = 1;
    uint256 public constant SWORD_ID = 2;
    
    constructor() {
        // Pre-define item types
        itemTypes[CHEESE_ID] = ItemType.Cheese;
        itemNames[CHEESE_ID] = "Cheese";
        
        itemTypes[SWORD_ID] = ItemType.Sword;
        itemNames[SWORD_ID] = "Sword";
    }
    
    /// @notice Get balance of an item for an address
    function balanceOf(address account, uint256 id) public view returns (uint256) {
        require(account != address(0), "Invalid address");
        return _balances[account][id];
    }
    
    /// @notice Mint items to an address (internal game logic)
    function mint(address to, uint256 id, uint256 amount) external {
        require(to != address(0), "Invalid address");
        require(id == CHEESE_ID || id == SWORD_ID, "Invalid item id");
        
        _balances[to][id] += amount;
        
        emit TransferSingle(msg.sender, address(0), to, id, amount);
    }
    
    /// @notice Burn items from an address
    function burn(address from, uint256 id, uint256 amount) external {
        require(from != address(0), "Invalid address");
        require(_balances[from][id] >= amount, "Insufficient balance");
        
        _balances[from][id] -= amount;
        
        emit TransferSingle(msg.sender, from, address(0), id, amount);
    }
    
    /// @notice Get all items owned by an address (helper for UI)
    function getInventory(address owner) external view returns (
        uint256[] memory ids,
        uint256[] memory balances,
        string[] memory names
    ) {
        // Check cheese and sword
        uint256 count = 0;
        if (_balances[owner][CHEESE_ID] > 0) count++;
        if (_balances[owner][SWORD_ID] > 0) count++;
        
        ids = new uint256[](count);
        balances = new uint256[](count);
        names = new string[](count);
        
        uint256 index = 0;
        if (_balances[owner][CHEESE_ID] > 0) {
            ids[index] = CHEESE_ID;
            balances[index] = _balances[owner][CHEESE_ID];
            names[index] = itemNames[CHEESE_ID];
            index++;
        }
        if (_balances[owner][SWORD_ID] > 0) {
            ids[index] = SWORD_ID;
            balances[index] = _balances[owner][SWORD_ID];
            names[index] = itemNames[SWORD_ID];
            index++;
        }
        
        return (ids, balances, names);
    }
}
