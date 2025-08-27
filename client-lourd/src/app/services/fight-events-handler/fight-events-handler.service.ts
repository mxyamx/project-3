import { Injectable, inject } from '@angular/core';
import {
    INITIAL_AMOUNT_OF_EVASION,
    MAXIMUM_AMOUNT_OF_VICTORIES,
    STANDARD_LIST_PLAYERS,
    STANDARD_PLAYERS,
} from '@app/constants/development-constants';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { DiceService } from '@app/services/dice/dice.service';
import { GameEventService } from '@app/services/game-event/game-event.service';
import { GameInterfaceService } from '@app/services/game-interface/game-interface.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { StatisticsManagerService } from '@app/services/statistics-manager/statistics-manager.service';
import { GameMode } from '@common/enums/game-mode';
import { PlayerState } from '@common/enums/player-state';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { Player } from '@common/player';
import * as dataForm from '@common/socket-data-forms';

@Injectable({
    providedIn: 'root',
})
export class FightEventsHandlerService {
    private gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    private socketManager: SocketClientService = inject(SocketClientService);
    private playerSocket: PlayerSocketService = inject(PlayerSocketService);
    private gameInterfaceService: GameInterfaceService = inject(GameInterfaceService);
    private diceService: DiceService = inject(DiceService);
    private statisticsManager: StatisticsManagerService = inject(StatisticsManagerService);
    private gameEventService: GameEventService = inject(GameEventService);

    configureBaseSocket(): void {
        this.handleStartFight();
        this.handleAttack();
        this.handleSwitchTurn();
        this.handleEscapeAttempt();
        this.handleEndFight();
    }

    private handleStartFight(): void {
        this.socketManager.on(SocketClientEventNames.StartFight, (data: dataForm.StartFightRes) => {
            if (!data.successful) {
                if (this.gameSessionManager.playerState() === PlayerState.Attacking) {
                    this.gameSessionManager.updateCanStartFight(true);
                    this.gameSessionManager.changeState(PlayerState.WaitingForAction);
                }
                return;
            }
            this.gameSessionManager.updateLargestAmountOfEscape(0);
            this.gameSessionManager.updateChangeDisplayAttackClock(false);

            this.gameSessionManager.updatePlayersInfos(data.listOfPlayers, data.activePlayer);
            this.gameSessionManager.updateAttackingPlayer(data.attackingPlayer);
            this.gameSessionManager.updateDefendingPlayer(data.defendingPlayer);
            this.statisticsManager.updateCombatAmount(data.attackingPlayer.name);
            this.statisticsManager.updateCombatAmount(data.defendingPlayer.name);

            this.gameSessionManager.updateCanStartFight(true);
            this.gameSessionManager.updateCanExecuteAttack(true);
            this.gameSessionManager.updateCanEscape(true);

            this.gameSessionManager.updateFightClockValue(0);

            this.stateOnFightStart(data);
        });
    }

    private handleAttack(): void {
        this.socketManager.on(SocketClientEventNames.ProcessAttack, (data: dataForm.ExecuteAttackRes) => {
            if (!data.successful) {
                return;
            }

            if (data.damageDoneAttackingPlayer && data.damageTakenDefendingPlayer) {
                this.statisticsManager.addLifePointsLost(data.defendingPlayer.name, data.damageTakenDefendingPlayer);
                this.statisticsManager.addLifePointsOpponentLost(data.attackingPlayer.name, data.damageDoneAttackingPlayer);
            }

            this.gameSessionManager.updatePlayersInfos(data.listOfPlayers, data.activePlayer);
            this.gameSessionManager.updateAttackingPlayer(data.attackingPlayer);
            this.gameSessionManager.updateDefendingPlayer(data.defendingPlayer);

            this.diceService.setAttackDiceValue(data.attackDice ?? 0);
            this.diceService.setDefenseDiceValue(data.defenseDice ?? 0);
            const isCurrentPlayerAttacker = data.attackingPlayer.name === this.gameSessionManager.chosenPlayer().name;
            if (isCurrentPlayerAttacker) {
                this.gameEventService.showLogAttackNotification(data);
            }
            this.gameInterfaceService.hideEscapeConfirmation();
        });
    }

