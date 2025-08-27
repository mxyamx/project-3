import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { BoardGame } from '@common/board-game';
import { PlayerState } from '@common/enums/player-state';
import { SocketClientEventNames, SocketServerEventNames } from '@common/enums/socket-events-names';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';
import { EventEmitter } from 'events';

class SignalValue<T> {
    private value: T;
    private eventName: string;

    constructor(
        initialValue: T,
        eventName: string,
        private emitter: EventEmitter,
    ) {
        this.value = initialValue;
        this.eventName = eventName;
    }

    set(newValue: T): void {
        this.value = newValue;
        this.emitter.emit(this.eventName, newValue);
    }

    get(): T {
        return this.value;
    }
}

export class VpGameSessionManager extends EventEmitter {
    chosenPlayer: SignalValue<VirtualPlayer>;
    listOfPlayers: SignalValue<Player[]>;
    activePlayer: SignalValue<Player>;
    gameId: SignalValue<string>;
    attackingPlayer: SignalValue<Player>;
    defendingPlayer: SignalValue<Player>;
    nbOfActions: SignalValue<number>;
    nbOfEvasions: SignalValue<number>;
    canEndTurn: SignalValue<boolean>;
    playerState: SignalValue<PlayerState>;
    boardGame: SignalValue<BoardGame>;
    canStartFight: SignalValue<boolean>;
    canExecuteAttack: SignalValue<boolean>;
    canEscape: SignalValue<boolean>;
    canToggleDoor: SignalValue<boolean>;
    canPickUpItem: SignalValue<boolean>;
    canDropItem: SignalValue<boolean>;
    readonly initialNbOfEvasions: number = 2;
    readonly initialNbOfActions: number = 1;

    constructor(
        private vpSocket: VpSocketManager,
        private vpState: VpState,
        config: {
            initialPlayer: VirtualPlayer;
            initialGameId: string;
            initialBoardGame: BoardGame;
            initialListOfPlayers: Player[];
        },
    ) {
        super();
        this.chosenPlayer = new SignalValue(config.initialPlayer, 'chosenPlayerChanged', this);
        this.gameId = new SignalValue(config.initialGameId, 'gameIdChanged', this);
        this.boardGame = new SignalValue(config.initialBoardGame, 'boardGameChanged', this);
        this.listOfPlayers = new SignalValue(config.initialListOfPlayers, 'listOfPlayersChanged', this);
        this.activePlayer = new SignalValue(config.initialPlayer, 'activePlayerChanged', this);
        this.attackingPlayer = new SignalValue(config.initialPlayer, 'attackingPlayerChanged', this);
        this.defendingPlayer = new SignalValue(config.initialPlayer, 'defendingPlayerChanged', this);
        this.nbOfActions = new SignalValue(1, 'nbOfActionsChanged', this);
        this.nbOfEvasions = new SignalValue(2, 'nbOfEvasionsChanged', this);
        this.canEndTurn = new SignalValue(true, 'canEndTurnChanged', this);
        this.playerState = new SignalValue(PlayerState.WaitingForTurn, 'playerStateChanged', this);
        this.canStartFight = new SignalValue(true, 'canStartFightChanged', this);
        this.canExecuteAttack = new SignalValue(true, 'canExecuteAttackChanged', this);
        this.canEscape = new SignalValue(true, 'canEscapeChanged', this);
        this.canToggleDoor = new SignalValue(true, 'canToggleDoorChanged', this);
        this.canPickUpItem = new SignalValue(true, 'canPickUpItemChanged', this);
        this.canDropItem = new SignalValue(true, 'canDropItemChanged', this);
    }

    updateGameState(gameState: dataForm.GetGameStateRes): void {
        this.boardGame.set(gameState.boardGame);
        this.listOfPlayers.set(gameState.listOfPlayers);
        this.activePlayer.set(gameState.activePlayer);
        this.refreshChosenPlayer();
        this.emit('gameStateUpdated', gameState);
    }

