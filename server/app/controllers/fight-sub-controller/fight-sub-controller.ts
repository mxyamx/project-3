/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-console */
import { GameClockManager } from '@app/classes/game-clock-manager/game-clock-manager';
import { GameSession } from '@app/classes/game-session/game-session';
import {
    MAX_AMOUNT_OF_ESCAPES,
    MAX_AMOUNT_OF_VICTORIES,
    STANDARD_ERROR_MESSAGE,
    WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC,
} from '@app/constants/development-constants';
import { PrizePoolService } from '@app/services/prize-pool/prize-pool/prize-pool.service';
import { UsersService } from '@app/services/users/users.service';
import { genErrorMessage, sendError } from '@app/utils/functions/socket-error-functions';
import { GameMode } from '@common/enums/game-mode';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import { PlayerStatistics } from '@common/statistics';
import * as io from 'socket.io';
import { setTimeout as delay } from 'timers/promises';
import Container from 'typedi';

export class FightSubController {
    private prizePoolService: PrizePoolService;

    private fightLoserName: string | undefined;
    private fightWinnerName: string | undefined;

    // eslint-disable-next-line max-params
    constructor(
        private clockManager: GameClockManager,
        private gameSession: GameSession,
        private roomCode: string,
        private sio: io.Server,
        private usersService: UsersService,
        private entryPrice: number,
    ) {
        this.prizePoolService = Container.get(PrizePoolService);
    }

    startFight(targetPlayerPosition: Position): void {
        try {
            this.fightLoserName = undefined;
            this.fightWinnerName = undefined;
            this.clockManager.restart();
            this.clockManager.setAttackClock(0);
            this.gameSession.startFight(
                this.gameSession.activePlayerInstance,
                this.gameSession.board.tiles[targetPlayerPosition.x][targetPlayerPosition.y].containedPlayer,
            );
            this.gameSession.statisticsManager.updateCombatAmount(this.gameSession.fight.attackingPlayer.userId);
            this.gameSession.statisticsManager.updateCombatAmount(this.gameSession.fight.defendingPlayer.userId);
            const ans: dataForm.StartFightRes = {
                successful: true,
                message: 'success',
                boardGame: this.gameSession.board,
                listOfPlayers: this.gameSession.listOfPlayers.getValues(),
                activePlayer: this.gameSession.activePlayerInstance,
                attackingPlayer: this.gameSession.fight.attackingPlayer,
                defendingPlayer: this.gameSession.fight.defendingPlayer,
            };

            this.sio.to(this.roomCode).emit(SocketClientEventNames.StartFight, ans);
        } catch {
            const ans: dataForm.StandardRes = genErrorMessage();
            this.sio.to(this.roomCode).emit(SocketClientEventNames.StartFight, ans);
            sendError(STANDARD_ERROR_MESSAGE, this.sio, this.roomCode);
        }
    }

