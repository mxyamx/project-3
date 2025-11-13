import { GameClockManager } from '@app/classes/game-clock-manager/game-clock-manager';
import { GameSession } from '@app/classes/game-session/game-session';
import {
    MAX_AMOUNT_OF_VICTORIES,
    MOVEMENT_TIME_INTERVAL_MSEC,
    STANDARD_ERROR_MESSAGE,
    STANDARD_LIST_PLAYERS,
    WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC,
} from '@app/constants/development-constants';
import { FightSubController } from '@app/controllers/fight-sub-controller/fight-sub-controller';
import { MovementSubController } from '@app/controllers/movement-sub-controller/movement-sub-controller';
import { genErrorMessage, sendError } from '@app/utils/functions/socket-error-functions';
import { CtfTeam } from '@common/enums/ctf-team';
import { GameMode } from '@common/enums/game-mode';
import { SocketClientEventNames, SocketServerEventNames } from '@common/enums/socket-events-names';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import { StartGameData } from '@common/socket-data-forms';
import * as io from 'socket.io';
import { setTimeout as delay } from 'timers/promises';

export class GameSessionController {
    private standardStackPlayer: Player[];
    private isPlayerMoving: boolean;

    private roomCode: string;
    private changingTurn: boolean;

    private winnerTeam: CtfTeam | undefined;

    private fightLoserName: string | undefined;
    private fightWinnerName: string | undefined;

    constructor(
        private gameSession: GameSession,
        private sio: io.Server,
        private clockManager: GameClockManager,
        private fightSubController: FightSubController,
        private movementSubController: MovementSubController,
    ) {
        this.isPlayerMoving = false;
        this.standardStackPlayer = STANDARD_LIST_PLAYERS;
        this.changingTurn = false;
        this.winnerTeam = undefined;
    }

    get stackOfPlayers(): Player[] {
        return this.standardStackPlayer;
    }

    get session(): GameSession {
        return this.gameSession;
    }

    set gameId(roomCode: string) {
        this.roomCode = roomCode;
    }

    set playerMoving(newValue: boolean) {
        this.isPlayerMoving = newValue;
    }

    handleCommand(socket: io.Socket): void {
        socket.on(SocketServerEventNames.GetGameState, (data: dataForm.GetGameStateReq) => {
            const gameSession = this.getGameSessionById(data.gameCode);
            if (!gameSession) {
                return;
            }

            const ans: dataForm.GetGameStateRes = {
                successful: true,
                message: '',
                boardGame: gameSession.board,
                listOfPlayers: gameSession.listOfPlayers.getValues(),
                activePlayer: gameSession.activePlayerInstance,
            };

            socket.emit(SocketClientEventNames.GameState, ans);
        });
    }

    playerIsMoving(player: Player): boolean {
        if (!this.gameSession.gameStarted) return false;
        return this.isPlayerMoving && player.name === this.gameSession.activePlayerInstance.name;
    }

    pickUpItem(player: Player): void {
        if (this.gameSession.gameOver) return;
        try {
            const pickedItem = this.gameSession.board.tiles[player.position.x][player.position.y].containedItem;

            this.gameSession.pickUpItem(player);

            const ans: dataForm.PickUpItemRes = {
                successful: true,
                message: 'executed',
                boardGame: this.gameSession.board,
                listOfPlayers: this.gameSession.listOfPlayers.getValues(),
                activePlayer: this.gameSession.activePlayerInstance,
                pickedItem,
            };
            this.sio.to(this.roomCode).emit(SocketClientEventNames.PickUpItem, ans);
        } catch {
            const ans: dataForm.StandardRes = genErrorMessage();
            this.sio.to(this.roomCode).emit(SocketClientEventNames.PickUpItem, ans);
            sendError(STANDARD_ERROR_MESSAGE, this.sio, this.roomCode);
        }
    }
    dropItem(player: Player, item: Item): void {
        if (this.gameSession.gameOver) return;
        try {
            this.gameSession.dropItem(player, item);

            const ans: dataForm.DropItemRes = {
                successful: true,
                message: 'executed',
                boardGame: this.gameSession.board,
                listOfPlayers: this.gameSession.listOfPlayers.getValues(),
                activePlayer: this.gameSession.activePlayerInstance,
                droppedItem: item,
            };
            this.sio.to(this.roomCode).emit(SocketClientEventNames.DropItem, ans);
        } catch {
            const ans: dataForm.StandardRes = genErrorMessage();
            this.sio.to(this.roomCode).emit(SocketClientEventNames.DropItem, ans);
            sendError(STANDARD_ERROR_MESSAGE, this.sio, this.roomCode);
        }
    }

