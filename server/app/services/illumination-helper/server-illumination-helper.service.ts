/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/prefer-for-of */
import { BoardGameGraph } from '@app/classes/board-game-graph/board-game-graph';
import { ItemName } from '@common/enums/item-name';
import { TileType } from '@common/enums/tile-type';
import { Player } from '@common/player';
import { Position } from '@common/position';
import { Tile } from '@common/tile';

/**
 * Server-side illumination calculator
 * Handles torch illumination for gameplay sessions
 */
export class ServerIlluminationHelper {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    private readonly TORCH_RANGE = 2;

    /**
     * Recalculate illumination for the entire board
     * @param tiles - Game board tiles
     * @param players - All players in the game
     */
    updateBoardIllumination(tiles: Tile[][], players: Player[]): void {
        // Clear all illumination
        this.clearIllumination(tiles);

        // Find and illuminate from map torches
        this.illuminateMapTorches(tiles);

        // Illuminate tiles for players holding torches
        this.illuminatePlayerTorches(tiles, players);
    }

    /**
     * Find torches on map and illuminate around them
     */
    private illuminateMapTorches(tiles: Tile[][]): void {
        for (let i = 0; i < tiles.length; i++) {
            for (let j = 0; j < tiles[i].length; j++) {
                const tile = tiles[i][j];

                // Check if tile has a torch
                if (tile.containedItem?.name === ItemName.Torch) {
                    // Torch is lit only if NOT on water or ice
                    if (tile.type !== TileType.Water && tile.type !== TileType.Ice) {
                        this.illuminateFromPosition(tiles, { x: i, y: j });
                    }
                }
            }
        }
    }

    /**
     * Illuminate tiles for players carrying torches
     */
    private illuminatePlayerTorches(tiles: Tile[][], players: Player[]): void {
        for (const player of players) {
            // Check if player has torch in inventory
            const hasTorch = player.inventory?.some((item) => item.name === ItemName.Torch);

            if (hasTorch && player.position) {
                const pos = player.position;

                // Only illuminate the tile the player is standing on
                if (this.isValidPosition(tiles, pos)) {
                    tiles[pos.x][pos.y].isIlluminated = true;
                }
            }
        }
    }

    /**
     * Illuminate tiles around a specific position (2-block range)
     * Uses graph traversal to respect walls and closed doors
     */
    private illuminateFromPosition(tiles: Tile[][], position: Position): void {
        // Create graph that respects walls and doors
        const graph = new BoardGameGraph(tiles, false, true);

        // Find all tiles within range
        const reachableNodes = graph.findReachableNodes(position, this.TORCH_RANGE);

        // Mark source tile as illuminated
        tiles[position.x][position.y].isIlluminated = true;

        // Mark all reachable tiles as illuminated
        for (const node of reachableNodes) {
            const pos = node.tilePosition;
            tiles[pos.x][pos.y].isIlluminated = true;
        }
    }

    /**
     * Clear illumination from all tiles
     */
    private clearIllumination(tiles: Tile[][]): void {
        for (let i = 0; i < tiles.length; i++) {
            for (let j = 0; j < tiles[i].length; j++) {
                tiles[i][j].isIlluminated = false;
            }
        }
    }

    /**
     * Validate position is within board bounds
     */
    private isValidPosition(tiles: Tile[][], position: Position): boolean {
        return position.x >= 0 && position.x < tiles.length && position.y >= 0 && position.y < tiles[0].length;
    }

    /**
     * Check if a specific position is illuminated
     */
    isPositionIlluminated(tiles: Tile[][], position: Position): boolean {
        if (!this.isValidPosition(tiles, position)) {
            return false;
        }
        return tiles[position.x][position.y].isIlluminated ?? false;
    }
}