    async executeAttack(): Promise<void> {
        try {
            this.clockManager.restart();
            this.clockManager.setAttackClock(0);
            const attackingPlayer: Player = this.gameSession.fight.attackingPlayer;
            const defendingPlayer: Player = this.gameSession.fight.defendingPlayer;
            const initialDefenderHealth = defendingPlayer.attributes.healthValue;
            if (defendingPlayer.attributes.healthValue === 0) return;
            this.gameSession.executeAttack(attackingPlayer, defendingPlayer);

            const damageDoneAttackingPlayer = initialDefenderHealth - defendingPlayer.attributes.healthValue;
            const damageTakenDefendingPlayer = damageDoneAttackingPlayer;

            // Retrieve the proper sound effect (randomly)
            let user = null;
            if (!attackingPlayer?.virtualPlayer) {
                user = await this.usersService.getUser(attackingPlayer.userId);
            }
            let soundEffect = '';
            if (user) {
                const sounds = user.purchasedSounds ?? [];
                if (sounds.length > 0) {
                    const randomIndex = Math.floor(Math.random() * sounds.length);
                    soundEffect = sounds[randomIndex];
                } else {
                    soundEffect = '';
                }
            }
            if (damageDoneAttackingPlayer && damageTakenDefendingPlayer) {
                this.gameSession.statisticsManager.addLifePointsLost(defendingPlayer.userId, damageTakenDefendingPlayer);
                this.gameSession.statisticsManager.addLifePointsOpponentLost(attackingPlayer.userId, damageDoneAttackingPlayer);
            }

            const ans: dataForm.ExecuteAttackRes = {
                successful: true,
                message: 'success',
                boardGame: this.gameSession.board,
                listOfPlayers: this.gameSession.listOfPlayers.getValues(),
                activePlayer: this.gameSession.activePlayerInstance,
                attackingPlayer,
                defendingPlayer,
                defenseDice: this.gameSession.defenseDiceValue,
                attackDice: this.gameSession.attackDiceValue,
                damageTakenDefendingPlayer,
                damageDoneAttackingPlayer,
                attackSoundEffect: soundEffect,
            };

            this.sio.to(this.roomCode).emit(SocketClientEventNames.ProcessAttack, ans);
            if (defendingPlayer.attributes.healthValue <= 0) {
                await delay(WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC);
                await this.handleVictory();
            } else {
                await delay(WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC);
                this.switchTurn();
            }
        } catch {
            const ans: dataForm.StandardRes = genErrorMessage();
            this.sio.to(this.roomCode).emit(SocketClientEventNames.ProcessAttack, ans);
            sendError(STANDARD_ERROR_MESSAGE, this.sio, this.roomCode);
        }
    }
    attemptEscape(): void {
        try {
            this.clockManager.restart();
            this.clockManager.setAttackClock(0);
            const escapingPlayer: Player = this.gameSession.fight.attackingPlayer;
            const attempResult: boolean = this.gameSession.attemptEscape();
            const defenderPlayer = this.gameSession.fight.defendingPlayer;
            let ans: dataForm.EscapeAttemptRes;
            if (attempResult) {
                this.gameSession.statisticsManager.updateEscapeAmount(escapingPlayer.userId);
                ans = {
                    successful: true,
                    message: 'you escaped ',
                    escapingPlayer,
                    largestAmountOfEScapeAttempts: this.findLargestAmountOfEscapeAttempts(),
                    defenderPlayer,
                };
                this.sio.to(this.roomCode).emit(SocketClientEventNames.ProcessEscapeAttempt, ans);
                this.endFight();
            } else {
                ans = ans = {
                    successful: true,
                    message: 'you are still in the fight ',
                    escapingPlayer,
                    largestAmountOfEScapeAttempts: this.findLargestAmountOfEscapeAttempts(),
                    defenderPlayer,
                };
                this.sio.to(this.roomCode).emit(SocketClientEventNames.ProcessEscapeAttempt, ans);
                this.switchTurn();
            }
        } catch {
            const ans = genErrorMessage();
            this.sio.to(this.roomCode).emit(SocketClientEventNames.ProcessEscapeAttempt, ans);
            sendError(STANDARD_ERROR_MESSAGE, this.sio, this.roomCode);
        }
    }

    endFight(): void {
        try {
            this.clockManager.restart();
            this.clockManager.setAttackClock(0);
            const attackingPlayer = this.gameSession.fight.attackingPlayer;
            this.gameSession.endFight();
            const ans: dataForm.EndFightRes = {
                successful: true,
                message: 'fight is over',
                boardGame: this.gameSession.board,
                listOfPlayers: this.gameSession.listOfPlayers.getValues(),
                activePlayer: this.gameSession.activePlayerInstance,
                loserName: this.fightLoserName ?? '',
                winnerName: this.fightWinnerName ?? '',
                attackingPlayer,
            };
            this.sio.to(this.roomCode).emit(SocketClientEventNames.EndFight, ans);
        } catch {
            const ans: dataForm.StandardRes = genErrorMessage();
            this.sio.to(this.roomCode).emit(SocketClientEventNames.EndFight, ans);
            sendError(STANDARD_ERROR_MESSAGE, this.sio, this.roomCode);
        }
    }
    private switchTurn(): void {
        try {
            this.clockManager.restart();
            this.clockManager.setAttackClock(0);
            this.gameSession.switchTurn();
            const attackingPlayer: Player = this.gameSession.fight.attackingPlayer;
            const defendingPlayer: Player = this.gameSession.fight.defendingPlayer;

            const ans: dataForm.SwitchTurn = {
                successful: true,
                message: 'success',
                boardGame: this.gameSession.board,
                listOfPlayers: this.gameSession.listOfPlayers.getValues(),
                activePlayer: this.gameSession.activePlayerInstance,
                attackingPlayer,
                defendingPlayer,
                changeDisplayAttackClock: this.changeDisplayAttackClock(),
            };

            this.sio.to(this.roomCode).emit(SocketClientEventNames.SwitchTurn, ans);
        } catch {
            const ans: dataForm.StandardRes = genErrorMessage();
            this.sio.to(this.roomCode).emit(SocketClientEventNames.SwitchTurn, ans);
            sendError(STANDARD_ERROR_MESSAGE, this.sio, this.roomCode);
        }
    }