    async removePlayer(player: Player): Promise<void> {
        if (this.gameSession.gameOver) return;
        if (!this.gameSession.playerIsInSession(player)) return;

        this.gameSession.removePlayer(player);

        if (this.gameSession.listOfPlayers.getValues().length === 0) this.gameSession.endGame();
        if (!this.gameSession.gameStarted) return;

        this.updateGame();

        if (this.gameSession.fight) {
            if (player.name === this.gameSession.fight.attackingPlayer.name || player.name === this.gameSession.fight.defendingPlayer.name) {
                await delay(WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC);
                if (this.gameSession.playerIsInSession(this.gameSession.fight.attackingPlayer)) {
                    await this.handleVictory(this.gameSession.fight.attackingPlayer, this.gameSession.fight.defendingPlayer);
                } else if (this.gameSession.playerIsInSession(this.gameSession.fight.defendingPlayer)) {
                    await this.handleVictory(this.gameSession.fight.defendingPlayer, this.gameSession.fight.attackingPlayer);
                }
            }
        }

        if (player.name === this.gameSession.activePlayerInstance.name) {
            await delay(WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC);
            this.endTurn();
        }

        if (player.organizer) {
            await delay(WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC);
            this.deactivateDebugMode();
        }

        if (this.gameOver()) return;

        if (this.gameSession.listOfPlayers.getValues().length < 2) {
            await delay(WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC);
            this.endGame();
        }
    }

    addPlayer(player: Player): void {
        if (this.gameSession.gameOver) return;
        if (this.gameSession.gameStarted) return;

        this.gameSession.listOfPlayers.add(player);
        this.gameSession.staticMapOfPlayer.set(player.name, structuredClone(player));
    }
    addActivePlayer(player: Player): dataForm.UpdateGamedRes | null {
        if (this.gameSession.gameOver) return null;
        if (!this.gameSession.gameStarted) return null;
        const ans: dataForm.UpdateGamedRes = {
            successful: true,
            message: '',
            boardGame: this.gameSession.board,
            activePlayer: this.gameSession.activePlayerInstance,
            listOfPlayers: this.gameSession.listOfPlayers.getValues(),
        };
        this.gameSession.placeAndAddActivePlayer(player);
        this.updateGame();
        return ans;
    }

    movePlayer(path: Position[], socket: io.Socket, isMovingToItem?: boolean): void {
        if (this.gameSession.gameOver) return;
        let index = 0;
        const positions = path;

        const interval = setInterval(async () => {
            const itemIsBlocking = this.gameSession.validItemPresent(positions[index]) && index > 0;
            if (index < positions.length - 1 && socket.connected && !itemIsBlocking && !this.gameSession.ctfIsOver()) {
                this.movementSubController.movePlayer(positions[index], positions[index + 1], isMovingToItem);
                this.playerMoving = true;
                ++index;
            } else {
                clearInterval(interval);
                this.playerMoving = false;
                this.endMovement();
                if (this.gameSession.ctfIsOver()) {
                    await delay(WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC);
                    this.winnerTeam = this.gameSession.activePlayerInstance.ctfTeam;
                    this.endGame();
                }
            }
        }, MOVEMENT_TIME_INTERVAL_MSEC);
    }

    endMovement(): void {
        this.movementSubController.endMovement();
    }
    startGame(): void {
        try {
            this.gameSession.startGame();
            this.clockManager.startClock();

            const ans: StartGameData = {
                boardGame: this.gameSession.board,
                listOfPlayers: this.gameSession.listOfPlayers.getValues(),
                activePlayer: this.gameSession.activePlayerInstance,
            };

            this.sio.to(this.roomCode).emit(SocketClientEventNames.StartGame, ans);
        } catch {
            const ans: dataForm.StandardRes = genErrorMessage();
            this.sio.to(this.roomCode).emit(SocketClientEventNames.StartGame, ans);
            sendError(STANDARD_ERROR_MESSAGE, this.sio, this.roomCode);
        }
    }

    startFight(targetPlayerPosition: Position): void {
        try {
            if (this.gameOver()) return;
            const player = this.gameSession.board.tiles[targetPlayerPosition.x][targetPlayerPosition.y].containedPlayer;
            if (!player) return;

            this.fightSubController.startFight(targetPlayerPosition);
        } catch {
            const ans = genErrorMessage();
            this.sio.to(this.roomCode).emit(SocketClientEventNames.StartFight, ans);
            sendError(STANDARD_ERROR_MESSAGE, this.sio, this.roomCode);
        }
    }

    executeAttack(): void {
        if (!this.gameSession.fight) return;
        if (this.gameOver()) return;
        const defendingPlayer: Player = this.gameSession.fight.defendingPlayer;
        const attackingPlayer: Player = this.gameSession.fight.attackingPlayer;

        if (this.gameSession.playerIsInSession(defendingPlayer) && this.gameSession.playerIsInSession(attackingPlayer)) {
            this.fightSubController.executeAttack();
        }
    }

    toggleDoorState(doorPosition: Position): void {
        if (this.gameOver()) return;
        this.movementSubController.toggleDoorState(doorPosition);
    }

    attemptEscape(): void {
        if (!this.gameSession.fight) return;
        if (this.gameOver()) return;
        const defendingPlayer: Player = this.gameSession.fight.defendingPlayer;
        const attackingPlayer: Player = this.gameSession.fight.attackingPlayer;

        if (this.gameSession.playerIsInSession(defendingPlayer) && this.gameSession.playerIsInSession(attackingPlayer)) {
            this.fightSubController.attemptEscape();
        }
    }

