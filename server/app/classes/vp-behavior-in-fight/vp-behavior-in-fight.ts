import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import * as dataForm from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';
import { DefensiveNormalBehaviorInFight } from '@app/classes/defensive-normal-behavior-in-fight/defensive-normal-behavior-in-fight';
import { AgressiveNormalBehaviorInFight } from '@app/classes/agressive-normal-behavior-in-fight/agressive-normal-behavior-in-fight';

export class VpBehaviorInFight {
    private defensiveNormalBehaviorInFight: DefensiveNormalBehaviorInFight;
    private agressiveNormalBehaviorInFight: AgressiveNormalBehaviorInFight;
    private vpGameSessionManager: VpGameSessionManager;

    constructor(vpGameSessionManager: VpGameSessionManager) {
        this.vpGameSessionManager = vpGameSessionManager;
        this.defensiveNormalBehaviorInFight = new DefensiveNormalBehaviorInFight(this.vpGameSessionManager);
        this.agressiveNormalBehaviorInFight = new AgressiveNormalBehaviorInFight(this.vpGameSessionManager);
    }

    handleBehavior(
        vpSocket: VpSocketManager,
        gameId: string,
        activeVirtualPlayer: VirtualPlayer,
        gameState: dataForm.GetGameStateRes,
        initialHealth: number,
    ): void {
        if (activeVirtualPlayer.profile === VirtualPlayerProfile.Agressive) {
            this.agressiveNormalBehaviorInFight.handleBehavior(vpSocket, gameId, activeVirtualPlayer);
        } else if (activeVirtualPlayer.profile === VirtualPlayerProfile.Defensive) {
            this.defensiveNormalBehaviorInFight.handleBehavior(vpSocket, gameId, activeVirtualPlayer, initialHealth);
        }
    }
}
