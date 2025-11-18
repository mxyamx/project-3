import { inject, Injectable } from '@angular/core';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { TeleportationManagerService } from '@app/services/teleportation-manager/teleportation-manager.service';
import { TileType } from '@common/enums/tile-type';
import { Position } from '@common/position';
import { Tile } from '@common/tile';

@Injectable({
    providedIn: 'root',
})
export class TileApplicatorService {
    boardManager: BoardGameManagerService = inject(BoardGameManagerService);
    teleportationManager: TeleportationManagerService = inject(TeleportationManagerService);

    isActivated: boolean = false;
    currentTileType: TileType = TileType.Grass;
    mouseClicked: boolean = false;
    rightButtonPressed: boolean = false;

    activate(tileType: TileType): void {
        this.isActivated = true;
        this.currentTileType = tileType;

        // If activating teleportation, start the placement process
        if (tileType === TileType.Teleportation) {
            this.teleportationManager.startTeleportPlacement();
        }
    }

    deactivate(): void {
        this.isActivated = false;
        this.currentTileType = TileType.Grass;

        // Cancel any ongoing teleport placement
        if (this.teleportationManager.isPlacingTeleport()) {
            this.teleportationManager.cancelPlacement();
        }
    }

    /**
     * Change a tile to a specific type (for non-teleportation tiles)
     */
    changeTile(xPosition: number, yPosition: number, tileType: TileType): void {
        // Don't allow direct tile changes during teleport placement
        if (this.teleportationManager.isPlacingTeleport()) {
            return;
        }

        const newTile: Tile = structuredClone(this.boardManager.editedBoardGame().tiles[xPosition][yPosition]);

        // Clear teleport data if changing away from teleportation
        if (newTile.type === TileType.Teleportation && tileType !== TileType.Teleportation) {
            if (newTile.teleportPairId) {
                this.teleportationManager.removeTeleportPair(newTile.teleportPairId);
            }
        }

        newTile.type = tileType;
        this.boardManager.updateTile(xPosition, yPosition, newTile);
    }

    /**
     * Reset a tile to grass (handles teleportation pairs)
     */
    resetTile(xPosition: number, yPosition: number): void {
        const tile = this.boardManager.editedBoardGame().tiles[xPosition][yPosition];

        // If it's a teleportation tile, remove the entire pair
        if (tile.type === TileType.Teleportation && tile.teleportPairId) {
            this.teleportationManager.removeTeleportPair(tile.teleportPairId);
        } else {
            // Normal tile reset
            this.changeTile(xPosition, yPosition, TileType.Grass);
        }

        this.deactivate();
    }

    /**
     * Toggle door state
     */
    toggleDoorState(xPosition: number, yPosition: number): void {
        const newTile: Tile = structuredClone(this.boardManager.editedBoardGame().tiles[xPosition][yPosition]);
        newTile.doorState = !newTile.doorState;
        this.boardManager.updateTile(xPosition, yPosition, newTile);
    }

    /**
     * Handle tile click during placement
     */
    handleTileClick(xPosition: number, yPosition: number): boolean {
        const position: Position = { x: xPosition, y: yPosition };

        // Handle teleportation placement
        if (this.currentTileType === TileType.Teleportation && this.teleportationManager.isPlacingTeleport()) {
            if (this.teleportationManager.isWaitingForSecondTeleport()) {
                // Place second teleport
                const success = this.teleportationManager.placeSecondTeleport(position);
                if (success) {
                    this.deactivate();
                }
                return success;
            } else {
                // Place first teleport
                return this.teleportationManager.placeFirstTeleport(position);
            }
        }

        // Handle normal tile placement (with sliding)
        if (this.isActivated && this.currentTileType !== TileType.Teleportation) {
            this.changeTile(xPosition, yPosition, this.currentTileType);
            return true;
        }

        return false;
    }

    /**
     * Handle tile drag (for sliding placement - not supported for teleportation)
     */
    handleTileDrag(xPosition: number, yPosition: number): void {
        // Teleportation doesn't support sliding
        if (this.currentTileType === TileType.Teleportation) {
            return;
        }

        if (this.isActivated && this.mouseClicked) {
            this.changeTile(xPosition, yPosition, this.currentTileType);
        }
    }

    /**
     * Cancel current operation (for ESC key)
     */
    cancel(): void {
        if (this.teleportationManager.isPlacingTeleport()) {
            this.teleportationManager.cancelPlacement();
        }
        this.deactivate();
    }
}
