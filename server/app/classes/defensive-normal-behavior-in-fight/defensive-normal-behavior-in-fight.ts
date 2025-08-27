import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { SocketServerEventNames } from '@common/enums/socket-events-names';
import * as dataForm from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';

export class DefensiveNormalBehaviorInFight {
    private vpGameSessionManager: VpGameSessionManager;

    constructor(vpGameSessionManager: VpGameSessionManager) {
        this.vpGameSessionManager = vpGameSessionManager;
    }

    handleBehavior(vpSocket: VpSocketManager, gameId: string, activeVirtualPlayer: VirtualPlayer, initialHealth: number): void {
        if (this.vpGameSessionManager.attackingPlayer.get().name === activeVirtualPlayer.name) {
            if (activeVirtualPlayer.attributes.healthValue === initialHealth) {
                this.executeAttack(vpSocket, gameId);
            } else if (activeVirtualPlayer.attributes.healthValue < initialHealth && this.vpGameSessionManager.nbOfEvasions.get() > 0) {
                this.attemptEscape(vpSocket, gameId);
            } else {
                this.executeAttack(vpSocket, gameId);
            }
        }
    }

    private attemptEscape(vpSocket: VpSocketManager, gameId: string): void {
        const data: dataForm.EscapeAttemptReq = {
            gameCode: gameId,
        };

        vpSocket.clientSocket.emit(SocketServerEventNames.AttemptEscape, data);
    }

    private executeAttack(vpSocket: VpSocketManager, gameId: string): void {
        const data: dataForm.ExecuteAttackReq = {
            gameCode: gameId,
        };

        vpSocket.clientSocket.emit(SocketServerEventNames.ExecuteAttack, data);
    }
}
