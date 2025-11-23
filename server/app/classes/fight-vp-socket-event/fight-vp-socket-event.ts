import { BaseVpSocketEvent } from '@app/classes/base-vp-socket-event/base-vp-socket-event';
import { VpBehaviorInFight } from '@app/classes/vp-behavior-in-fight/vp-behavior-in-fight';
import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { friendEvents } from '@app/events/friendEvents';
import { GameEventType } from '@common/enums/game-event-type';
import { PlayerState } from '@common/enums/player-state';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { GameEvent } from '@common/game-event';
import { Player } from '@common/player';
import * as dataForm from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';

export class FightVpSocketEvent extends BaseVpSocketEvent {
    private readonly timeToAttack = 2;
    private initialHealth: number;

    constructor(
        private readonly vpBehaviorInFight: VpBehaviorInFight,
        vpSocketEventConfig: { gameId: string; virtualPlayer: VirtualPlayer; vpGameSessionManager: VpGameSessionManager; vpState: VpState },
    ) {
        super(vpSocketEventConfig.gameId, vpSocketEventConfig.virtualPlayer, vpSocketEventConfig.vpGameSessionManager, vpSocketEventConfig.vpState);
    }

    configure(vpSocket: VpSocketManager): void {
        this.registerClock(vpSocket);
        this.handleStartFight(vpSocket);
        this.handleSwitchTurn(vpSocket);
        this.handleEndFight(vpSocket);
        this.handleEscapeAttempt(vpSocket);
        this.handleAttack(vpSocket);
    }
    protected handleClock(data: dataForm.ClockRes, vpSocket: VpSocketManager): void {
        if (data.fightClockValue !== this.timeToAttack) return;
        const attacker = this.vpGameSessionManager.attackingPlayer.get();
        if (attacker?.name === this.virtualPlayer.name) {
            this.vpBehaviorInFight.handleBehavior(vpSocket, this.gameId, attacker as VirtualPlayer, this.gameState, this.initialHealth);
        }
    }

    private emitCombatLog(vpSocket: VpSocketManager, gameId: string, gameEvent: GameEvent, callback?: (response: unknown) => void): void {
        vpSocket.clientSocket.emit('combat-log', { gameId, gameEvent }, callback);
    }

    private emitLog(vpSocket: VpSocketManager, gameId: string, gameEvent: GameEvent, callback?: (response: unknown) => void): void {
        vpSocket.clientSocket.emit('change-turn-log', { gameId, gameEvent }, callback);
    }

    private handleStartFight(vpSocket: VpSocketManager): void {
        vpSocket.clientSocket.on(SocketClientEventNames.StartFight, async (data: dataForm.StartFightRes) => {
            await this.getActivePlayer(vpSocket);

            this.vpGameSessionManager.updateGameState(data);
            this.vpGameSessionManager.updateAttackingPlayer(data.attackingPlayer);
            this.vpGameSessionManager.updateDefendingPlayer(data.defendingPlayer);
            this.vpGameSessionManager.updateCanExecuteAttack(true);
            this.vpGameSessionManager.updateCanEscape(true);
            this.vpGameSessionManager.updateCanStartFight(false);

            if (this.virtualPlayer.name === data.attackingPlayer.name) {
                this.vpGameSessionManager.changeState(PlayerState.Attacking);
                this.initialHealth = this.activePlayer.attributes.healthValue;
                this.showLogStartAttackNotification(vpSocket, data);
            } else if (this.virtualPlayer.name === data.defendingPlayer.name) {
                this.vpGameSessionManager.changeState(PlayerState.Defending);
                this.initialHealth = this.activePlayer.attributes.healthValue;
            } else {
                this.vpGameSessionManager.changeState(PlayerState.SpectatingFight);
            }
        });
    }

    private handleSwitchTurn(vpSocket: VpSocketManager): void {
        vpSocket.clientSocket.on(SocketClientEventNames.SwitchTurn, (data: dataForm.SwitchTurn) => {
            this.vpGameSessionManager.updateGameState(data);
            this.vpGameSessionManager.updateAttackingPlayer(data.attackingPlayer);
            this.vpGameSessionManager.updateDefendingPlayer(data.defendingPlayer);

            if (this.virtualPlayer.name === data.attackingPlayer.name) {
                this.vpGameSessionManager.changeState(PlayerState.Attacking);
            } else if (this.virtualPlayer.name === data.defendingPlayer.name) {
                this.vpGameSessionManager.changeState(PlayerState.Defending);
            } else {
                this.vpGameSessionManager.changeState(PlayerState.SpectatingFight);
            }
        });
    }

