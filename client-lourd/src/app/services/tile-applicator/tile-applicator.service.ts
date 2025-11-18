import { inject, Injectable } from '@angular/core';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { TileType } from '@common/enums/tile-type';
import { Position } from '@common/position';
import { Tile } from '@common/tile';

@Injectable({
    providedIn: 'root',
})
export class TileApplicatorService {
    boardManager: BoardGameManagerService = inject(BoardGameManagerService);
    isActivated: boolean = false;
    currentTileType: TileType;
    mouseClicked: boolean = false;
    rightButtonPressed: boolean = false;

    // Nouveaux états pour téléporteurs
    isWaitingForSecondTeleporter: boolean = false;
    firstTeleporterPosition?: Position;
    nextTeleporterPairId: number = 1;

    activate(tileType: TileType): void {
        this.isActivated = true;
        this.currentTileType = tileType;
    }

    deactivate(): void {
        this.isActivated = false;
        this.currentTileType = TileType.Grass;
        this.cancelTeleporterPlacement(); // Nouveau
    }

    changeTile(xPosition: number, yPosition: number, tileType: TileType): void {
        const newTile: Tile = structuredClone(this.boardManager.editedBoardGame().tiles[xPosition][yPosition]);
        newTile.type = tileType;
        this.boardManager.updateTile(xPosition, yPosition, newTile);
    }

    resetTile(xPosition: number, yPosition: number): void {
        const tile = this.boardManager.editedBoardGame().tiles[xPosition][yPosition];

        // Si c'est un téléporteur, supprimer la paire complète
        if (tile.type === TileType.Teleportation && tile.teleportPairId) {
            this.removeTeleporterPair(tile.teleportPairId);
        }

        this.deactivate();
        this.changeTile(xPosition, yPosition, TileType.Grass);
    }

    toggleDoorState(xPosition: number, yPosition: number): void {
        const newTile: Tile = structuredClone(this.boardManager.editedBoardGame().tiles[xPosition][yPosition]);
        newTile.doorState = !newTile.doorState;
        this.boardManager.updateTile(xPosition, yPosition, newTile);
    }

    // Nouvelles méthodes pour téléporteurs
    placeTeleporter(xPosition: number, yPosition: number): void {
        const currentTile = this.boardManager.editedBoardGame().tiles[xPosition][yPosition];

        // Ne pas placer sur une tuile avec item ou sur un téléporteur existant
        if (currentTile.containedItem || currentTile.type === TileType.Teleportation) {
            return;
        }

        if (!this.isWaitingForSecondTeleporter) {
            // Première tuile
            this.firstTeleporterPosition = { x: xPosition, y: yPosition };
            this.isWaitingForSecondTeleporter = true;

            const pairId = `tp-${this.nextTeleporterPairId}`;
            const newTile: Tile = {
                ...currentTile,
                type: TileType.Teleportation,
                teleportPairId: pairId,
            };
            this.boardManager.updateTile(xPosition, yPosition, newTile);
        } else {
            // Deuxième tuile
            if (!this.firstTeleporterPosition) {
                return;
            }

            if (xPosition === this.firstTeleporterPosition.x && yPosition === this.firstTeleporterPosition.y) {
                // Même position, annuler
                this.cancelTeleporterPlacement();
                return;
            }

            const pairId = `tp-${this.nextTeleporterPairId}`;
            const secondPosition: Position = { x: xPosition, y: yPosition };

            // Mettre à jour la première tuile avec la cible
            const firstTile: Tile = {
                ...this.boardManager.editedBoardGame().tiles[this.firstTeleporterPosition.x][this.firstTeleporterPosition.y],
                teleportTarget: secondPosition,
            };
            this.boardManager.updateTile(this.firstTeleporterPosition.x, this.firstTeleporterPosition.y, firstTile);

            // Placer la deuxième tuile
            const secondTile: Tile = {
                ...currentTile,
                type: TileType.Teleportation,
                teleportPairId: pairId,
                teleportTarget: this.firstTeleporterPosition,
            };
            this.boardManager.updateTile(xPosition, yPosition, secondTile);

            // Réinitialiser l'état
            this.nextTeleporterPairId++;
            this.isWaitingForSecondTeleporter = false;
            this.firstTeleporterPosition = undefined;
        }
    }

    cancelTeleporterPlacement(): void {
        if (this.isWaitingForSecondTeleporter && this.firstTeleporterPosition) {
            // Supprimer la première tuile placée
            this.changeTile(this.firstTeleporterPosition.x, this.firstTeleporterPosition.y, TileType.Grass);
            this.isWaitingForSecondTeleporter = false;
            this.firstTeleporterPosition = undefined;
        }
    }

    removeTeleporterPair(pairId: string): void {
        const tiles = this.boardManager.editedBoardGame().tiles;

        // Trouver et supprimer les deux tuiles de la paire
        for (let i = 0; i < tiles.length; i++) {
            for (let j = 0; j < tiles[i].length; j++) {
                const tile = tiles[i][j];
                if (tile.teleportPairId === pairId) {
                    this.changeTile(i, j, TileType.Grass);
                }
            }
        }
    }
}
