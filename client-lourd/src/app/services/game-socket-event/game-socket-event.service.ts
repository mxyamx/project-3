import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
    ATTACK_LARGE_TIME_LIMIT_SEC,
    ATTACK_SMALL_TIME_LIMIT_SEC,
    EMPTY_CODE,
    ENDGAME_COOL_DOWN_MSEC,
    INITIAL_AMOUNT_OF_ACTION,
    INITIAL_AMOUNT_OF_EVASION,
    MAXIMUM_AMOUNT_OF_ITEM,
    TURN_TIME_LIMIT_SEC,
} from '@app/constants/development-constants';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { CombatNotificationService } from '@app/services/combat-notification/combat-notification.service';
import { FightEventsHandlerService } from '@app/services/fight-events-handler/fight-events-handler.service';
import { GameEventService } from '@app/services/game-event/game-event.service';
import { GameInterfaceService } from '@app/services/game-interface/game-interface.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { MovementEventsHandlerService } from '@app/services/movement-events-handler/movement-events-handler.service';
import { StatisticsManagerService } from '@app/services/statistics-manager/statistics-manager.service';
import { ItemName } from '@common/enums/item-name';
import { PlayerState } from '@common/enums/player-state';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { UrlPage } from '@common/enums/url-page';
import * as dataForm from '@common/socket-data-forms';
import { CurrentGameManagerService } from '../current-game-manager/current-game-manager.service';

@Injectable({
    providedIn: 'root',
})
export class GameSocketEventService {
    private gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    private notificationService: CombatNotificationService = inject(CombatNotificationService);
    private socketManager: SocketClientService = inject(SocketClientService);
    private router: Router;
    private fightEventsHandler: FightEventsHandlerService = inject(FightEventsHandlerService);
    private movementEventsHandler: MovementEventsHandlerService = inject(MovementEventsHandlerService);
    private gameInterfaceService: GameInterfaceService = inject(GameInterfaceService);
    private statisticsService: StatisticsManagerService = inject(StatisticsManagerService);
    private currentGamesService: CurrentGameManagerService = inject(CurrentGameManagerService);
    private limitOfItems: number = MAXIMUM_AMOUNT_OF_ITEM;
    private gameEventService: GameEventService = inject(GameEventService);
    gameEnding: boolean = false;

    configureBaseSocket(router: Router): void {
        if (this.socketManager.isSocketAlive()) {
            this.router = router;
            this.handleEndTurn();
            this.handleClock();
            this.handleStartTurn();
            this.handleEndGame();
            this.handleToggleDebugMode();
            this.fightEventsHandler.configureBaseSocket();
            this.movementEventsHandler.configureBaseSocket();
            this.handleUpdateGame();
            this.handleEndFightNotification();
            this.handleEscapeAttempt();
            this.handleDeactivateDebugMode();
            this.handlePickUpItem();
            this.handleDropItem();
        }
    }

    private handleEndTurn(): void {
        this.socketManager.on(SocketClientEventNames.EndTurn, (data: dataForm.EndTurnRes) => {
            if (!data.successful) {
                return;
            }

            this.gameSessionManager.updateNbOfActions(INITIAL_AMOUNT_OF_ACTION);
            this.gameSessionManager.updateNbOfEvasions(INITIAL_AMOUNT_OF_EVASION);
            this.gameSessionManager.updatePlayersInfos(data.listOfPlayers, data.activePlayer);

            if (this.gameSessionManager.chosenPlayer().inventory?.some((item) => item.name === ItemName.GameEditor2)) {
                this.gameSessionManager.updateNbOfActions(2);
            }

            this.notificationService.showTurnTransition();
            this.gameSessionManager.changeState(PlayerState.Transitioning);
            if (this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.activePlayer().name) {
                if (this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.activePlayer().name) {
                    this.gameEventService.showLogTurnNotification();
                }
                if (!data.activePlayer.virtualPlayer) {
                    this.gameSessionManager.updateChosenPlayer(data.activePlayer);
                }
            }
        });
    }

    private handleStartTurn(): void {
        this.socketManager.on(SocketClientEventNames.StartTurn, (data: dataForm.StartTurnRes) => {
            if (!data.successful) {
                return;
            }

            this.notificationService.hideTurnTransition();
            this.gameSessionManager.changeState(PlayerState.WaitingForTurn);
            if (this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.activePlayer().name) {
                this.gameSessionManager.changeState(PlayerState.WaitingForAction);
                this.gameSessionManager.updateCanEndTurn(true);
            }
        });
    }

