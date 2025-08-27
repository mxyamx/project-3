import { NormalBehaviorInGame } from '@app/classes/vp-normal-behavior-in-game/vp-normal-behavior-in-game';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';
import * as dataForm from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';

export class DefensiveNormalBehaviorInGame extends NormalBehaviorInGame {
    handleBehavior(vpSocket: VpSocketManager, gameId: string, activeVirtualPlayer: VirtualPlayer, initialGameState: dataForm.GetGameStateRes): void {
        this.gameState = initialGameState;
        const initialPosition = activeVirtualPlayer.position;
        if (!initialPosition) return;

        const nearestPreferredItem = this.findNearestPreferredItem(activeVirtualPlayer);

        if (nearestPreferredItem) {
            this.vpState.isMovingToItem = true;
            this.moveVirtualPlayer(vpSocket, nearestPreferredItem.path, gameId, this.vpState.isMovingToItem);
        } else {
            const nearestPlayer = this.findNearestPlayer(activeVirtualPlayer);

            if (nearestPlayer) {
                this.vpState.isMovingToItem = false;
                this.moveVirtualPlayer(vpSocket, nearestPlayer.path, gameId, this.vpState.isMovingToItem);
            } else {
                vpSocket.clientSocket.emit(SocketClientEventNames.EndTurn, { gameCode: gameId });
            }
        }
    }
    protected getPreferredItemType(): VpPreferenceItem {
        return VpPreferenceItem.Defensive;
    }
}
