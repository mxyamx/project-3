import { Injectable, inject } from '@angular/core';
import { TrapPopupComponent } from '@app/components/trap-popup/trap-popup.component';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerStateManagerService } from '@app/services/player-state-manager/player-state-manager.service';
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
    trapPopupComponent?: TrapPopupComponent;

    private gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    private socketManager: SocketClientService = inject(SocketClientService);
    private playerStateManager: PlayerStateManagerService = inject(PlayerStateManagerService);

    configureBaseSocket(): void {
        this.handleMovePlayer();
        this.handleMovementOver();
        this.handleToggleDoorState();
        this.handleTeleportPlayer();
        this.handleTrapEncountered();
        this.handleTrapResolved();
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
            this.gameSessionManager.updateChosenPlayer(data.activePlayer);

            if (this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.activePlayer().name) {
                this.gameSessionManager.changeState(PlayerState.WaitingForAction);
                if (this.gameSessionManager.shouldChangeTurn()) {
                    this.gameSessionManager.endTurn();
                }
            }
        });
    }

    private handleTeleportPlayer(): void {
        this.socketManager.on(SocketClientEventNames.Teleport, (data: dataForm.TeleportPlayerRes) => {
            if (!data.successful) {
                return;
            }
            this.gameSessionManager.updatePlayersInfos(data.listOfPlayers, data.activePlayer);
            this.gameSessionManager.updateBoardGame(data.boardGame);
            // REMOVED: this.gameSessionManager.updateChosenPlayer(data.activePlayer);

            if (this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.activePlayer().name) {
                this.gameSessionManager.changeState(PlayerState.WaitingForAction);
            }
        });
    }

    private ctfIsOver(): boolean {
        return this.gameSessionManager.gameMode === GameMode.CTF && this.activePlayerHasFlag() && this.isAtStartPosition();
    }

    private activePlayerHasFlag(): boolean {
        return this.gameSessionManager.activePlayer()?.inventory?.some((item: Item) => item.type === ItemType.Flag) ?? false;
    }

    private isAtStartPosition(): boolean {
        const startPosition = this.gameSessionManager.activePlayer().startPosition;
        const currentPosition = this.gameSessionManager.activePlayer().position;
        return startPosition?.x === currentPosition?.x && startPosition?.y === currentPosition?.y;
    }

    private handleTrapEncountered(): void {
        this.socketManager.on(SocketClientEventNames.TrapEncountered, (data: dataForm.TrapEncounteredData) => {
            if (!data.successful) return;

            // FIX #1: Only show popup for the active player
            const isActivePlayer = this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.activePlayer().name;

            if (isActivePlayer) {
                this.gameSessionManager.changeState(PlayerState.InteractingWithTrap);

                if (this.trapPopupComponent) {
                    this.trapPopupComponent.showPopup(data.playerMovementPoints);
                }
            }
        });
    }

    private handleTrapResolved(): void {
        this.socketManager.on(SocketClientEventNames.TrapResolved, (data: dataForm.TrapResolvedData) => {
            if (!data.successful) return;

            this.gameSessionManager.updatePlayersInfos(data.listOfPlayers, data.activePlayer);
            this.gameSessionManager.updateBoardGame(data.boardGame);

            const isActivePlayer = this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.activePlayer().name;

            if (isActivePlayer) {
                this.gameSessionManager.updateChosenPlayer(data.activePlayer);
                this.gameSessionManager.changeState(PlayerState.WaitingForAction);
                this.playerStateManager.changeState(PlayerState.WaitingForAction, this.gameSessionManager.chosenPlayer());

                // Use the SAME pattern as all other actions
                if (this.gameSessionManager.shouldChangeTurn()) {
                    this.gameSessionManager.endTurn();
                }
            } else {
                this.gameSessionManager.changeState(PlayerState.WaitingForTurn);
            }
        });
    }
}