    private handleClock(): void {
        this.socketManager.on(SocketClientEventNames.Clock, (data: dataForm.ClockRes) => {
            if (!data.successful) {
                return;
            }
            this.gameSessionManager.updateTurnClockValue(data.turnClockValue);
            this.gameSessionManager.updateFightClockValue(data.fightClockValue);
            if (data.turnClockValue === TURN_TIME_LIMIT_SEC) {
                if (this.gameSessionManager.playerState() === PlayerState.WaitingForAction) {
                    this.gameSessionManager.endTurn();
                }
            }
            if (this.gameSessionManager.playerState() === PlayerState.Attacking) {
                const timeLimit = this.gameSessionManager.nbOfEvasions() > 0 ? ATTACK_LARGE_TIME_LIMIT_SEC : ATTACK_SMALL_TIME_LIMIT_SEC;
                if (data.fightClockValue === timeLimit) {
                    this.gameSessionManager.attackPlayer();
                }
            }
            if (this.gameSessionManager.switchingTurn) {
                this.gameSessionManager.updateFightClockValue(0);
            }
        });
    }

    private handleEndGame(): void {
        this.socketManager.on(SocketClientEventNames.EndGame, (data: dataForm.EndGameRes) => {
            if (!data.successful) {
                return;
            }

            // if (data.winner) {
            //     const isCurrentPlayerWinner = data.winner.userId === this.gameSessionManager.chosenPlayer().userId;

            //     if (isCurrentPlayerWinner) {
            //         // Show winner notification with prize
            //         this.notificationService.showWinnerNotification(/* prize amount */);
            //     } else {
            //         // Show consolation notification
            //         this.notificationService.showConsolationNotification(/* prize amount */);
            //     }
            // }

            const gameId = this.gameSessionManager.gameId();
            if (data.globalStats && data.listOfPlayerStats) {
                this.statisticsService.reset();
                this.statisticsService.displayedGlobalStatistics.set(data.globalStats);
                for (const stat of data.listOfPlayerStats) {
                    const { name, ...rest } = stat;
                    this.statisticsService.playerStatisticsMap.set(name, signal(rest));
                }
            }
            if (gameId === EMPTY_CODE) {
                return;
            }
            const gapMsec = 100;
            const endGameNotificationStartingTime = 500;
            const endGameNotificationEndingTime = 2800;

            this.currentGamesService.displayedCurrentGame().entryPrice;

            // const WINNER_REWARD = Number(entryPrice * this.gameSessionManager.listOfPlayers.length * 2) / 3;
            // const CONSOLATION_REWARD = Number(entryPrice * this.gameSessionManager.listOfPlayers.length) / 3;
            // if (!data.winner) return;

            // // Handling winner reward
            // const isVp = data.winner?.virtualPlayer;
            // if (isVp) {
            //     return;
            // }
            // const user = await this.usersService.getUser(data.winner.userId);
            // if (!user) return;
            // await this.usersService.updateUser({ ...user, money: user.money + WINNER_REWARD });

            // // Handling losers reward
            // this.gameSessionManager.listOfPlayers.forEach(async (player) => {
            //     if (player.userId !== data.winner?.userId) {
            //         const isVp = player?.virtualPlayer;
            //         if (isVp) {
            //             return;
            //         }
            //         const loserUser = await this.usersService.getUser(player.userId);
            //         if (!loserUser) return;
            //         await this.usersService.updateUser({ ...loserUser, money: loserUser.money + CONSOLATION_REWARD });
            //     }
            // });

            this.gameSessionManager.changeState(PlayerState.EndGame);
            this.hideNotifications();

            setTimeout(() => {
                this.gameEventService.showLogEndNotification();
            }, 0);

            setTimeout(
                () => {
                    this.gameSessionManager.leaveGame();
                },
                (this.gameSessionManager.chosenPlayer().leavingKey ?? 1) * gapMsec,
            );

            setTimeout(() => {
                this.chooseEndGameNotification(data);
            }, endGameNotificationStartingTime);

            setTimeout(() => {
                this.notificationService.hideGameOverNotification();
                this.hideNotifications();
            }, endGameNotificationEndingTime);

            setTimeout(() => {
                this.gameEnding = false;
                this.router.navigate([UrlPage.Statistics], {
                    state: { data: gameId },
                });
            }, ENDGAME_COOL_DOWN_MSEC);
        });
    }

    private handleUpdateGame(): void {
        this.socketManager.on(SocketClientEventNames.UpdateGame, (data: dataForm.UpdateGamedRes) => {
            if (!data.successful) {
                return;
            }

            this.gameSessionManager.updateBoardGame(data.boardGame);
            this.gameSessionManager.updateActivePlayer(data.activePlayer);
            this.gameSessionManager.updateListOfPlayers(data.listOfPlayers);

            if (this.gameSessionManager.playerState() === PlayerState.WaitingForAction) {
                this.gameSessionManager.changeState(PlayerState.WaitingForAction);
            }
            if (this.gameSessionManager.listOfPlayers.length !== this.gameEventService.numberOfPlayersInit) {
                this.gameEventService.showLogAbandonNotification(data.activePlayer);
            }
        });
    }