    gameOver(): boolean {
        return this.gameSession.gameOver;
    }

    endTurn(): void {
        try {
            if (this.changingTurn) return;
            this.changingTurn = true;
            this.clockManager.restart();
            this.clockManager.setTurnClock(0);
            this.clockManager.setAttackClock(0);
            this.clockManager.setTransitioningClock(0);
            this.gameSession.changeActivePlayer();

            const ans: dataForm.EndTurnRes = {
                successful: true,
                message: 'executed',
                boardGame: this.gameSession.board,
                listOfPlayers: this.gameSession.listOfPlayers.getValues(),
                activePlayer: this.gameSession.activePlayerInstance,
            };

            this.sio.to(this.roomCode).emit(SocketClientEventNames.EndTurn, ans);

            this.clockManager.setTransitioning(true);
            this.changingTurn = false;
        } catch {
            const ans: dataForm.StandardRes = genErrorMessage();
            this.sio.to(this.roomCode).emit(SocketClientEventNames.EndTurn, ans);
            sendError(STANDARD_ERROR_MESSAGE, this.sio, this.roomCode);
        }
    }

    getActivePlayer(): void {
        const ans: dataForm.GetActivePlayerRes = {
            successful: true,
            message: '',
            activePlayer: this.gameSession.activePlayerInstance,
        };
        this.sio.to(this.roomCode).emit(SocketClientEventNames.GetActivePlayer, ans);
    }

    toggleDebugMode(): void {
        if (this.gameSession.gameOver) return;
        this.gameSession.toggleDebugMode();
        const ans: dataForm.ToggleDebugModeRes = {
            message: 'toggle successful',
            successful: true,
            debugModeStatus: this.gameSession.debugModeStatus,
        };

        this.sio.to(this.roomCode).emit(SocketClientEventNames.ToggleDebugMode, ans);
    }

    async teleportPlayer(oldPosition: Position, newPosition: Position): Promise<void> {
        if (this.gameOver()) return;
        this.movementSubController.teleportPlayer(oldPosition, newPosition);

        if (this.gameSession.ctfIsOver()) {
            await delay(WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC);
            this.winnerTeam = this.gameSession.activePlayerInstance.ctfTeam;
            this.endGame();
        }
    }

    hasGameStarted(): boolean {
        return this.gameSession.gameStarted;
    }

    private endFight(): void {
        if (this.gameOver()) return;
        this.fightSubController.endFight();
    }

    private endGame(winner?: Player): void {
        this.gameSession.endGame();
        this.clockManager.stopClock();
        const ans: dataForm.EndGameRes = {
            successful: true,
            message: 'Game Over',
            winnerTeam: this.winnerTeam,
            winner,
        };

        this.sio.to(this.roomCode).emit(SocketClientEventNames.EndGame, ans);
    }
    //TODO MIGHT USE THIS TO INFORM THE OTHER PLAYERS
    private updateGame(): void {
        if (this.gameOver()) return;
        const ans: dataForm.UpdateGamedRes = {
            successful: true,
            message: '',
            boardGame: this.gameSession.board,
            activePlayer: this.gameSession.activePlayerInstance,
            listOfPlayers: this.gameSession.listOfPlayers.getValues(),
        };
        this.sio.to(this.roomCode).emit(SocketClientEventNames.UpdateGame, ans);
    }

    private deactivateDebugMode(): void {
        if (this.gameOver()) return;
        this.gameSession.deactivateDebugMode();
        const ans: dataForm.DeactivateDebugModeRes = {
            successful: true,
            message: '',
            debugModeStatus: this.gameSession.debugModeStatus,
        };
        this.sio.to(this.roomCode).emit(SocketClientEventNames.DeactivateDebugMode, ans);
    }

    private getGameSessionById(gameCode: string): GameSession | null {
        return this.roomCode === gameCode ? this.gameSession : null;
    }

    private async handleVictory(winner: Player, loser: Player): Promise<void> {
        this.fightWinnerName = winner.name;
        this.fightLoserName = loser.name;
        this.showEndFightNotification();
        this.gameSession.registerVictory(winner);
        await delay(WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC);
        this.endFight();
        if (this.gameSession.getPlayerAmountOfVic(winner) >= MAX_AMOUNT_OF_VICTORIES && this.gameSession.board.gameMode === GameMode.Normal) {
            await delay(WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC);
            this.endGame(winner);
        }
        this.fightLoserName = undefined;
        this.fightWinnerName = undefined;
    }

    private showEndFightNotification(): void {
        const ans: dataForm.endFightNotification = {
            successful: true,
            message: '',
            loserName: this.fightLoserName ?? '',
            winnerName: this.fightWinnerName ?? '',
        };
        this.sio.to(this.roomCode).emit(SocketClientEventNames.ShowEndFightNotification, ans);
    }
}
