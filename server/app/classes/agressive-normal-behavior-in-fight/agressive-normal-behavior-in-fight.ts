import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { SocketServerEventNames } from '@common/enums/socket-events-names';
import * as dataForm from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';

export class AgressiveNormalBehaviorInFight {
    private vpGameSessionManager: VpGameSessionManager;

    constructor(vpGameSessionManager: VpGameSessionManager) {
        this.vpGameSessionManager = vpGameSessionManager;
    }

    handleBehavior(vpSocket: VpSocketManager, gameId: string, activeVirtualPlayer: VirtualPlayer): void {
        if (this.vpGameSessionManager.attackingPlayer.get().name === activeVirtualPlayer.name) {
            this.executeAttack(vpSocket, gameId);
        }
    }

    private executeAttack(vpSocket: VpSocketManager, gameId: string): void {
        const data: dataForm.ExecuteAttackReq = {
            gameCode: gameId,
        };

        vpSocket.clientSocket.emit(SocketServerEventNames.ExecuteAttack, data);
    }
}
