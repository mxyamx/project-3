import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { TileType } from '@common/enums/tile-type';
import { Position } from '@common/position';
import { Tile } from '@common/tile';

export interface TeleportPair {
    pairId: string;
    positionA: Position;
    positionB: Position;
    color: string; // Visual distinction color
}

// Define colors for visual distinction between pairs
const TELEPORT_COLORS = [
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
];

@Injectable({
    providedIn: 'root',
})
export class TeleportationManagerService {
    private boardManager: BoardGameManagerService = inject(BoardGameManagerService);

    // State for current teleport placement
    isPlacingTeleport: WritableSignal<boolean> = signal(false);
    firstTeleportPosition: WritableSignal<Position | null> = signal(null);
    currentPairId: WritableSignal<string> = signal('');

    // Track all pairs for management
    private teleportPairs: Map<string, TeleportPair> = new Map();
    private nextPairNumber: number = 1;
    private usedColors: Set<string> = new Set();

    /**
     * Initialize the service and scan existing teleport tiles
     */
    initializeFromBoard(): void {
        this.teleportPairs.clear();
        this.usedColors.clear();
        this.nextPairNumber = 1;

        const tiles = this.boardManager.editedBoardGame().tiles;
        const foundPairs = new Map<string, Position[]>();

        // Scan board for existing teleport tiles
        for (let i = 0; i < tiles.length; i++) {
            for (let j = 0; j < tiles[i].length; j++) {
                const tile = tiles[i][j];
                if (tile.type === TileType.Teleportation && tile.teleportPairId) {
                    if (!foundPairs.has(tile.teleportPairId)) {
                        foundPairs.set(tile.teleportPairId, []);
                    }
                    foundPairs.get(tile.teleportPairId)!.push({ x: i, y: j });
                }
            }
        }

        // Reconstruct pairs and assign colors
        foundPairs.forEach((positions, pairId) => {
            if (positions.length === 2) {
                const color = this.getNextAvailableColor();
                this.teleportPairs.set(pairId, {
                    pairId,
                    positionA: positions[0],
                    positionB: positions[1],
                    color,
                });
                this.usedColors.add(color);

                // Update pair number counter
                const pairNum = parseInt(pairId.replace('tp-', ''));
                if (pairNum >= this.nextPairNumber) {
                    this.nextPairNumber = pairNum + 1;
                }
            }
        });
    }

    /**
     * Start placing a new teleport pair
     */
    startTeleportPlacement(): void {
        this.isPlacingTeleport.set(true);
        this.currentPairId.set(this.generatePairId());
        this.firstTeleportPosition.set(null);
    }

    /**
     * Place the first teleport tile
     */
    placeFirstTeleport(position: Position): boolean {
        const tile = this.boardManager.editedBoardGame().tiles[position.x][position.y];

        // Can only place on grass tiles
        if (tile.type !== TileType.Grass) {
            return false;
        }

        // Can't place on tiles with items
        if (tile.containedItem) {
            return false;
        }

        const newTile: Tile = structuredClone(tile);
        newTile.type = TileType.Teleportation;
        newTile.teleportPairId = this.currentPairId();

        this.boardManager.updateTile(position.x, position.y, newTile);
        this.firstTeleportPosition.set(position);

        return true;
    }

    /**
     * Place the second teleport tile and complete the pair
     */
    placeSecondTeleport(position: Position): boolean {
        const firstPos = this.firstTeleportPosition();

        if (!firstPos) return false;

        // Can't place on the same position
        if (firstPos.x === position.x && firstPos.y === position.y) {
            return false;
        }

        const tile = this.boardManager.editedBoardGame().tiles[position.x][position.y];

        // Can only place on grass tiles
        if (tile.type !== TileType.Grass) {
            return false;
        }

        // Can't place on tiles with items
        if (tile.containedItem) {
            return false;
        }

        const pairId = this.currentPairId();

        // Update first tile with target
        const firstTile: Tile = structuredClone(this.boardManager.editedBoardGame().tiles[firstPos.x][firstPos.y]);
        firstTile.teleportTarget = position;
        this.boardManager.updateTile(firstPos.x, firstPos.y, firstTile);

        // Place second tile
        const secondTile: Tile = structuredClone(tile);
        secondTile.type = TileType.Teleportation;
        secondTile.teleportPairId = pairId;
        secondTile.teleportTarget = firstPos;
        this.boardManager.updateTile(position.x, position.y, secondTile);

        // Store the pair with color
        const color = this.getNextAvailableColor();
        this.teleportPairs.set(pairId, {
            pairId,
            positionA: firstPos,
            positionB: position,
            color,
        });
        this.usedColors.add(color);

        // Reset state
        this.nextPairNumber++;
        this.completePlacement();

        return true;
    }

    /**
     * Cancel current teleport placement
     */
    cancelPlacement(): void {
        const firstPos = this.firstTeleportPosition();

        if (firstPos) {
            // Remove the first placed tile
            const tile = this.boardManager.editedBoardGame().tiles[firstPos.x][firstPos.y];
            const newTile: Tile = structuredClone(tile);
            newTile.type = TileType.Grass;
            newTile.teleportPairId = undefined;
            newTile.teleportTarget = undefined;
            this.boardManager.updateTile(firstPos.x, firstPos.y, newTile);
        }

        this.completePlacement();
    }

    /**
     * Remove a complete teleport pair
     */
    removeTeleportPair(pairId: string): void {
        const pair = this.teleportPairs.get(pairId);

        if (pair) {
            // Remove both tiles
            this.removeTeleportTile(pair.positionA);
            this.removeTeleportTile(pair.positionB);

            // Free up the color
            this.usedColors.delete(pair.color);

            // Remove from tracking
            this.teleportPairs.delete(pairId);
        } else {
            // Fallback: scan board for this pair ID
            const tiles = this.boardManager.editedBoardGame().tiles;
            for (let i = 0; i < tiles.length; i++) {
                for (let j = 0; j < tiles[i].length; j++) {
                    if (tiles[i][j].teleportPairId === pairId) {
                        this.removeTeleportTile({ x: i, y: j });
                    }
                }
            }
        }
    }

    /**
     * Get color for a specific pair
     */
    getPairColor(pairId: string): string {
        const pair = this.teleportPairs.get(pairId);
        return pair?.color || TELEPORT_COLORS[0];
    }

    /**
     * Get all teleport pairs
     */
    getAllPairs(): TeleportPair[] {
        return Array.from(this.teleportPairs.values());
    }

    /**
     * Check if currently waiting for second teleport
     */
    isWaitingForSecondTeleport(): boolean {
        return this.isPlacingTeleport() && this.firstTeleportPosition() !== null;
    }

    // Private helper methods

    private generatePairId(): string {
        return `tp-${this.nextPairNumber}`;
    }

    private completePlacement(): void {
        this.isPlacingTeleport.set(false);
        this.firstTeleportPosition.set(null);
        this.currentPairId.set('');
    }

    private removeTeleportTile(position: Position): void {
        const tile = this.boardManager.editedBoardGame().tiles[position.x][position.y];
        const newTile: Tile = structuredClone(tile);
        newTile.type = TileType.Grass;
        newTile.teleportPairId = undefined;
        newTile.teleportTarget = undefined;
        this.boardManager.updateTile(position.x, position.y, newTile);
    }

    private getNextAvailableColor(): string {
        // Find first unused color
        for (const color of TELEPORT_COLORS) {
            if (!this.usedColors.has(color)) {
                return color;
            }
        }

        // If all colors used, cycle through them
        return TELEPORT_COLORS[this.teleportPairs.size % TELEPORT_COLORS.length];
    }
}
