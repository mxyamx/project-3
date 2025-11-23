import { Injectable, inject } from '@angular/core';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { GameEventService } from '@app/services/game-event/game-event.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { PlayerState } from '@common/enums/player-state';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { Item } from '@common/item';
import * as dataForm from '@common/socket-data-forms';

@Injectable({
    providedIn: 'root',
})
export class MovementEventsHandlerService {
    private gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    private socketManager: SocketClientService = inject(SocketClientService);
    private gameEventService: GameEventService = inject(GameEventService);

    configureBaseSocket(): void {
        this.handleMovePlayer();
        this.handleMovementOver();
        this.handleToggleDoorState();
        this.handleTeleportPlayer();
    }

    private handleMovePlayer(): void {
        this.socketManager.on(SocketClientEventNames.MovePlayer, (data: dataForm.MovePlayer) => {
            if (!data.successful) {
                return;
            }
            this.gameSessionManager.updatePlayersInfos(data.listOfPlayers, data.activePlayer);

            if (this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.activePlayer().name) {
                this.gameSessionManager.updateChosenPlayer(data.activePlayer);
            }
            this.gameSessionManager.updateBoardGame(data.boardGame);
        });
    }

    private handleMovementOver(): void {
        this.socketManager.on(SocketClientEventNames.MovementOver, (data: dataForm.StandardRes) => {
            if (!data.successful) {
                return;
            }
            if (this.ctfIsOver()) {
                this.gameSessionManager.changeState(PlayerState.EndGame);
            } else if (this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.activePlayer().name) {
                if (this.gameSessionManager.validItemPresent(this.gameSessionManager.chosenPlayer().position ?? { x: 0, y: 0 })) {
                    this.gameSessionManager.pickUpItem();
                } else {
                    this.gameSessionManager.changeState(PlayerState.WaitingForAction);
                    if (this.gameSessionManager.shouldChangeTurn()) {
                        this.gameSessionManager.endTurn();
                    }
                }
            }
        });
    }

    private handleToggleDoorState(): void {
        this.socketManager.on(SocketClientEventNames.ToggleDoorState, (data: dataForm.ToggleDoorStateRes) => {
            if (!data.successful) {
                return;
            }
            this.gameSessionManager.updatePlayersInfos(data.listOfPlayers, data.activePlayer);

            this.gameSessionManager.updateBoardGame(data.boardGame);

            if (this.gameSessionManager.playerState() === PlayerState.OpeningDoor) {
                this.gameSessionManager.updateChosenPlayer(data.activePlayer);
                this.gameSessionManager.changeState(PlayerState.WaitingForAction);
                if (this.gameSessionManager.shouldChangeTurn()) {
                    this.gameSessionManager.endTurn();
                }
                this.gameEventService.showLogToggleDoorNotification(data);
            }
            this.gameSessionManager.updateCanToggleDoor(true);
        });
    }
    private handleTeleportPlayer(): void {
        this.socketManager.on(SocketClientEventNames.Teleport, (data: dataForm.TeleportPlayerRes) => {
            if (!data.successful) {
                return;
            }

            this.gameSessionManager.updatePlayersInfos(data.listOfPlayers, data.activePlayer);

            if (this.gameSessionManager.playerState() === PlayerState.Teleporting) {
                this.gameSessionManager.updateChosenPlayer(data.activePlayer);
            }
            this.gameSessionManager.updateBoardGame(data.boardGame);

            if (this.gameSessionManager.playerState() === PlayerState.Teleporting) {
                this.gameSessionManager.changeState(PlayerState.WaitingForAction);
            }
            this.gameSessionManager.updateCanTelePort(true);

            if (this.ctfIsOver()) {
                this.gameSessionManager.changeState(PlayerState.EndGame);
            }
        });
    }

    private ctfIsOver(): boolean {
        if (this.gameSessionManager.gameMode !== GameMode.CTF) return false;
        return (
            this.activePlayerHasFlag() &&
            JSON.stringify(this.gameSessionManager.activePlayer().position) === JSON.stringify(this.gameSessionManager.activePlayer().startPosition)
        );
    }

    private activePlayerHasFlag(): boolean {
        const activePlayerInventory = this.gameSessionManager.activePlayer().inventory;
        if (!activePlayerInventory) return false;

        return activePlayerInventory.find((i: Item) => {
            return i.type === ItemType.Flag;
        })
            ? true
            : false;
    }
}