    private handleEndFight(vpSocket: VpSocketManager): void {
        vpSocket.clientSocket.on(SocketClientEventNames.EndFight, async (data: dataForm.EndFightRes) => {
            await Promise.all([this.getGameState(vpSocket), this.getActivePlayer(vpSocket)]);

            if (this.isVPTurn(vpSocket)) {
                const endTurnData: dataForm.EndTurnReq = {
                    gameCode: this.gameId,
                };
                vpSocket.clientSocket.emit(SocketClientEventNames.EndTurn, endTurnData);
            }

            this.vpGameSessionManager.updateGameState(data);
            if (data.attackingPlayer) {
                this.vpGameSessionManager.updateAttackingPlayer(data.attackingPlayer);
            }
            this.vpGameSessionManager.updateCanExecuteAttack(false);
            this.vpGameSessionManager.updateCanEscape(false);
            this.vpGameSessionManager.updateCanStartFight(true);
            this.vpGameSessionManager.updateCanToggleDoor(true);
            this.vpGameSessionManager.updateCanPickUpItem(true);
            this.vpGameSessionManager.updateCanDropItem(true);
            this.vpGameSessionManager.updateCanEndTurn(true);

            if (this.virtualPlayer.name === data.activePlayer.name) {
                this.showLogResultFightNotification(vpSocket, data);
                this.vpGameSessionManager.changeState(PlayerState.WaitingForAction);
            } else {
                this.vpGameSessionManager.changeState(PlayerState.WaitingForTurn);
            }

            if (this.virtualPlayer.name === data.loserName) {
                const payload = { player: this.virtualPlayer, gameId: this.gameId };
                friendEvents.emit('vp-eliminated', payload);
            }
        });
    }

    private handleEscapeAttempt(vpSocket: VpSocketManager): void {
        vpSocket.clientSocket.on(SocketClientEventNames.ProcessEscapeAttempt, (data: dataForm.EscapeAttemptRes) => {
            if (data.escapingPlayer.name === this.virtualPlayer.name) {
                this.showResultEscapeNotification(vpSocket, data);
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

    private handleAttack(vpSocket: VpSocketManager): void {
        vpSocket.clientSocket.on(SocketClientEventNames.ProcessAttack, (data: dataForm.ExecuteAttackRes) => {
            if (this.virtualPlayer.name === data.attackingPlayer.name) {
                this.showLogAttackNotification(
                    vpSocket,
                    data,
                    this.vpGameSessionManager.attackingPlayer.get() as VirtualPlayer,
                    this.vpGameSessionManager.defendingPlayer.get(),
                );
            }
        });
    }

    private showLogAttackNotification(
        vpSocket: VpSocketManager,
        data: dataForm.ExecuteAttackRes,
        attackingPlayer: VirtualPlayer,
        defendingPlayer: Player,
    ) {
        const gameEvent: GameEvent = {
            message: `${data.attackingPlayer.name} roule ${data.attackDice} \n
            ${data.defendingPlayer.name} roule ${data.defenseDice} \n
            ~   ${data.damageDoneAttackingPlayer} points de vie perdus    ~`,
            timestamp: new Date(),
            type: GameEventType.Fight,
            player: [attackingPlayer.name, defendingPlayer.name],
        };

        this.emitCombatLog(vpSocket, this.gameId, gameEvent);
    }

    private showResultEscapeNotification(vpSocket: VpSocketManager, data: dataForm.EscapeAttemptRes) {
        const gameEvent: GameEvent = {
            message: `${data.escapingPlayer?.name ?? 'Un joueur inconnu'} essaie de s'évader contre ${data.defenderPlayer?.name}. \n\n
             ${data.escapingPlayer?.name ?? 'Un joueur inconnu'} a ${data.message.includes('escaped') ? "réussi l'évasion" : "échoué l'évasion"}`,
            timestamp: new Date(),
            type: GameEventType.Escape,
            player: [data.escapingPlayer?.name ?? 'Un joueur inconnu', data.defenderPlayer?.name ?? 'Un défendeur inconnu'],
        };

        this.emitCombatLog(vpSocket, this.gameId, gameEvent);
    }

    private showLogResultFightNotification(vpSocket: VpSocketManager, data: dataForm.EndFightRes) {
        const gameEvent: GameEvent = {
            message: `${data.winnerName} a gagné et ${data.loserName} a perdu le combat`,
            timestamp: new Date(),
            type: GameEventType.EndFight,
            player: [data.winnerName, data.loserName],
        };

        this.emitLog(vpSocket, this.gameId, gameEvent);

        const gameEvent2: GameEvent = {
            message: `${data.winnerName} et ${data.loserName} ont terminé le combat`,
            timestamp: new Date(),
            type: GameEventType.EndFight,
            player: [data.winnerName, data.loserName],
        };

        this.emitLog(vpSocket, this.gameId, gameEvent2);
    }

    private showLogStartAttackNotification(vpSocket: VpSocketManager, data: dataForm.StartFightRes) {
        const defenderPlayer = data.defendingPlayer.name;
        const attackingPlayer = data.attackingPlayer.name;
        const gameEvent: GameEvent = {
            message: `${attackingPlayer} commence le combat avec ${defenderPlayer}`,
            timestamp: new Date(),
            type: GameEventType.StartFight,
            player: [data.attackingPlayer.name, data.defendingPlayer.name],
        };

        this.emitLog(vpSocket, this.gameId, gameEvent);
    }
}
