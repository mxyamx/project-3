import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { BoardGameGraph, BoardGameNode } from '@app/classes/board-game-graph/board-game-graph';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { CanvasManagerService } from '@app/services/canvas-manager/canvas-manager.service';
import { PlayerState } from '@common/enums/player-state';
import { Player } from '@common/player';
import { Tile } from '@common/tile';

@Injectable({
    providedIn: 'root',
})
export class PlayerStateManagerService {
    playerState: WritableSignal<PlayerState> = signal(PlayerState.WaitingForTurn);
    reachableNodes: WritableSignal<BoardGameNode[]> = signal([]);

    private boardGameManager: BoardGameManagerService = inject(BoardGameManagerService);
    private canvasManager: CanvasManagerService = inject(CanvasManagerService);

    constructor() {
        this.reachableNodes.set([]);
    }

    changeState(newState: PlayerState, chosenPlayer: Player): void {
        this.canvasManager.clearCanvas();
        switch (newState) {
            case PlayerState.WaitingForAction:
                this.handleWaitingForAction(chosenPlayer);
                break;
            case PlayerState.WaitingForTurn:
                this.handleWaitingForTurn();
                break;
            case PlayerState.Moving:
                this.handleMoving();
                break;
            case PlayerState.SpectatingFight:
                this.handleSpectatingFight();
                break;
            case PlayerState.Attacking:
                this.handleAttacking();
                break;
            case PlayerState.Defending:
                this.handleDefending();
                break;
            case PlayerState.Transitioning:
                this.handleTransitionState();
                break;
            case PlayerState.EndGame:
                this.handleEndGameState();
                break;
            case PlayerState.DroppingItem:
                this.handleDroppingItem();
                break;
            case PlayerState.Teleporting:
                this.handleTeleporting();
                break;
            case PlayerState.PickingItem:
                this.handlePickingItem();
                break;
            case PlayerState.OpeningDoor:
                this.handleOpeningDoor();
                break;
            default:
                this.handleDefaultState();
        }
    }

    private handleWaitingForAction(chosenPlayer: Player): void {
        const newTiles: Tile[][] = structuredClone(this.boardGameManager.playingBoardGame().tiles);
        const newGraph: BoardGameGraph = new BoardGameGraph(newTiles);
        const position = chosenPlayer.position ?? { x: 0, y: 0 };
        const reachableNodes: BoardGameNode[] = newGraph.findReachableNodes(position, chosenPlayer.attributes.speedValue);

        this.reachableNodes.set(reachableNodes);

        for (const reachableNode of reachableNodes) {
            newTiles[reachableNode.tilePosition.x][reachableNode.tilePosition.y].reachable = true;
        }

        this.boardGameManager.updateTiles(newTiles, true);
        this.playerState.set(PlayerState.WaitingForAction);
    }

    private handleWaitingForTurn(): void {
        const newTiles: Tile[][] = structuredClone(this.boardGameManager.playingBoardGame().tiles);
        for (const row of newTiles) {
            for (const tile of row) {
                tile.reachable = false;
            }
        }
        this.boardGameManager.updateTiles(newTiles, true);
        this.playerState.set(PlayerState.WaitingForTurn);
    }

    private handleMoving(): void {
        this.resetTileDistances();
        this.playerState.set(PlayerState.Moving);
    }

    private handleSpectatingFight(): void {
        this.resetTileDistances();
        this.playerState.set(PlayerState.SpectatingFight);
    }

    private handleAttacking(): void {
        this.resetTileDistances();
        this.playerState.set(PlayerState.Attacking);
    }

    private handleDefending(): void {
        this.resetTileDistances();
        this.playerState.set(PlayerState.Defending);
    }

    private handleDefaultState(): void {
        this.resetTileDistances();
        this.playerState.set(PlayerState.WaitingForTurn);
    }

    private handleTransitionState(): void {
        this.resetTileDistances();
        this.playerState.set(PlayerState.Transitioning);
    }

    private handleEndGameState(): void {
        this.resetTileDistances();
        this.playerState.set(PlayerState.EndGame);
    }
    private handleDroppingItem(): void {
        this.resetTileDistances();
        this.playerState.set(PlayerState.DroppingItem);
    }
    private handleTeleporting(): void {
        this.resetTileDistances();
        this.playerState.set(PlayerState.Teleporting);
    }
    private handlePickingItem(): void {
        this.resetTileDistances();
        this.playerState.set(PlayerState.PickingItem);
    }
    private handleOpeningDoor(): void {
        this.resetTileDistances();
        this.playerState.set(PlayerState.OpeningDoor);
    }

    private resetTileDistances(): void {
        const newTiles: Tile[][] = structuredClone(this.boardGameManager.playingBoardGame().tiles);

        for (const row of newTiles) {
            for (const tile of row) {
                tile.reachable = false;
                tile.shortestDistanceFromPosition = [];
            }
        }
        this.boardGameManager.updateTiles(newTiles, true);
    }
}