    movePlayer(positions: Position[]): void {
        if (this.playerState.get() !== PlayerState.WaitingForAction) return;
        this.changeState(PlayerState.Moving);
        const data: dataForm.MoveReq = {
            gameCode: this.gameId.get(),
            path: positions,
            isMovingToItem: this.vpState.isMovingToItem,
        };
        this.vpSocket.emit(SocketServerEventNames.Move, data);
    }

    startAttack(targetPosition: Position): void {
        if (this.playerState.get() !== PlayerState.WaitingForAction) return;
        if (!this.canStartFight.get()) return;
        this.canStartFight.set(false);
        const data: dataForm.StartFightReq = {
            gameCode: this.gameId.get(),
            targetPlayerPosition: targetPosition,
        };
        this.vpSocket.emit(SocketServerEventNames.StartFight, data);
    }

    toggleDoorState(doorPosition: Position): void {
        if (this.playerState.get() !== PlayerState.WaitingForAction) return;
        if (!this.canToggleDoor.get()) return;
        this.canToggleDoor.set(false);
        const data: dataForm.ToggleDoorStateReq = {
            gameCode: this.gameId.get(),
            doorPosition,
        };
        this.vpSocket.emit(SocketServerEventNames.ToggleDoorState, data);
    }

    attackPlayer(): void {
        if (this.playerState.get() !== PlayerState.Attacking) return;
        if (!this.canExecuteAttack.get()) return;
        if (this.defendingPlayer.get().attributes.healthValue === 0) return;

        this.canExecuteAttack.set(false);
        const data: dataForm.ExecuteAttackReq = {
            gameCode: this.gameId.get(),
        };
        this.vpSocket.emit(SocketServerEventNames.ExecuteAttack, data);
    }

    attemptEscape(): void {
        if (this.playerState.get() !== PlayerState.Attacking) return;
        if (!this.canEscape.get()) return;
        this.canEscape.set(false);
        if (this.defendingPlayer.get().attributes.healthValue === 0) return;

        const data: dataForm.EscapeAttemptReq = {
            gameCode: this.gameId.get(),
        };
        this.vpSocket.emit(SocketServerEventNames.AttemptEscape, data);
    }

    endTurn(): void {
        if (!this.canEndTurn.get()) return;

        const data: dataForm.EndTurnReq = {
            gameCode: this.gameId.get(),
        };

        this.vpSocket.emit(SocketClientEventNames.EndTurn, data);
        this.changeState(PlayerState.Transitioning);
        this.canEndTurn.set(false);
    }

    shouldChangeTurn(): boolean {
        if (this.chosenPlayer.get().attributes.speedValue === 0) {
            if (this.nbOfActions.get() === 0) {
                return true;
            }
        }
        return false;
    }

    changeState(newState: PlayerState): void {
        this.playerState.set(newState);
    }

    pickUpItem(): void {
        if (this.playerState.get() !== PlayerState.Moving) return;
        if (!this.canPickUpItem.get()) return;
        const data: dataForm.PickUpItemReq = {
            gameCode: this.gameId.get(),
            player: this.chosenPlayer.get(),
        };

        this.vpSocket.emit(SocketServerEventNames.PickUpItem, data);
        this.canPickUpItem.set(false);
    }

    dropItem(item: Item): void {
        if (this.playerState.get() !== PlayerState.DroppingItem) return;
        if (!this.canDropItem.get()) return;
        const data: dataForm.DropItemReq = {
            gameCode: this.gameId.get(),
            player: this.chosenPlayer.get(),
            item,
        };

        this.vpSocket.emit(SocketServerEventNames.DropItem, data);
        this.canDropItem.set(false);
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

    updateCanPickUpItem(newValue: boolean): void {
        this.canPickUpItem.set(newValue);
    }

    updateCanDropItem(newValue: boolean): void {
        this.canDropItem.set(newValue);
    }

    private refreshChosenPlayer(): void {
        const newPlayer = this.listOfPlayers.get().find((player: Player) => player.name === this.chosenPlayer.get().name);
        if (newPlayer && newPlayer.virtualPlayer) {
            this.chosenPlayer.set(newPlayer as VirtualPlayer);
        }
    }
}
