/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable no-console */
/* eslint-disable max-lines */
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
import { CurrentGamesService } from '@app/services/current-games/current-games.service';
import { PrizePoolService } from '@app/services/prize-pool/prize-pool/prize-pool.service';
import { UsersService } from '@app/services/users/users.service';
import { genErrorMessage, sendError } from '@app/utils/functions/socket-error-functions';
import { CtfTeam } from '@common/enums/ctf-team';
import { GameMode } from '@common/enums/game-mode';
import { SocketClientEventNames, SocketServerEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import { StartGameData } from '@common/socket-data-forms';
import { PlayerStatistics } from '@common/statistics';
import * as io from 'socket.io';
import { setTimeout as delay } from 'timers/promises';
import { Container } from 'typedi';

export class GameSessionController {
    private standardStackPlayer: Player[];
    private isPlayerMoving: boolean;

    private roomCode: string;
    private changingTurn: boolean;

    private winnerTeam: CtfTeam | undefined;

    private fightLoserName: string | undefined;
    private fightWinnerName: string | undefined;

    // eslint-disable-next-line max-params
    constructor(
        private gameSession: GameSession,
        private sio: io.Server,
        private clockManager: GameClockManager,
        private fightSubController: FightSubController | null,
        private movementSubController: MovementSubController,
        private gameService: CurrentGamesService,
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

    setFightSubController(controller: FightSubController): void {
        this.fightSubController = controller;
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
            this.gameSession.activePlayerInstance.inventory?.forEach((item) => {
                this.gameSession.statisticsManager.updateItemsCollected(this.gameSession.activePlayerInstance.userId, item);
            });

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
            const remainingPlayers = this.gameSession.listOfPlayers.getValues();
            const winner = remainingPlayers.length === 1 ? remainingPlayers[0] : undefined;
            console.log('Not enough players to continue the game. Ending game.');
            await this.endGame(winner);
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

        this.gameSession.placeAndAddActivePlayer(player);
        const ans: dataForm.UpdateGamedRes = {
            successful: true,
            message: '',
            boardGame: this.gameSession.board,
            activePlayer: this.gameSession.activePlayerInstance,
            listOfPlayers: this.gameSession.listOfPlayers.getValues(),
        };
        this.updateGame();
        return ans;
    }

    movePlayer(path: Position[], socket: io.Socket, isMovingToItem?: boolean): void {
        if (this.gameSession.gameOver) return;
        let index = 0;
        const positions = path;
        let trapEncountered = false;

        const interval = setInterval(async () => {
            const itemIsBlocking = this.gameSession.validItemPresent(positions[index]) && index > 0;
            if (index < positions.length - 1 && socket.connected && !itemIsBlocking && !this.gameSession.ctfIsOver() && !trapEncountered) {
                this.movementSubController.movePlayer(positions[index], positions[index + 1], isMovingToItem);

                // Check if this tile has a trap - if so, stop movement
                const currentTile = this.gameSession.board.tiles[positions[index + 1].x][positions[index + 1].y];
                if (currentTile.type === TileType.Trap) {
                    trapEncountered = true;
                }

                this.playerMoving = true;
                ++index;
            } else {
                clearInterval(interval);
                this.playerMoving = false;
                if (!trapEncountered) {
                    this.endMovement();
                }
                if (this.gameSession.ctfIsOver()) {
                    await delay(WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC);
                    this.winnerTeam = this.gameSession.activePlayerInstance.ctfTeam;
                    await this.endGame();
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
        this.gameSession.statisticsManager.updateDoorPercentage(doorPosition);
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
            await this.endGame();
        }
    }

    useTeleporter(position: Position, socket: io.Socket): void {
        if (this.gameOver()) return;

        try {
            const activePlayer = this.gameSession.activePlayerInstance;

            if (activePlayer.socketId !== socket.id) {
                sendError('Not your turn', this.sio, this.roomCode);
                return;
            }

            const result = this.gameSession.useTeleporter(position);

            if (!result.success) {
                sendError(result.message || 'Teleport failed', this.sio, this.roomCode);
                return;
            }

            this.gameSession.statisticsManager.updatePlayerTilePercentage(activePlayer.userId, activePlayer.position);

            activePlayer.attributes.speedValue -= 1;
            const ans: dataForm.UpdateGamedRes = {
                successful: true,
                message: 'Teleport successful',
                boardGame: this.gameSession.board,
                activePlayer: this.gameSession.activePlayerInstance,
                listOfPlayers: this.gameSession.listOfPlayers.getValues(),
            };
            this.sio.to(this.roomCode).emit(SocketClientEventNames.Teleport, ans);

            this.sio.to(this.roomCode).emit(SocketClientEventNames.UpdateGame, ans);
        } catch {
            const ans: dataForm.StandardRes = genErrorMessage();
            this.sio.to(this.roomCode).emit(SocketClientEventNames.UpdateGame, ans);
            sendError(STANDARD_ERROR_MESSAGE, this.sio, this.roomCode);
        }
    }

    hasGameStarted(): boolean {
        return this.gameSession.gameStarted;
    }

    private endFight(): void {
        if (this.gameOver()) return;
        this.fightSubController.endFight();
    }

    async endGame(winner?: Player): Promise<void> {
        console.log('Game ended. END GAME WAS CALLED. with the following winner ', winner ? JSON.stringify(winner, null, 2) : 'No winner');
        this.gameSession.endGame();
        this.gameService.setGameEnded(this.roomCode);
        this.clockManager.stopClock();

        console.log('Game ended. Preparing to send end game data.');
        console.log('Winner:', JSON.stringify(winner, null, 2));

        // Get game mode
        const gameMode = this.gameSession.board.gameMode;

        // Calculate game duration
        const globalStats = this.gameSession.statisticsManager.displayedGlobalStatistics;
        const durationMs = Math.max(0, globalStats.endTime - globalStats.startTime);

        // Update game duration for all human players (with mode tracking)
        const usersService = Container.get(UsersService);
        const players = this.gameSession.listOfPlayers.getValues().filter((p) => !p.virtualPlayer);

        for (const p of players) {
            await usersService.addGameDurationForMode(p.userId, durationMs, gameMode);
        }

        // Increment victory for winner (with mode tracking)
        if (winner && !winner.virtualPlayer) {
            console.log('Incrementing victory for user:', winner.userId, 'Mode:', gameMode);
            await usersService.incrementVictoryForMode(winner.userId, gameMode);
        }

        // Distribute prizes
        if (this.gameSession.board.gameMode === GameMode.Normal && winner) {
            await this.distributePrizes(winner);
        } else if (this.gameSession.board.gameMode === GameMode.CTF && this.winnerTeam) {
            await this.distributePrizesForCTF(this.winnerTeam);
        }

        const listOfPlayerStats: (PlayerStatistics & { name: string })[] = [];
        this.gameSession.statisticsManager.playerStatisticsMap.forEach((value) => {
            const stat: PlayerStatistics & { name: string } = { ...value };
            listOfPlayerStats.push(stat);
        });
        const ans: dataForm.EndGameRes = {
            successful: true,
            message: 'Game Over',
            winnerTeam: this.winnerTeam,
            winner,
            globalStats: this.gameSession.statisticsManager.displayedGlobalStatistics,
            listOfPlayerStats,
        };

        this.sio.to(this.roomCode).emit(SocketClientEventNames.EndGame, ans);
    }

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
            await this.endGame(winner);
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

    private async distributePrizes(winner: Player): Promise<void> {
        const prizePoolService = Container.get(PrizePoolService);
        const game = await this.gameService.getGame(this.roomCode);
        if (!game || game.entryPrice === 0) return;

        const activePlayers = this.gameSession.getActivePlayers();
        const humanPlayers = activePlayers.filter((p) => !p.virtualPlayer);

        // Sole winner case
        if (humanPlayers.length === 1) {
            const prizeAmount = prizePoolService.calculateSoleWinnerPrize(game.entryPrice, this.gameSession.initialPlayers);
            await this.updatePlayerMoney(humanPlayers[0].userId, prizeAmount);
            return;
        }

        // Normal case
        const winners = [winner];
        const losers = humanPlayers.filter((player) => player.userId !== winner.userId && !this.gameSession.hasPlayerAbandoned(player.userId));

        const distribution = prizePoolService.calculatePrizeDistribution(game.entryPrice, this.gameSession.initialPlayers, winners, losers);

        for (const [userId, amount] of distribution.winners) {
            await this.updatePlayerMoney(userId, amount);
        }

        for (const [userId, amount] of distribution.losers) {
            await this.updatePlayerMoney(userId, amount);
        }
    }

    private async distributePrizesForCTF(winningTeam: CtfTeam): Promise<void> {
        console.log('Distributing prizes for CTF winning team:', winningTeam);
        const prizePoolService = Container.get(PrizePoolService);
        const game = await this.gameService.getGame(this.roomCode);
        if (!game) return;

        const activePlayers = this.gameSession.getActivePlayers();
        const humanPlayers = activePlayers.filter((p) => !p.virtualPlayer);

        // Get winning and losing team members (excluding abandoned players)
        const winningTeamPlayers = humanPlayers.filter((p) => p.ctfTeam === winningTeam && !this.gameSession.hasPlayerAbandoned(p.userId));
        const losingTeamPlayers = humanPlayers.filter((p) => p.ctfTeam !== winningTeam && !this.gameSession.hasPlayerAbandoned(p.userId));

        console.log(
            'Winning team players:',
            winningTeamPlayers.map((p) => p.name),
        );
        console.log(
            'Losing team players:',
            losingTeamPlayers.map((p) => p.name),
        );
        // If no human players remain, no prizes to distribute
        if (winningTeamPlayers.length === 0) return;

        // Increment victories for all winning team members
        const usersService = Container.get(UsersService);
        for (const player of winningTeamPlayers) {
            console.log('Incrementing CTF victory for user:', player.userId);
            await usersService.incrementVictoryForMode(player.userId, GameMode.CTF);
        }

        const distribution = prizePoolService.calculatePrizeDistribution(
            game.entryPrice,
            this.gameSession.initialPlayers,
            winningTeamPlayers,
            losingTeamPlayers,
        );

        for (const [userId, amount] of distribution.winners) {
            await this.updatePlayerMoney(userId, amount);
        }

        for (const [userId, amount] of distribution.losers) {
            await this.updatePlayerMoney(userId, amount);
        }
    }

    private async updatePlayerMoney(userId: string, amount: number): Promise<void> {
        try {
            const usersService = Container.get(UsersService);
            const user = await usersService.getUser(userId);
            if (!user) return;

            const updatedUser = { ...user, money: user.money + amount };
            await usersService.updateUser(updatedUser);
        } catch (error) {
            console.error(`Failed to update money for user ${userId}:`, error);
        }
    }
}