    private handleEndFightNotification(): void {
        this.socketManager.on(SocketClientEventNames.ShowEndFightNotification, (data: dataForm.endFightNotification) => {
            if (!data.successful) {
                return;
            }

            const chosenPlayerName = this.gameSessionManager.chosenPlayer().name;
            if (data.winnerName && data.loserName) {
                if (data.winnerName === chosenPlayerName) {
                    this.notificationService.showVictoryNotification();
                    this.gameEventService.showLogEndFightNotification(data);
                    this.gameEventService.showLogResultFightNotification(data);
                } else if (data.loserName === chosenPlayerName) {
                    this.notificationService.showDefeatNotification();
                }
            }
        });
    }

    private handleEscapeAttempt(): void {
        this.socketManager.on(SocketClientEventNames.ProcessEscapeAttempt, (data: dataForm.EscapeAttemptRes) => {
            if (!data.successful) {
                return;
            }

            if (data.message.includes('escaped')) {
                this.gameInterfaceService.hideInterface();
            }
        });
    }
    private handleToggleDebugMode(): void {
        this.socketManager.on(SocketClientEventNames.ToggleDebugMode, (data: dataForm.ToggleDebugModeRes) => {
            if (!data.successful) {
                return;
            }

            this.gameSessionManager.updateDebugMode(data.debugModeStatus);
            this.gameSessionManager.updateCanToggleDebugMode(true);
        });
    }

    private handleDeactivateDebugMode(): void {
        this.socketManager.on(SocketClientEventNames.DeactivateDebugMode, (data: dataForm.DeactivateDebugModeRes) => {
            if (!data.successful) {
                return;
            }

            this.gameSessionManager.updateDebugMode(data.debugModeStatus);
        });
    }

    private handlePickUpItem(): void {
        this.socketManager.on(SocketClientEventNames.PickUpItem, (data: dataForm.PickUpItemRes) => {
            if (!data.successful) {
                return;
            }

            this.gameSessionManager.updateBoardGame(data.boardGame);
            this.gameSessionManager.updatePlayersInfos(data.listOfPlayers, data.activePlayer);

            this.gameSessionManager.updateCanPickUpItem(true);

            if (this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.activePlayer().name) {
                if (data.pickedItem?.name === ItemName.GameEditor2) {
                    this.gameSessionManager.incrementAmountOfAction();
                }

                if (data.pickedItem?.name === ItemName.GameEditor1) {
                    this.limitOfItems++;
                }

                this.checkInventoryLimit();
                if (data.pickedItem?.name === ItemName.Flag) {
                    this.gameEventService.showLogFlagNotification(data);
                } else {
                    this.gameEventService.showLogItemNotification(data);
                }
            }
        });
    }
    private hideNotifications(): void {
        this.gameInterfaceService.hideInterface();
        this.gameInterfaceService.hideEscapeConfirmation();
        this.notificationService.hideTurnTransition();
        this.notificationService.hideDefeatNotification();
        this.notificationService.hideVictoryNotification();
    }

    private handleDropItem(): void {
        this.socketManager.on(SocketClientEventNames.DropItem, (data: dataForm.DropItemRes) => {
            if (!data.successful) {
                return;
            }

            this.gameSessionManager.updateBoardGame(data.boardGame);
            this.gameSessionManager.updatePlayersInfos(data.listOfPlayers, data.activePlayer);

            this.gameSessionManager.updateCanDropItem(true);

            if (this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.activePlayer().name) {
                if (data.droppedItem?.name === ItemName.GameEditor2) {
                    this.gameSessionManager.decrementAmountOfAction();
                }
                if (data.droppedItem?.name === ItemName.GameEditor1) {
                    this.limitOfItems = MAXIMUM_AMOUNT_OF_ITEM;
                    this.checkInventoryLimit();
                } else {
                    this.gameSessionManager.changeState(PlayerState.WaitingForAction);
                }
                if (this.gameSessionManager.shouldChangeTurn()) {
                    this.gameSessionManager.endTurn();
                }
            }
        });
    }

    private checkInventoryLimit() {
        const inventory = this.gameSessionManager.chosenPlayer().inventory;
        if (inventory && inventory.length >= this.limitOfItems) {
            this.gameSessionManager.changeState(PlayerState.DroppingItem);
            this.gameSessionManager.updateShowDropItemInterface(true);
        } else {
            this.gameSessionManager.changeState(PlayerState.WaitingForAction);
            if (this.gameSessionManager.shouldChangeTurn()) {
                this.gameSessionManager.endTurn();
            }
        }
    }

    private chooseEndGameNotification(data: dataForm.EndGameRes) {
        if (data.winner) {
            this.notificationService.showGameOverNotification(data.winner.name);
        } else if (data.winnerTeam) {
            const message = "l'équipe " + data.winnerTeam;
            this.notificationService.showGameOverNotification(message);
        } else {
            this.notificationService.showGameOverNotification();
        }
        return;
    }
}
