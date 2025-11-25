import { Injectable } from '@angular/core';
import { BoardGameGraph } from '@app/classes/board-game-graph/board-game-graph';
import { ItemName } from '@common/enums/item-name';
import { TileType } from '@common/enums/tile-type';
import { Player } from '@common/player';
import { Position } from '@common/position';
import { Tile } from '@common/tile';

@Injectable({
    providedIn: 'root',
})
export class TorchIlluminationService {
    private readonly TORCH_RANGE = 2;

    /**
     * Calculate and update illumination for all tiles on the board
     * Handles both torches on the map and torches in player inventories
     * @param tiles - The game board tiles
     * @param players - Optional array of players (for gameplay mode)
     */
    updateBoardIllumination(tiles: Tile[][], players?: Player[]): void {
        // Reset all illumination
        this.clearIllumination(tiles);

        // Find all lit torches ON THE MAP
        const litTorches = this.findLitTorches(tiles);

        // Calculate illumination for each map torch (2-block range)
        for (const torchPos of litTorches) {
            this.illuminateFromTorch(tiles, torchPos);
        }

        // If players provided, check for torches in inventory
        if (players) {
            for (const player of players) {
                if (this.playerHasTorch(player) && player.position) {
                    // Check if player is on water or ice - if so, torch doesn't illuminate
                    const pos = player.position;
                    if (this.isValidPosition(tiles, pos)) {
                        const tileType = tiles[pos.x][pos.y].type;
                        // Only illuminate if NOT on water or ice
                        if (tileType !== TileType.Water && tileType !== TileType.Ice) {
                            tiles[pos.x][pos.y].isIlluminated = true;
                        }
                    }
                }
            }
        }
    }

    /**
     * Find all torches that are lit (not on water/ice)
     */
    private findLitTorches(tiles: Tile[][]): Position[] {
        const litTorches: Position[] = [];

        for (let i = 0; i < tiles.length; i++) {
            for (let j = 0; j < tiles[i].length; j++) {
                const tile = tiles[i][j];
                const item = tile.containedItem;

                if (item && item.name === ItemName.Torch) {
                    // Torch is lit only if NOT on water or ice
                    if (tile.type !== TileType.Water && tile.type !== TileType.Ice) {
                        litTorches.push({ x: i, y: j });
                    }
                }
            }
        }

        return litTorches;
    }

    /**
     * Illuminate tiles around a specific torch position
     * Uses graph traversal to respect walls and closed doors
     */
    private illuminateFromTorch(tiles: Tile[][], torchPos: Position): void {
        // Create graph that respects walls and doors
        const graph = new BoardGameGraph(tiles, false, true);

        // Find all tiles within range (distance <= 2)
        const reachableNodes = graph.findReachableNodes(torchPos, this.TORCH_RANGE);

        // Mark torch tile as illuminated
        tiles[torchPos.x][torchPos.y].isIlluminated = true;

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
     * Check if player has torch in inventory
     */
    private playerHasTorch(player: Player): boolean {
        return player.inventory?.some((item) => item.name === ItemName.Torch) ?? false;
    }

    /**
     * Validate position is within board bounds
     */
    private isValidPosition(tiles: Tile[][], position: Position): boolean {
        return position.x >= 0 && position.x < tiles.length && position.y >= 0 && position.y < tiles[0].length;
    }

    /**
     * Check if a specific position should be illuminated
     * Used for validation/testing
     */
    isPositionIlluminated(tiles: Tile[][], position: Position): boolean {
        return tiles[position.x][position.y].isIlluminated ?? false;
    }

    /**
     * Get all players currently on illuminated tiles
     */
    getPlayersOnIlluminatedTiles(tiles: Tile[][], players: Player[]): Player[] {
        return players.filter((player) => {
            if (!player.position) return false;
            const pos = player.position;
            return this.isValidPosition(tiles, pos) && tiles[pos.x][pos.y].isIlluminated;
        });
    }
}
