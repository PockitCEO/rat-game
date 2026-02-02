/**
 * Rat Game - Game Engine (TypeScript)
 * Syncs between in-memory state and tevm contract calls
 */
export declare enum TileType {
    Empty = 0,
    Navigable = 1,
    Blocked = 2,
    Shop = 3
}
export interface AgentState {
    id: string;
    x: number;
    y: number;
    speed: number;
    cheeseInventory: number;
    lastMoveBlock: number;
}
export interface CheeseSpawn {
    id: string;
    x: number;
    y: number;
    exists: boolean;
}
export interface GameStateSnapshot {
    blockNumber: number;
    gridSize: number;
    agents: AgentState[];
    cheeses: CheeseSpawn[];
    marketPrice: number;
    shopTile: {
        x: number;
        y: number;
    };
}
export declare class RatGame {
    private blockNumber;
    private gridSize;
    private agents;
    private cheeses;
    private tiles;
    private marketPrice;
    private shopTile;
    constructor(gridSize?: number);
    /**
     * Initialize the game board with random obstacles
     */
    init(): void;
    /**
     * Spawn an agent at a position
     */
    spawnAgent(agentId: string, x: number, y: number): void;
    /**
     * Spawn cheese at random navigable location
     */
    spawnCheese(): string;
    /**
     * Move agent greedily toward target
     */
    moveToward(agentId: string, targetX: number, targetY: number): boolean;
    /**
     * Collect cheese at agent's current position
     */
    collectCheese(agentId: string, cheeseId: string): void;
    /**
     * Eat cheese for speed boost
     */
    eatCheese(agentId: string): void;
    /**
     * Sell cheese at shop
     */
    sellCheese(agentId: string, quantity: number): number;
    /**
     * Step the game forward one block
     */
    stepBlock(): void;
    /**
     * Get current game state snapshot
     */
    getState(): GameStateSnapshot;
    /**
     * Get single agent state
     */
    getAgent(agentId: string): AgentState | null;
    /**
     * Get tile type at position
     */
    getTile(x: number, y: number): TileType;
    /**
     * Get all agents
     */
    getAgents(): AgentState[];
    /**
     * Get all cheeses
     */
    getCheeses(): CheeseSpawn[];
}
declare const _default: RatGame;
export default _default;
//# sourceMappingURL=game.d.ts.map