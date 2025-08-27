import { BaseVpSocketEvent } from '@app/classes/base-vp-socket-event/base-vp-socket-event';
import { VpBehaviorInGame } from '@app/classes/vp-behavior-in-game/vp-behavior-in-game';
import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { FROM_ITEM_NAME_TO_VP_PREFERENCE, ITEM_NAMES } from '@app/constants/objects-constants';
import { GameEventType } from '@common/enums/game-event-type';
import { ItemName } from '@common/enums/item-name';
import { ItemType } from '@common/enums/item-type';
import { SocketClientEventNames, SocketServerEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';
import { GameEvent } from '@common/game-event';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';

export class GameVpSocketEvent extends BaseVpSocketEvent {
    private turnTimeToMove: number;
    private readonly minTurnTime = 3;
    private readonly maxTurnTime = 6;

    constructor(
        private readonly vpBehavior: VpBehaviorInGame,
        deps: { gameId: string; virtualPlayer: VirtualPlayer; vpGameSessionManager: VpGameSessionManager; vpState: VpState },
    ) {
        super(deps.gameId, deps.virtualPlayer, deps.vpGameSessionManager, deps.vpState);
        this.turnTimeToMove = this.generateRandomTurnTime();
    }

    configure(vpSocket: VpSocketManager): void {
        this.handleEndTurn(vpSocket);
        this.registerClock(vpSocket);
        this.handleStartTurn(vpSocket);
        this.handleEndGame(vpSocket);
        this.handleUpdateGame(vpSocket);
        this.handleEscapeAttempt(vpSocket);
        this.handleMovePlayer(vpSocket);
        this.handleMovementOver(vpSocket);
        this.handlePickUpItem(vpSocket);
    }

    protected async handleClock(data: dataForm.ClockRes, vpSocket: VpSocketManager): Promise<void> {
        await Promise.all([this.getGameState(vpSocket), this.getActivePlayer(vpSocket)]);
        if (!this.isVPTurn(vpSocket)) return;
        if (data.turnClockValue === this.turnTimeToMove && data.fightClockValue === 0) {
            this.vpBehavior.handleBehavior(vpSocket, this.gameId, this.activePlayer, this.gameState);
        }
    }

    private generateRandomTurnTime(): number {
        return Math.floor(Math.random() * (this.maxTurnTime - this.minTurnTime + 1)) + this.minTurnTime;
    }

    private handleEndTurn(vpSocket: VpSocketManager): void {
        vpSocket.clientSocket.on(SocketClientEventNames.EndTurn, (data: dataForm.EndTurnRes) => {
            if (!data.successful) return;
            this.turnTimeToMove = this.generateRandomTurnTime();
            this.vpGameSessionManager.updateNbOfActions(this.vpGameSessionManager.initialNbOfActions);
        });
    }

    private handleStartTurn(vpSocket: VpSocketManager): void {
        vpSocket.clientSocket.on(SocketClientEventNames.StartTurn, (data: dataForm.StartTurnRes) => {
            if (!data.successful) return;
            if (this.virtualPlayer.name === this.activePlayer.name) {
                this.showLogTurnNotification(vpSocket);
            }
            this.turnTimeToMove = this.generateRandomTurnTime();
            this.vpGameSessionManager.updateNbOfActions(this.vpGameSessionManager.initialNbOfActions);
        });
    }

    private handleEndGame(vpSocket: VpSocketManager): void {
        vpSocket.clientSocket.on(SocketClientEventNames.EndGame, (data: dataForm.EndGameRes) => {
            if (!data.successful) return;
        });
    }

    private handleUpdateGame(vpSocket: VpSocketManager): void {
        vpSocket.clientSocket.on(SocketClientEventNames.UpdateGame, (data: dataForm.UpdateGamedRes) => {
            if (!data.successful) return;
        });
    }

    private handlePickUpItem(vpSocket: VpSocketManager): void {
        vpSocket.clientSocket.on(SocketClientEventNames.PickUpItem, (data: dataForm.PickUpItemRes) => {
            if (!data.successful) return;

            if (data.activePlayer.name === this.virtualPlayer.name) {
                if (data.pickedItem?.name === ItemName.GameEditor2) {
                    this.vpGameSessionManager.updateNbOfActions(this.vpGameSessionManager.nbOfActions.get() + 1);
                }
                if (data.pickedItem?.name === ItemName.Flag) {
                    this.showLogFlagNotification(vpSocket, data);
                } else {
                    this.showLogItemNotification(vpSocket, data);
                }
            }
        });
    }

    private handleEscapeAttempt(vpSocket: VpSocketManager): void {
        vpSocket.clientSocket.on(SocketClientEventNames.ProcessEscapeAttempt, (data: dataForm.EscapeAttemptRes) => {
            if (!data.successful) return;

            if (data.escapingPlayer.name === this.virtualPlayer.name) {
                if (data.message.includes('escaped')) {
                    this.vpGameSessionManager.updateCanEscape(false);
                    this.vpGameSessionManager.updateCanExecuteAttack(false);
                    this.vpGameSessionManager.updateNbOfEvasions(this.vpGameSessionManager.initialNbOfEvasions);
                } else {
                    if (this.vpGameSessionManager.nbOfEvasions.get() > 0) {
                        this.vpGameSessionManager.updateNbOfEvasions(this.vpGameSessionManager.nbOfEvasions.get() - 1);
                    } else {
                        this.vpGameSessionManager.updateCanExecuteAttack(false);
                    }
                }
            }
        });
    }

    private handleMovePlayer(vpSocket: VpSocketManager): void {
        vpSocket.clientSocket.on(SocketClientEventNames.MovePlayer, async (moveData: dataForm.MovePlayer) => {
            await Promise.all([this.getGameState(vpSocket), this.getActivePlayer(vpSocket)]);
            if (!moveData.successful) return;

            if (!this.isVPTurn(vpSocket)) return;

            this.vpState.isMovingToItem = moveData.isMovingToItem;
            const adjacentDoorPosition = this.findAdjacentClosedDoor(this.activePlayer.position);
            if (adjacentDoorPosition && this.vpGameSessionManager.nbOfActions.get() > 0) {
                this.openDoor(vpSocket, adjacentDoorPosition);
                this.showLogToggleDoorNotification(vpSocket, {
                    activePlayer: this.activePlayer,
                    doorPosition: adjacentDoorPosition,
                    doorState: true,
                    successful: true,
                    message: 'Door opened',
                    boardGame: undefined,
                    listOfPlayers: [],
                });
                this.vpGameSessionManager.updateNbOfActions(this.vpGameSessionManager.nbOfActions.get() - 1);
            }
        });
    }

    private findAdjacentClosedDoor(position: Position): Position | null {
        const directions = [
            { x: -1, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: -1 },
            { x: 0, y: 1 },
        ];

        for (const dir of directions) {
            const newX = position.x + dir.x;
            const newY = position.y + dir.y;

            if (newX >= 0 && newX < this.gameState.boardGame.tiles.length && newY >= 0 && newY < this.gameState.boardGame.tiles[0].length) {
                const tile = this.gameState.boardGame.tiles[newX][newY];
                if (tile.type === TileType.Door && !tile.doorState) {
                    return { x: newX, y: newY };
                }
            }
        }

        return null;
    }

    private showLogTurnNotification(vpSocket: VpSocketManager) {
        const gameEvent: GameEvent = {
            message: `C'est le tour de : ${this.activePlayer.name}`,
            timestamp: new Date(),
            type: GameEventType.StartTurn,
            player: [this.activePlayer.name],
        };

        this.emitLog(vpSocket, this.gameId, gameEvent);
    }

    private showLogToggleDoorNotification(vpSocket: VpSocketManager, data: dataForm.ToggleDoorStateRes): void {
        const gameEvent: GameEvent = {
            message: `${data.activePlayer.name} a ${data.doorState ? 'ouvert' : 'fermé'} la porte`,
            timestamp: new Date(),
            type: GameEventType.DoorState,
            player: [data.activePlayer.name],
        };

        this.emitLog(vpSocket, this.gameId, gameEvent);
    }

    private emitLog(vpSocket: VpSocketManager, gameId: string, gameEvent: GameEvent, callback?: (response: unknown) => void): void {
        vpSocket.clientSocket.emit('change-turn-log', { gameId, gameEvent }, callback);
    }

    private openDoor(vpSocket: VpSocketManager, doorPosition: Position): void {
        const data: dataForm.ToggleDoorStateReq = {
            gameCode: this.gameId,
            doorPosition,
        };
        vpSocket.clientSocket.emit(SocketServerEventNames.ToggleDoorState, data);
    }

    private handleMovementOver(vpSocket: VpSocketManager): void {
        vpSocket.clientSocket.on(SocketClientEventNames.MovementOver, async (data: dataForm.StandardRes) => {
            await Promise.all([this.getGameState(vpSocket), this.getActivePlayer(vpSocket)]);

            if (!data.successful) return;
            if (!this.isVPTurn(vpSocket)) return;

            const playerPosition = this.activePlayer.position;
            if (playerPosition) {
                const currentTile = this.gameState.boardGame.tiles[playerPosition.x][playerPosition.y];
                if (
                    currentTile.containedItem &&
                    (FROM_ITEM_NAME_TO_VP_PREFERENCE[currentTile.containedItem.name] === VpPreferenceItem.Defensive ||
                        FROM_ITEM_NAME_TO_VP_PREFERENCE[currentTile.containedItem.name] === VpPreferenceItem.Aggressive ||
                        currentTile.containedItem.name === ITEM_NAMES.flag)
                ) {
                    const pickUpData: dataForm.PickUpItemReq = {
                        gameCode: this.gameId,
                        player: this.activePlayer,
                    };
                    vpSocket.clientSocket.emit(SocketClientEventNames.PickUpItem, pickUpData);
                }
            }

            const adjacentPlayer = this.findAdjacentPlayer();
            const isWinningCtfGame =
                this.activePlayer.inventory?.some((item) => item.type === ItemType.Flag) &&
                this.activePlayer.position.x === this.activePlayer.startPosition.x &&
                this.activePlayer.position.y === this.activePlayer.startPosition.y;

            const canStartFight =
                adjacentPlayer &&
                !this.vpState.isMovingToItem &&
                this.vpGameSessionManager.nbOfActions.get() > 0 &&
                adjacentPlayer.ctfTeam !== this.activePlayer.ctfTeam &&
                !isWinningCtfGame;

            if (canStartFight) {
                this.startFight(vpSocket, adjacentPlayer);
                return;
            }

            vpSocket.clientSocket.emit(SocketClientEventNames.EndTurn, { gameCode: this.gameId });
        });
    }

    private findAdjacentPlayer(): Player | null {
        const directions = [
            { x: -1, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: -1 },
            { x: 0, y: 1 },
        ];

        const playerPosition = this.activePlayer.position;
        if (!playerPosition) return null;

        for (const dir of directions) {
            const newX = playerPosition.x + dir.x;
            const newY = playerPosition.y + dir.y;

            if (newX >= 0 && newX < this.gameState.boardGame.tiles.length && newY >= 0 && newY < this.gameState.boardGame.tiles[0].length) {
                const tile = this.gameState.boardGame.tiles[newX][newY];
                const player = tile.containedPlayer;

                if (player && player.name !== this.activePlayer.name) {
                    return player;
                }
            }
        }

        return null;
    }

    private startFight(vpSocket: VpSocketManager, adjacentPlayer: Player): void {
        this.vpGameSessionManager.updateNbOfActions(this.vpGameSessionManager.nbOfActions.get() - 1);
        const fightData: dataForm.StartFightReq = {
            gameCode: this.gameId,
            targetPlayerPosition: adjacentPlayer.position,
        };
        vpSocket.clientSocket.emit(SocketServerEventNames.StartFight, fightData);
    }

    private showLogFlagNotification(vpSocket: VpSocketManager, data: dataForm.PickUpItemRes) {
        const gameEvent: GameEvent = {
            message: `${data.activePlayer.name} a ramassé le drapeau`,
            timestamp: new Date(),
            type: GameEventType.AbandonGame,
            player: [data.activePlayer.name],
        };

        this.emitLog(vpSocket, this.gameId, gameEvent);
    }

    private showLogItemNotification(vpSocket: VpSocketManager, data: dataForm.PickUpItemRes) {
        const gameEvent: GameEvent = {
            message: `${data.activePlayer.name} a ramassé un item: ${data.pickedItem?.name}`,
            timestamp: new Date(),
            type: GameEventType.PickUpItem,
            player: [data.activePlayer.name],
        };

        this.emitLog(vpSocket, this.gameId, gameEvent);
    }
}
