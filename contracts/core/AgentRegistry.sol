// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AgentRegistry - Track agents in the world
/// @notice Core contract for agent state and position
contract AgentRegistry {
    struct Agent {
        bool exists;
        int32 x;
        int32 y;
        uint256 hp;
        uint256 joinedAt;
    }
    
    mapping(address => Agent) public agents;
    address[] public agentList;
    
    uint256 public constant MAX_HP = 10;
    
    event AgentJoined(address indexed agent, int32 x, int32 y);
    event AgentMoved(address indexed agent, int32 fromX, int32 fromY, int32 toX, int32 toY);
    event AgentDamaged(address indexed agent, uint256 damage, uint256 newHp);
    event AgentHealed(address indexed agent, uint256 amount, uint256 newHp);
    event AgentDied(address indexed agent);
    
    /// @notice Register a new agent
    function join(int32 x, int32 y) external {
        require(!agents[msg.sender].exists, "Agent already joined");
        
        agents[msg.sender] = Agent({
            exists: true,
            x: x,
            y: y,
            hp: MAX_HP,
            joinedAt: block.timestamp
        });
        
        agentList.push(msg.sender);
        
        emit AgentJoined(msg.sender, x, y);
    }
    
    /// @notice Get agent position
    function getPosition(address agent) external view returns (int32 x, int32 y) {
        require(agents[agent].exists, "Agent not found");
        return (agents[agent].x, agents[agent].y);
    }
    
    /// @notice Get agent HP
    function getHp(address agent) external view returns (uint256) {
        require(agents[agent].exists, "Agent not found");
        return agents[agent].hp;
    }
    
    /// @notice Check if agent is alive
    function isAlive(address agent) external view returns (bool) {
        return agents[agent].exists && agents[agent].hp > 0;
    }
    
    /// @notice Update agent position (called by Movement contract)
    function updatePosition(address agent, int32 newX, int32 newY) external {
        require(agents[agent].exists, "Agent not found");
        require(agents[agent].hp > 0, "Agent is dead");
        
        int32 oldX = agents[agent].x;
        int32 oldY = agents[agent].y;
        
        agents[agent].x = newX;
        agents[agent].y = newY;
        
        emit AgentMoved(agent, oldX, oldY, newX, newY);
    }
    
    /// @notice Damage an agent
    function damage(address agent, uint256 amount) external {
        require(agents[agent].exists, "Agent not found");
        require(agents[agent].hp > 0, "Agent already dead");
        
        if (amount >= agents[agent].hp) {
            agents[agent].hp = 0;
            emit AgentDied(agent);
        } else {
            agents[agent].hp -= amount;
        }
        
        emit AgentDamaged(agent, amount, agents[agent].hp);
    }
    
    /// @notice Heal an agent
    function heal(address agent, uint256 amount) external {
        require(agents[agent].exists, "Agent not found");
        require(agents[agent].hp > 0, "Agent is dead");
        
        agents[agent].hp += amount;
        if (agents[agent].hp > MAX_HP) {
            agents[agent].hp = MAX_HP;
        }
        
        emit AgentHealed(agent, amount, agents[agent].hp);
    }
    
    /// @notice Get all agents
    function getAgents() external view returns (address[] memory) {
        return agentList;
    }
    
    /// @notice Get total agent count
    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }
}
