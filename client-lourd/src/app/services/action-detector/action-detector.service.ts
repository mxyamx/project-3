import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { ActionType } from '@common/enums/action-type';
import { GameMode } from '@common/enums/game-mode';
import { TileType } from '@common/enums/tile-type';
import { Player } from '@common/player';
import { Position } from '@common/position';
import { Tile } from '@common/tile';

@Injectable({
    providedIn: 'root',
})
export class ActionDetectorService {
    actionActivated: WritableSignal<boolean> = signal(false);

    private boardGameManager: BoardGameManagerService = inject(BoardGameManagerService);

    activateAction(): void {
        this.actionActivated.set(true);
    }

    deactivateAction(): void {
        const tiles: Tile[][] = this.boardGameManager.playingBoardGame().tiles;

        this.clearActionState();
        this.actionActivated.set(false);
        this.boardGameManager.updateTiles(tiles, true);
    }

    setActionStatus(activePlayer: Player): void {
        const neighbors: Tile[] = this.getNeighbors(activePlayer.position ?? { x: 0, y: 0 });
        const tiles: Tile[][] = this.boardGameManager.playingBoardGame().tiles;

        this.clearActionState();

        neighbors.forEach((tile: Tile) => {
            if (tile.containedPlayer) {
                if (!this.areInSameTeam(activePlayer, tile.containedPlayer))
                    tile.availableAction = {
                        type: ActionType.AttackPlayer,
                        target: tile.position ?? { x: 0, y: 0 },
                        description: 'Attaquer le joueur',
                    };
            } else if (tile.type === TileType.Door) {
                if (tile.doorState) {
                    tile.availableAction = { type: ActionType.CloseDoor, target: tile.position ?? { x: 0, y: 0 }, description: 'Fermer la porte' };
                } else {
                    tile.availableAction = { type: ActionType.OpenDoor, target: tile.position ?? { x: 0, y: 0 }, description: 'Ouvrir la porte' };
                }
            }
        });

        this.boardGameManager.updateTiles(tiles, true);
    }

    checkAvailableAction(chosenPlayer: Player): boolean {
        let result = false;
        const neighbors: Tile[] = this.getNeighbors(chosenPlayer.position ?? { x: 0, y: 0 });

        neighbors.forEach((tile: Tile) => {
            if ((tile.containedPlayer && !this.areInSameTeam(chosenPlayer, tile.containedPlayer)) || tile.type === TileType.Door) {
                result = true;
            }
        });

        return result;
    }

    private getNeighbors(tilePosition: Position): Tile[] {
        const neighbors: Tile[] = [];
        const boardSize: number = this.boardGameManager.playingBoardGame().size;

        const directions = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
        ];

        for (const { dx, dy } of directions) {
            const newX = tilePosition.x + dx;
            const newY = tilePosition.y + dy;

            if (newX >= 0 && newX < boardSize && newY >= 0 && newY < boardSize) {
                const tile: Tile = this.boardGameManager.playingBoardGame().tiles[newX][newY];
                tile.position = { x: newX, y: newY };
                neighbors.push(tile);
            }
        }

        return neighbors;
    }

    private clearActionState(): void {
        const boardSize: number = this.boardGameManager.playingBoardGame().size;

        for (let i = 0; i < boardSize; ++i) {
            for (let j = 0; j < boardSize; ++j) {
                this.boardGameManager.playingBoardGame().tiles[i][j].availableAction = undefined;
            }
        }
    }

    private areInSameTeam(player1: Player, player2: Player): boolean {
        if (this.boardGameManager.playingBoardGame().gameMode !== GameMode.CTF) {
            return false;
        }
        if (!player1.ctfTeam || !player2.ctfTeam) {
            return false;
        }
        return player1.ctfTeam === player2.ctfTeam;
    }
}
