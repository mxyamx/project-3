import { Position } from './position';

/**
 * Tile interface extension for teleportation
 * These properties are added to the existing Tile interface
 */
export interface TeleportationTileData {
    // ID linking two tiles together as a pair (e.g., "tp-1", "tp-2")
    teleportPairId?: string;

    // Target position for this teleport tile
    teleportTarget?: Position;
}

/**
 * Complete teleportation pair data structure
 * Used for managing and tracking pairs in the UI
 */
export interface TeleportPair {
    // Unique identifier for this pair
    pairId: string;

    // Position of first teleport tile
    positionA: Position;

    // Position of second teleport tile
    positionB: Position;

    // Color for visual distinction (client-side only)
    color: string;
}

/**
 * Board game data structure extension for teleportation
 * This can be added to the BoardGame interface or stored separately
 */
export interface BoardTeleportationData {
    // Map of all teleport pairs on the board
    // Key: pairId, Value: TeleportPair
    teleportPairs: { [pairId: string]: TeleportPair };

    // Counter for generating next pair ID
    nextPairNumber: number;
}

/**
 * Server-side game action for teleportation
 * Used when a player triggers a teleport during gameplay
 */
export interface TeleportAction {
    // Type of action
    actionType: 'TELEPORT';

    // Player performing the action
    playerId: string;

    // Current position
    fromPosition: Position;

    // Target position (from teleportTarget)
    toPosition: Position;

    // Pair ID of the teleport used
    pairId: string;

    // Cost in action points (typically 1)
    actionCost: number;
}

/**
 * Validation result for teleportation
 */
export interface TeleportValidation {
    // Whether the teleportation is valid
    isValid: boolean;

    // Reason for invalidity (if applicable)
    reason?: string;

    // Target position if valid
    targetPosition?: Position;
}

/**
 * Constants for teleportation mechanics
 */
export const TELEPORTATION_CONSTANTS = {
    // Action cost to use teleportation
    ACTION_COST: 1,

    // Movement cost to step onto teleport tile
    MOVEMENT_COST: 1,

    // Maximum number of teleport pairs allowed (arbitrary limit)
    MAX_PAIRS: 10,

    // Colors for visual distinction (matches TeleportationManagerService)
    AVAILABLE_COLORS: [
        '#FF6B6B', // Red
        '#4ECDC4', // Teal
        '#45B7D1', // Blue
        '#FFA07A', // Light Salmon
        '#98D8C8', // Mint
        '#F7DC6F', // Yellow
        '#BB8FCE', // Purple
        '#85C1E2', // Sky Blue
        '#F8B739', // Orange
        '#52B788', // Green
    ],
};

/**
 * Helper functions for teleportation data management
 */
export class TeleportationDataHelper {
    /**
     * Serialize teleportation data for storage/transmission
     */
    static serializeTeleportData(pairs: Map<string, TeleportPair>): string {
        const pairsArray = Array.from(pairs.values());
        return JSON.stringify(pairsArray);
    }

    /**
     * Deserialize teleportation data from storage/transmission
     */
    static deserializeTeleportData(data: string): Map<string, TeleportPair> {
        const pairsArray: TeleportPair[] = JSON.parse(data);
        const pairsMap = new Map<string, TeleportPair>();

        pairsArray.forEach((pair) => {
            pairsMap.set(pair.pairId, pair);
        });

        return pairsMap;
    }

    /**
     * Validate teleportation action
     */
    static validateTeleportAction(
        fromPosition: Position,
        tile: any, // Tile with TeleportationTileData
        boardTiles: any[][],
    ): TeleportValidation {
        // Check if tile is a teleportation tile
        if (tile.type !== 'teleportation') {
            return {
                isValid: false,
                reason: 'Tile is not a teleportation tile',
            };
        }

        // Check if tile has target
        if (!tile.teleportTarget) {
            return {
                isValid: false,
                reason: 'Teleportation tile has no target',
            };
        }

        // Check if target position is valid
        const target = tile.teleportTarget;
        if (target.x < 0 || target.y < 0 || target.x >= boardTiles.length || target.y >= boardTiles[0].length) {
            return {
                isValid: false,
                reason: 'Target position is out of bounds',
            };
        }

        // Check if target tile is free (no player)
        const targetTile = boardTiles[target.x][target.y];
        if (targetTile.containedPlayer) {
            return {
                isValid: false,
                reason: 'Target tile is occupied by another player',
            };
        }

        return {
            isValid: true,
            targetPosition: target,
        };
    }

    /**
     * Extract all teleport pairs from a board
     */
    static extractTeleportPairsFromBoard(boardTiles: any[][]): Map<string, TeleportPair> {
        const foundPairs = new Map<string, Position[]>();

        // Scan board for teleport tiles
        for (let i = 0; i < boardTiles.length; i++) {
            for (let j = 0; j < boardTiles[i].length; j++) {
                const tile = boardTiles[i][j];
                if (tile.type === 'teleportation' && tile.teleportPairId) {
                    if (!foundPairs.has(tile.teleportPairId)) {
                        foundPairs.set(tile.teleportPairId, []);
                    }
                    foundPairs.get(tile.teleportPairId)!.push({ x: i, y: j });
                }
            }
        }

        // Reconstruct pairs
        const pairs = new Map<string, TeleportPair>();
        let colorIndex = 0;

        foundPairs.forEach((positions, pairId) => {
            if (positions.length === 2) {
                pairs.set(pairId, {
                    pairId,
                    positionA: positions[0],
                    positionB: positions[1],
                    color: TELEPORTATION_CONSTANTS.AVAILABLE_COLORS[colorIndex % TELEPORTATION_CONSTANTS.AVAILABLE_COLORS.length],
                });
                colorIndex++;
            }
        });

        return pairs;
    }
}
