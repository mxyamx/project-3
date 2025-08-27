/* eslint-disable max-lines */
import { Injectable, Injector, Signal, WritableSignal, inject, signal } from '@angular/core';
import {
    EMPTY_CODE,
    INITIAL_AMOUNT_OF_ACTION,
    INITIAL_AMOUNT_OF_EVASION,
    STANDARD_GAME_CODE,
    STANDARD_PLAYERS,
    TURN_TIME_LIMIT_SEC,
} from '@app/constants/development-constants';
import { ActionDetectorService } from '@app/services/action-detector/action-detector.service';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { FightSystemManagerService } from '@app/services/fight-system-manager/fight-system-manager.service';
import { GameEventService } from '@app/services/game-event/game-event.service';
import { MovementSystemManagerService } from '@app/services/movement-system-manager/movement-system-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { PlayerStateManagerService } from '@app/services/player-state-manager/player-state-manager.service';
import { StatisticsManagerService } from '@app/services/statistics-manager/statistics-manager.service';
import { BoardGame } from '@common/board-game';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { PlayerState } from '@common/enums/player-state';
import { SocketServerEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';

@Injectable({
    providedIn: 'root',
})
export class GameSessionManagerService {
    chosenPlayer: WritableSignal<Player> = signal({
        ...STANDARD_PLAYERS[0],
        victories: STANDARD_PLAYERS[0].victories ?? 0,
    });

    listOfPlayers: WritableSignal<Player[]> = signal(
        STANDARD_PLAYERS.map((player: Player) => ({
            ...player,
            victories: player.victories ?? 0,
        })),
    );
    activePlayer: WritableSignal<Player> = signal({
        ...STANDARD_PLAYERS[0],
        victories: STANDARD_PLAYERS[0].victories ?? 0,
    });
    gameId: WritableSignal<string> = signal(EMPTY_CODE);
    attackingPlayer: WritableSignal<Player> = signal(STANDARD_PLAYERS[0]);
    defendingPlayer: WritableSignal<Player> = signal(STANDARD_PLAYERS[0]);

    nbOfActions: WritableSignal<number> = signal(1);
    nbOfEvasions: WritableSignal<number> = signal(2);

    canEndTurn: WritableSignal<boolean> = signal(true);
    eventHandlerSet: WritableSignal<boolean> = signal(false);
    displayedPlayerList: WritableSignal<Player[]> = signal([]);
    playerState: Signal<PlayerState>;
    actionActivated: Signal<boolean>;
    debugModeStatus: WritableSignal<boolean> = signal(false);

    turnClockValue: WritableSignal<number> = signal(0);
    fightClockValue: WritableSignal<number> = signal(0);

    canTeleport: WritableSignal<boolean> = signal(true);
    canStartFight: WritableSignal<boolean> = signal(true);
    canExecuteAttack: WritableSignal<boolean> = signal(true);
    canEscape: WritableSignal<boolean> = signal(true);
    canToggleDoor: WritableSignal<boolean> = signal(true);
    canPickUpItem: WritableSignal<boolean> = signal(true);
    canDropItem: WritableSignal<boolean> = signal(true);
    canToggleDebugMode: WritableSignal<boolean> = signal(true);

    showDropItemInterface: WritableSignal<boolean> = signal(false);

    largestAmountOfEscape: WritableSignal<number> = signal(0);
    changeDisplayAttackClock: WritableSignal<boolean> = signal(false);

    switchingTurn: boolean = false;

    private boardGameManager: BoardGameManagerService = inject(BoardGameManagerService);
    private socketManager: SocketClientService = inject(SocketClientService);
    private initialized: WritableSignal<boolean> = signal(false);
    private playerStateManager: PlayerStateManagerService = inject(PlayerStateManagerService);
    private actionDetector: ActionDetectorService = inject(ActionDetectorService);
    private fightSystemManager: FightSystemManagerService = inject(FightSystemManagerService);
    private movementSystemManager: MovementSystemManagerService = inject(MovementSystemManagerService);
    private _leavingGame: WritableSignal<boolean> = signal(false);
    private statisticsManager: StatisticsManagerService = inject(StatisticsManagerService);
    private playerSocket: PlayerSocketService = inject(PlayerSocketService);
    private _gameEventService?: GameEventService;

    constructor(private injector: Injector) {
        this.playerState = this.playerStateManager.playerState.asReadonly();
        this.actionActivated = this.actionDetector.actionActivated.asReadonly();
        this.switchingTurn = false;
    }

    get leavingGame$() {
        return this._leavingGame.asReadonly();
    }
    get gameMode(): GameMode {
        return this.boardGameManager.playingBoardGame().gameMode;
    }

    private get gameEventService(): GameEventService {
        if (!this._gameEventService) {
            this._gameEventService = this.injector.get(GameEventService);
        }
        return this._gameEventService;
    }

    updateChangeDisplayAttackClock(newValue: boolean): void {
        this.changeDisplayAttackClock.set(newValue);
    }

    updateLargestAmountOfEscape(newValue: number): void {
        this.largestAmountOfEscape.set(newValue);
    }

    updateCanToggleDebugMode(newValue: boolean): void {
        this.canToggleDebugMode.set(newValue);
    }

    updateCanDropItem(newValue: boolean): void {
        this.canDropItem.set(newValue);
    }

    updateShowDropItemInterface(newValue: boolean): void {
        this.showDropItemInterface.set(newValue);
    }

    updateCanTelePort(newValue: boolean): void {
        this.canTeleport.set(newValue);
    }
    updateCanStartFight(newValue: boolean): void {
        this.canStartFight.set(newValue);
    }
    updateCanExecuteAttack(newValue: boolean): void {
        this.canExecuteAttack.set(newValue);
    }
    updateCanEscape(newValue: boolean): void {
        this.canEscape.set(newValue);
    }
    updateCanToggleDoor(newValue: boolean): void {
        this.canToggleDoor.set(newValue);
    }

    updateGameId(gameId: string): void {
        this.gameId.set(gameId);
    }

    updateChosenPlayer(newPlayer: Player): void {
        this.chosenPlayer.set(newPlayer);
    }

    updateActivePlayer(newPlayer: Player): void {
        this.activePlayer.set(newPlayer);
    }

    updateListOfPlayers(newPlayers: Player[]): void {
        this.listOfPlayers.set(newPlayers);
        this.updateDisplayedPlayerList(structuredClone(newPlayers));
        if (this.listOfPlayers().length < 2) {
            this.changeState(PlayerState.EndGame);
        }
    }

    isCurrentPlayer(player: Player): boolean {
        return this.chosenPlayer().name === player.name;
    }

    updateBoardGame(newBoard: BoardGame): void {
        this.boardGameManager.updateDisplayedBoardGame(newBoard, true);
    }

    decrementAmountOfAction(): void {
        let oldAmount: number = this.nbOfActions();
        this.nbOfActions.set(--oldAmount);
    }

    incrementAmountOfAction(): void {
        let oldAmount: number = this.nbOfActions();
        this.nbOfActions.set(++oldAmount);
    }

    decrementAmountOfEvasion(): void {
        let oldAmount: number = this.nbOfEvasions();
        this.nbOfEvasions.set(--oldAmount);
    }

    updateAttackingPlayer(attackingPlayer: Player): void {
        this.attackingPlayer.set(attackingPlayer);
    }

    updateDefendingPlayer(defendingPlayer: Player): void {
        this.defendingPlayer.set(defendingPlayer);
    }

    updateNbOfActions(newValue: number): void {
        this.nbOfActions.set(newValue);
    }

    updateNbOfEvasions(newValue: number): void {
        this.nbOfEvasions.set(newValue);
    }

    updateCanEndTurn(newValue: boolean): void {
        this.canEndTurn.set(newValue);
    }

    updateEventHandlerSet(newValue: boolean): void {
        this.eventHandlerSet.set(newValue);
    }
    updateCanPickUpItem(newValue: boolean): void {
        this.canPickUpItem.set(newValue);
    }
    toggleDebugMode(): void {
        if (!this.chosenPlayer().organizer) {
            return;
        }
        if (!this.canToggleDebugMode()) {
            return;
        }
        this.actionDetector.deactivateAction();
        const data: dataForm.ToggleDebugModeReq = {
            gameCode: this.gameId(),
        };
        this.socketManager.send(SocketServerEventNames.ToggleDebugMode, data);
        this.updateCanToggleDebugMode(false);
        this.gameEventService.showToggleDebugModeNotification();
    }

    init(): void {
        this.nbOfActions.set(INITIAL_AMOUNT_OF_ACTION);
        this.nbOfEvasions.set(INITIAL_AMOUNT_OF_EVASION);
        this.canEndTurn.set(true);
        this.listOfPlayers().forEach((player) => {
            this.statisticsManager.initializePlayerStatistics(player);
        });
        if (this.chosenPlayer().name === this.activePlayer().name) {
            this.changeState(PlayerState.WaitingForAction);
        } else {
            this.changeState(PlayerState.WaitingForTurn);
        }
    }
    updatePlayersInfos(listOfPlayers: Player[], activePlayer: Player): void {
        this.updateListOfPlayers(listOfPlayers);
        this.refreshChosenPlayer();
        this.updateActivePlayer(activePlayer);
    }

    movePlayer(positions: Position[]): void {
        if (this.playerState() === PlayerState.WaitingForAction) {
            this.changeState(PlayerState.Moving);
            this.movementSystemManager.movePlayer(positions, this.gameId());
        }
    }

    startAttack(targetPosition: Position): void {
        if (this.playerState() !== PlayerState.WaitingForAction) return;
        if (!this.canStartFight()) return;

        this.updateCanStartFight(false);
        this.changeState(PlayerState.Attacking);
        this.fightSystemManager.startAttack(targetPosition, this.gameId());
    }

    toggleDoorState(doorPosition: Position): void {
        if (this.playerState() !== PlayerState.WaitingForAction) return;
        if (!this.canToggleDoor()) return;

        this.updateCanToggleDoor(false);
        this.changeState(PlayerState.OpeningDoor);
        this.movementSystemManager.toggleDoorState(doorPosition, this.gameId());
    }

    attackPlayer(): void {
        const playerNames = [this.defendingPlayer().name, this.attackingPlayer().name];
        this.playerSocket.emitJoinCombatLogRoom(this.gameId(), playerNames);

        if (this.playerState() !== PlayerState.Attacking) return;
        if (!this.canExecuteAttack()) return;
        if (this.defendingPlayer().attributes.healthValue === 0) return;

        this.updateCanExecuteAttack(false);
        this.updateCanEscape(false);
        this.fightSystemManager.attackPlayer(this.gameId());
    }

    attemptEscape(): void {
        if (this.playerState() !== PlayerState.Attacking) return;
        if (!this.canEscape()) return;

        if (this.defendingPlayer().attributes.healthValue === 0) return;

        this.updateCanEscape(false);
        this.updateCanExecuteAttack(false);
        this.fightSystemManager.attemptEscape(this.gameId());
    }

    endTurn(): void {
        if (this.playerState() !== PlayerState.WaitingForAction) return;
        if (!this.canEndTurn()) return;

        const data: dataForm.EndTurnReq = {
            gameCode: this.gameId(),
        };

        this.socketManager.send(SocketServerEventNames.EndTurn, data);
        this.changeState(PlayerState.Transitioning);
        this.canEndTurn.set(false);
    }

    shouldChangeTurn(): boolean {
        if (this.playerState() !== PlayerState.WaitingForAction) return false;
        if (this.turnClockValue() === TURN_TIME_LIMIT_SEC) return true;
        if (this.chosenPlayer().attributes.speedValue === 0 || this.playerStateManager.reachableNodes().length === 0) {
            if (!this.actionDetector.checkAvailableAction(this.chosenPlayer())) {
                return true;
            }
            if (this.nbOfActions() === 0) {
                return true;
            }
        }
        return false;
    }
    changeState(newState: PlayerState): void {
        this.actionDetector.deactivateAction();
        this.playerStateManager.changeState(newState, this.chosenPlayer());
    }
    setActionStatus(): void {
        this.actionDetector.setActionStatus(this.activePlayer());
    }

    deactivateAction(): void {
        this.actionDetector.deactivateAction();
    }

    activateAction(): void {
        this.actionDetector.activateAction();
    }

    leaveGame(): void {
        this.changeState(PlayerState.EndGame);
        this.resetSignals();
        this._leavingGame.set(true);
        this.gameId.set(EMPTY_CODE);

        if (this.socketManager.isSocketAlive()) this.socketManager.disconnect();
    }

    updateDisplayedList(newList: Player[]): void {
        this.displayedPlayerList.set(newList);
    }

    updateDebugMode(newValue: boolean): void {
        this.debugModeStatus.set(newValue);
    }

    teleportPlayer(newPosition: Position): void {
        if (this.playerState() !== PlayerState.WaitingForAction) return;
        if (!this.debugModeStatus()) return;

        if (this.chosenPlayer.name !== this.activePlayer.name) return;
        const containedItem: Item | undefined = this.boardGameManager.playingBoardGame().tiles[newPosition.x][newPosition.y].containedItem;

        if (containedItem) {
            return;
        }
        if (this.boardGameManager.playingBoardGame().tiles[newPosition.x][newPosition.y].containedPlayer) {
            return;
        }
        const tile = this.boardGameManager.playingBoardGame().tiles[newPosition.x][newPosition.y];
        if (tile.type === TileType.Wall) return;
        if (tile.type === TileType.Door && !tile.doorState) return;

        const playerPosition = this.chosenPlayer().position;

        if (!this.canTeleport()) return;
        this.updateCanTelePort(false);
        this.changeState(PlayerState.Teleporting);
        this.movementSystemManager.teleportPlayer(playerPosition ?? { x: 0, y: 0 }, newPosition, this.gameId());
    }

    updateTurnClockValue(newValue: number): void {
        this.turnClockValue.set(newValue);
    }

    updateFightClockValue(newValue: number): void {
        this.fightClockValue.set(newValue);
    }

    validItemPresent(position: Position): boolean {
        const item = this.boardGameManager.playingBoardGame().tiles[position.x][position.y].containedItem;
        if (!item) return false;

        if (item.type === ItemType.StartingPoint || item.type === ItemType.RandomItem) return false;

        return true;
    }

    pickUpItem(): void {
        if (this.playerState() !== PlayerState.Moving) return;
        if (!this.canPickUpItem()) return;
        const data: dataForm.PickUpItemReq = {
            gameCode: this.gameId(),
            player: this.chosenPlayer(),
        };

        this.canPickUpItem.set(false);
        this.changeState(PlayerState.PickingItem);
        this.socketManager.send(SocketServerEventNames.PickUpItem, data);
    }

    dropItem(item: Item): void {
        if (this.playerState() !== PlayerState.DroppingItem) return;
        if (!this.canDropItem()) return;
        const data: dataForm.DropItemReq = {
            gameCode: this.gameId(),
            player: this.chosenPlayer(),
            item,
        };

        this.socketManager.send(SocketServerEventNames.DropItem, data);
        this.canDropItem.set(false);
    }

    private updateDisplayedPlayerList(newList: Player[]): void {
        const oldList: Player[] = structuredClone(this.displayedPlayerList());
        const newDisplayed: Player[] = newList;

        oldList.forEach((player: Player) => {
            const result = newList.find((player2: Player) => {
                return player.name === player2.name;
            });
            if (!result) {
                player.isNotInGame = true;
                newDisplayed.push(player);
            }
        });

        this.updateDisplayedList(newDisplayed);
    }

    private refreshChosenPlayer(): void {
        const newPlayer: Player =
            this.listOfPlayers().find((player: Player) => {
                return player.name === this.chosenPlayer().name;
            }) ?? STANDARD_PLAYERS[0];
        this.updateChosenPlayer(newPlayer);
    }
    private resetSignals(): void {
        this.eventHandlerSet.set(false);
        this.initialized.set(false);
        this.debugModeStatus.set(false);
        this.nbOfActions.set(INITIAL_AMOUNT_OF_ACTION);
        this.nbOfEvasions.set(INITIAL_AMOUNT_OF_EVASION);
        this.gameId.set(STANDARD_GAME_CODE);
        this.attackingPlayer.set(STANDARD_PLAYERS[0]);
        this.defendingPlayer.set(STANDARD_PLAYERS[0]);

        this.canEndTurn.set(true);
        this.eventHandlerSet.set(false);
        this.displayedPlayerList.set([]);

        this.debugModeStatus.set(false);
        this.turnClockValue.set(0);
        this.fightClockValue.set(0);

        this.canTeleport.set(true);
        this.canStartFight.set(true);
        this.canExecuteAttack.set(true);
        this.canEscape.set(true);
        this.canToggleDoor.set(true);
        this.canPickUpItem.set(true);
        this.canDropItem.set(true);
        this.canToggleDebugMode.set(true);

        this.showDropItemInterface.set(false);
        this.largestAmountOfEscape.set(0);
        this.changeDisplayAttackClock.set(false);
    }
}
