import { Injectable } from '@angular/core';
import { BoardGameGraph } from '@app/classes/board-game-graph/board-game-graph';
import { ItemName } from '@common/enums/item-name';
import { TileType } from '@common/enums/tile-type';
import { Position } from '@common/position';
import { Tile } from '@common/tile';

@Injectable({
    providedIn: 'root',
})
export class TorchIlluminationService {
    private readonly TORCH_RANGE = 2;

    /**
     * Calculate and update illumination for all tiles on the board
     * Torches on water/ice are extinguished and don't illuminate
     */
    updateBoardIllumination(tiles: Tile[][]): void {
        // Reset all illumination
        this.clearIllumination(tiles);

        // Find all lit torches
        const litTorches = this.findLitTorches(tiles);

        // Calculate illumination for each torch
        for (const torchPos of litTorches) {
            this.illuminateFromTorch(tiles, torchPos);
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
     * Check if a specific position should be illuminated
     * Used for validation/testing
     */
    isPositionIlluminated(tiles: Tile[][], position: Position): boolean {
        return tiles[position.x][position.y].isIlluminated ?? false;
    }
}
