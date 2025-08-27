import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { GameMode } from '@common/enums/game-mode';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import * as dataForm from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';
import { AgressiveCTFBehaviorInGame } from '@app/classes/agressive-ctf-behavior-in-game/agressive-ctf-behavior-in-game';
import { AgressiveNormalBehaviorInGame } from '@app/classes/agressive-normal-behavior-in-game/agressive-normal-behavior-in-game';
import { DefensiveCTFBehaviorInGame } from '@app/classes/defensive-ctf-behavior-in-game/defensive-ctf-behavior-in-game';
import { DefensiveNormalBehaviorInGame } from '@app/classes/defensive-normal-behavior-in-game/defensive-normal-behavior-in-game';

export class VpBehaviorInGame {
    private defensiveNormalBehavior: DefensiveNormalBehaviorInGame;
    private agressiveNormalBehavior: AgressiveNormalBehaviorInGame;
    private defensiveCTFBehavior: DefensiveCTFBehaviorInGame;
    private agressiveCTFBehavior: AgressiveCTFBehaviorInGame;
    private vpState: VpState;

    constructor() {
        this.vpState = new VpState();
        this.defensiveNormalBehavior = new DefensiveNormalBehaviorInGame(this.vpState);
        this.agressiveNormalBehavior = new AgressiveNormalBehaviorInGame(this.vpState);
        this.defensiveCTFBehavior = new DefensiveCTFBehaviorInGame(this.vpState);
        this.agressiveCTFBehavior = new AgressiveCTFBehaviorInGame(this.vpState);
    }

    handleBehavior(vpSocket: VpSocketManager, gameId: string, activeVirtualPlayer: VirtualPlayer, gameState: dataForm.GetGameStateRes): void {
        if (gameState.boardGame.gameMode === GameMode.Normal) {
            if (activeVirtualPlayer.profile === VirtualPlayerProfile.Agressive) {
                this.agressiveNormalBehavior.handleBehavior(vpSocket, gameId, activeVirtualPlayer, gameState);
            } else if (activeVirtualPlayer.profile === VirtualPlayerProfile.Defensive) {
                this.defensiveNormalBehavior.handleBehavior(vpSocket, gameId, activeVirtualPlayer, gameState);
            }
        } else if (gameState.boardGame.gameMode === GameMode.CTF) {
            if (activeVirtualPlayer.profile === VirtualPlayerProfile.Agressive) {
                this.agressiveCTFBehavior.handleBehavior(vpSocket, gameId, activeVirtualPlayer, gameState);
            } else if (activeVirtualPlayer.profile === VirtualPlayerProfile.Defensive) {
                this.defensiveCTFBehavior.handleBehavior(vpSocket, gameId, activeVirtualPlayer, gameState);
            }
        }
    }
}
