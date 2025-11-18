import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { TileType } from '@common/enums/tile-type';
import { Position } from '@common/position';
import { Tile } from '@common/tile';

export interface TeleportPair {
    pairId: string;
    positionA: Position | null;
    positionB: Position | null;
}

@Injectable({
    providedIn: 'root',
})
export class TeleportationManagerService {
    private boardManager: BoardGameManagerService = inject(BoardGameManagerService);

    // État du placement de téléportation en cours
    isPlacingTeleport: WritableSignal<boolean> = signal(false);
    firstTeleportPosition: WritableSignal<Position | null> = signal(null);
    currentPairId: WritableSignal<string> = signal('');
    nextPairNumber: number = 1;

    startTeleportPlacement(): void {
        this.isPlacingTeleport.set(true);
        this.currentPairId.set(this.generatePairId());
        this.firstTeleportPosition.set(null);
    }

    placeFirstTeleport(position: Position): void {
        const newTile: Tile = structuredClone(this.boardManager.editedBoardGame().tiles[position.x][position.y]);

        // Vérifier que la tuile est de base (Grass)
        if (newTile.type !== TileType.Grass) {
            return;
        }

        newTile.type = TileType.Teleportation;
        newTile.teleportPairId = this.currentPairId();

        this.boardManager.updateTile(position.x, position.y, newTile);
        this.firstTeleportPosition.set(position);
    }

    placeSecondTeleport(position: Position): void {
        const firstPos = this.firstTeleportPosition();

        if (!firstPos) return;

        // Vérifier qu'on ne place pas sur la même position
        if (firstPos.x === position.x && firstPos.y === position.y) {
            return;
        }

        const newTile: Tile = structuredClone(this.boardManager.editedBoardGame().tiles[position.x][position.y]);

        // Vérifier que la tuile est de base (Grass)
        if (newTile.type !== TileType.Grass) {
            this.cancelTeleportPlacement();
            return;
        }

        newTile.type = TileType.Teleportation;
        newTile.teleportPairId = this.currentPairId();
        newTile.teleportDestination = firstPos;

        // Mettre à jour la deuxième tuile
        this.boardManager.updateTile(position.x, position.y, newTile);

        // Mettre à jour la première tuile avec la destination
        const firstTile: Tile = structuredClone(this.boardManager.editedBoardGame().tiles[firstPos.x][firstPos.y]);
        firstTile.teleportDestination = position;
        this.boardManager.updateTile(firstPos.x, firstPos.y, firstTile);

        // Réinitialiser l'état
        this.completeTeleportPlacement();
    }

    cancelTeleportPlacement(): void {
        const firstPos = this.firstTeleportPosition();

        if (firstPos) {
            // Restaurer la première tuile en Grass
            const newTile: Tile = structuredClone(this.boardManager.editedBoardGame().tiles[firstPos.x][firstPos.y]);
            newTile.type = TileType.Grass;
            newTile.teleportPairId = undefined;
            newTile.teleportDestination = undefined;

            this.boardManager.updateTile(firstPos.x, firstPos.y, newTile);
        }

        this.isPlacingTeleport.set(false);
        this.firstTeleportPosition.set(null);
        this.currentPairId.set('');
    }

    completeTeleportPlacement(): void {
        this.isPlacingTeleport.set(false);
        this.firstTeleportPosition.set(null);
        this.currentPairId.set('');
        this.nextPairNumber++;
    }

    removeTeleportPair(position: Position): void {
        const tile = this.boardManager.editedBoardGame().tiles[position.x][position.y];

        if (tile.type !== TileType.Teleportation || !tile.teleportPairId) {
            return;
        }

        const pairId = tile.teleportPairId;
        const destination = tile.teleportDestination;

        // Supprimer la première tuile
        const newTile: Tile = structuredClone(tile);
        newTile.type = TileType.Grass;
        newTile.teleportPairId = undefined;
        newTile.teleportDestination = undefined;
        this.boardManager.updateTile(position.x, position.y, newTile);

        // Supprimer la deuxième tuile si elle existe
        if (destination) {
            const destTile: Tile = structuredClone(this.boardManager.editedBoardGame().tiles[destination.x][destination.y]);

            if (destTile.type === TileType.Teleportation && destTile.teleportPairId === pairId) {
                destTile.type = TileType.Grass;
                destTile.teleportPairId = undefined;
                destTile.teleportDestination = undefined;
                this.boardManager.updateTile(destination.x, destination.y, destTile);
            }
        }
    }

    private generatePairId(): string {
        return `teleport-pair-${this.nextPairNumber}`;
    }

    getTeleportPairColor(pairId: string): string {
        // Générer une couleur basée sur l'ID de la paire
        const colors = [
            '#FF6B6B', // Rouge
            '#4ECDC4', // Cyan
            '#45B7D1', // Bleu
            '#FFA07A', // Saumon
            '#98D8C8', // Vert menthe
            '#F7DC6F', // Jaune
            '#BB8FCE', // Violet
            '#85C1E2', // Bleu clair
        ];

        const pairNumber = parseInt(pairId.split('-').pop() || '1');
        return colors[(pairNumber - 1) % colors.length];
    }
}