    private handleSwitchTurn(): void {
        this.socketManager.on(SocketClientEventNames.SwitchTurn, (data: dataForm.SwitchTurn) => {
            if (!data.successful) {
                return;
            }
            this.gameSessionManager.switchingTurn = true;
            this.gameSessionManager.updatePlayersInfos(data.listOfPlayers, data.activePlayer);
            this.gameSessionManager.updateAttackingPlayer(data.attackingPlayer);
            this.gameSessionManager.updateDefendingPlayer(data.defendingPlayer);

            this.stateOnSwitchTurn();

            this.gameInterfaceService.hideEscapeConfirmation();
            this.gameSessionManager.updateCanExecuteAttack(true);
            this.gameSessionManager.updateCanEscape(true);

            this.gameSessionManager.updateChangeDisplayAttackClock(data.changeDisplayAttackClock ?? false);
            this.gameSessionManager.updateFightClockValue(0);
            this.gameSessionManager.switchingTurn = false;
        });
    }

    private handleEscapeAttempt(): void {
        this.socketManager.on(SocketClientEventNames.ProcessEscapeAttempt, (data: dataForm.EscapeAttemptRes) => {
            const playerNames = [data.defenderPlayer, data.escapingPlayer]
                .filter((player): player is Player => player !== undefined)
                .map((player) => player.name);

            this.playerSocket.emitJoinCombatLogRoom(this.gameSessionManager.gameId(), playerNames);

            if (!data.successful) {
                return;
            }
            if (data.escapingPlayer) {
                this.statisticsManager.updateEscapeAmount(data.escapingPlayer.name);
            }

            if (data.message.includes('escaped')) {
                this.gameInterfaceService.hideInterface();
            }
            if (this.gameSessionManager.activePlayer().name === this.gameSessionManager.chosenPlayer().name) {
                this.gameEventService.showResultEscapeNotification(data);
            }
            this.gameSessionManager.updateLargestAmountOfEscape(data.largestAmountOfEScapeAttempts ?? 0);
        });
    }

    private handleEndFight(): void {
        this.socketManager.on(SocketClientEventNames.EndFight, (data: dataForm.EndFightRes) => {
            if (!data.successful) {
                return;
            }

            this.gameSessionManager.updateNbOfEvasions(INITIAL_AMOUNT_OF_EVASION);
            this.gameSessionManager.updatePlayersInfos(data.listOfPlayers, data.activePlayer);
            if (data.winnerName) {
                this.statisticsManager.updateVictoryAmount(data.winnerName);
            }
            if (data.loserName) {
                this.statisticsManager.updateDefeatAmount(data.loserName);
            }

            this.gameSessionManager.updateBoardGame(data.boardGame);

            const newAmountOfVictories = (data.attackingPlayer as Player).victories;

            if ((newAmountOfVictories ?? 0) >= MAXIMUM_AMOUNT_OF_VICTORIES && this.gameSessionManager.gameMode === GameMode.Normal) {
                this.gameSessionManager.changeState(PlayerState.EndGame);
            }

            this.stateOnEndFight(data);

            this.gameSessionManager.updateAttackingPlayer(STANDARD_PLAYERS[0]);
            this.gameSessionManager.updateDefendingPlayer(STANDARD_PLAYERS[0]);
            this.gameInterfaceService.hideInterface();
            this.gameSessionManager.updateLargestAmountOfEscape(0);
            this.gameSessionManager.updateChangeDisplayAttackClock(false);
            this.gameSessionManager.updateFightClockValue(0);
        });
    }

    private stateOnFightStart(data: dataForm.ExecuteAttackRes): void {
        if (this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.attackingPlayer().name) {
            this.gameSessionManager.changeState(PlayerState.Attacking);
            this.gameEventService.showLogStartAttackNotification(data);
            this.gameInterfaceService.showInterface();
        } else if (this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.defendingPlayer().name) {
            this.gameSessionManager.changeState(PlayerState.Defending);
            this.gameInterfaceService.showInterface();
        } else {
            this.gameSessionManager.changeState(PlayerState.SpectatingFight);
        }
    }

    private stateOnEndFight(data: dataForm.EndFightRes): void {
        if (this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.activePlayer().name) {
            this.gameSessionManager.changeState(PlayerState.WaitingForAction);
            if ((data.loserName ?? STANDARD_LIST_PLAYERS[0].name) === this.gameSessionManager.chosenPlayer().name) {
                this.gameSessionManager.endTurn();
            }
            if (this.gameSessionManager.shouldChangeTurn()) {
                this.gameSessionManager.endTurn();
            }
        } else {
            this.gameSessionManager.changeState(PlayerState.WaitingForTurn);
        }
    }

    private stateOnSwitchTurn(): void {
        if (this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.attackingPlayer().name) {
            this.gameSessionManager.changeState(PlayerState.Attacking);
        } else if (this.gameSessionManager.chosenPlayer().name === this.gameSessionManager.defendingPlayer().name) {
            this.gameSessionManager.changeState(PlayerState.Defending);
        } else {
            this.gameSessionManager.changeState(PlayerState.SpectatingFight);
        }
    }
}