    private async endGame(winner: Player): Promise<void> {
        this.gameSession.endGame();
        this.clockManager.stopClock();

        // Distribute prizes
        await this.distributePrizes(winner);

        const listOfPlayerStats: (PlayerStatistics & { name: string; userId: string })[] = [];
        this.gameSession.statisticsManager.playerStatisticsMap.forEach((value, key) => {
            const stat: PlayerStatistics & { name: string; userId: string } = { ...value, userId: key };
            listOfPlayerStats.push(stat);
        });
        const ans: dataForm.EndGameRes = {
            successful: true,
            message: 'Game Over',
            winner,
            globalStats: this.gameSession.statisticsManager.displayedGlobalStatistics,
            listOfPlayerStats,
        };

        this.sio.to(this.roomCode).emit(SocketClientEventNames.EndGame, ans);
    }
    private async handleVictory(): Promise<void> {
        const attackingPlayer: Player = this.gameSession.fight.attackingPlayer;
        const defendingPlayer: Player = this.gameSession.fight.defendingPlayer;
        this.gameSession.repositionPlayer(defendingPlayer);
        this.fightLoserName = defendingPlayer.name;
        this.fightWinnerName = attackingPlayer.name;
        this.showEndFightNotification();
        this.gameSession.statisticsManager.updateDefeatAmount(defendingPlayer.userId);

        this.gameSession.registerVictory(attackingPlayer);
        await delay(WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC);
        this.endFight();

        if (
            this.gameSession.getPlayerAmountOfVic(attackingPlayer) >= MAX_AMOUNT_OF_VICTORIES &&
            this.gameSession.board.gameMode === GameMode.Normal
        ) {
            await delay(WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC);
            this.endGame(attackingPlayer);
        }
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

    private findLargestAmountOfEscapeAttempts(): number | undefined {
        if (!this.gameSession.fight) return undefined;
        const escapeMAp = this.gameSession.escapeMap;
        const firstValue = escapeMAp.get(this.gameSession.fight.attackingPlayer.name);
        const secondValue = escapeMAp.get(this.gameSession.fight.defendingPlayer.name);
        if (!firstValue || !secondValue) return undefined;
        const largestAmountOfEScapeAttempts = firstValue > secondValue ? firstValue : secondValue;
        return largestAmountOfEScapeAttempts;
    }

    private changeDisplayAttackClock(): boolean {
        if (!this.gameSession.fight) return false;
        const escapeMAp = this.gameSession.escapeMap;
        const escapeAmount = escapeMAp.get(this.gameSession.fight.attackingPlayer.name);

        if (!escapeAmount) return false;

        return escapeAmount >= MAX_AMOUNT_OF_ESCAPES;
    }

    private async distributePrizes(winner: Player): Promise<void> {
        if (this.entryPrice === 0) return; // No entry fee, no prizes

        const activePlayers = this.gameSession.getActivePlayers();

        // Check if only one player remains (sole winner case)
        const humanPlayers = activePlayers.filter((p) => !p.virtualPlayer);
        if (humanPlayers.length === 1) {
            await this.handleSoleWinner(humanPlayers[0]);
            return;
        }

        // Normal case: distribute to winners and losers
        const winners = [winner];
        const losers = activePlayers.filter((player) => player.userId !== winner.userId && !this.gameSession.hasPlayerAbandoned(player.userId));

        const distribution = this.prizePoolService.calculatePrizeDistribution(this.entryPrice, this.gameSession.initialPlayers, winners, losers);

        // Update winner(s)
        for (const [userId, amount] of distribution.winners) {
            await this.updatePlayerMoney(userId, amount);
        }

        // Update losers with consolation
        for (const [userId, amount] of distribution.losers) {
            await this.updatePlayerMoney(userId, amount);
        }
    }

    private async handleSoleWinner(winner: Player): Promise<void> {
        if (winner.virtualPlayer) return;

        const prizeAmount = this.prizePoolService.calculateSoleWinnerPrize(this.entryPrice, this.gameSession.initialPlayers);

        await this.updatePlayerMoney(winner.userId, prizeAmount);
    }

    private async updatePlayerMoney(userId: string, amount: number): Promise<void> {
        try {
            const user = await this.usersService.getUser(userId);
            if (!user) return;

            const updatedUser = {
                ...user,
                money: user.money + amount,
            };
            await this.usersService.updateUser(updatedUser);
        } catch (error) {
            console.error(`Failed to update money for user ${userId}:`, error);
        }
    }
}
