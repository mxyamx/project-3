import { CTFBehaviorInGame } from '@app/classes/vp-ctf-behavior-in-game/vp-ctf-behavior-in-game';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';
import { Player } from '@common/player';
import * as dataForm from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';

export class AgressiveCTFBehaviorInGame extends CTFBehaviorInGame {
    handleBehavior(vpSocket: VpSocketManager, gameId: string, activeVirtualPlayer: VirtualPlayer, initialGameState: dataForm.GetGameStateRes): void {
        this.gameState = initialGameState;
        const initialPosition = activeVirtualPlayer.position;
        if (!initialPosition) return;

        if (this.handleHasFlag(vpSocket, gameId, activeVirtualPlayer)) return;
        if (this.handleNobodyHasFlag(vpSocket, gameId, activeVirtualPlayer)) return;
        if (this.handlePlayerWithFlag(vpSocket, gameId, activeVirtualPlayer)) return;

        vpSocket.clientSocket.emit(SocketClientEventNames.EndTurn, { gameCode: gameId });
    }

    protected getPreferredItemType(): VpPreferenceItem {
        return VpPreferenceItem.Aggressive;
    }

    private handleNobodyHasFlag(vpSocket: VpSocketManager, gameId: string, activeVirtualPlayer: VirtualPlayer): boolean {
        const playerWithFlag = this.findPlayerWithFlag();
        if (!playerWithFlag) {
            const pathToFlag = this.findPathToFlag(activeVirtualPlayer);
            if (pathToFlag) {
                this.vpState.isMovingToItem = true;
                this.moveVirtualPlayer(vpSocket, pathToFlag, gameId, this.vpState.isMovingToItem);
                return true;
            }
        }
        const nearestPlayer = this.findNearestPlayer(activeVirtualPlayer);
        if (nearestPlayer) {
            this.vpState.isMovingToItem = false;
            this.moveVirtualPlayer(vpSocket, nearestPlayer.path, gameId, this.vpState.isMovingToItem);
            return true;
        }
        return false;
    }

    private handleHasFlag(vpSocket: VpSocketManager, gameId: string, activeVirtualPlayer: VirtualPlayer): boolean {
        if (this.hasFlag(activeVirtualPlayer)) {
            const pathToStart = this.findPathToStartPosition(activeVirtualPlayer);
            if (pathToStart) {
                this.vpState.isMovingToItem = false;
                this.moveVirtualPlayer(vpSocket, pathToStart, gameId, this.vpState.isMovingToItem);
                return true;
            }

            const startPosition = activeVirtualPlayer.startPosition;
            if (startPosition) {
                const playerAtStart = this.findPathToPlayerAtPosition(activeVirtualPlayer, startPosition);
                if (playerAtStart) {
                    this.vpState.isMovingToItem = false;
                    this.moveVirtualPlayer(vpSocket, playerAtStart.path, gameId, this.vpState.isMovingToItem);
                    return true;
                }
            }

            const nearestPlayer = this.findNearestPlayer(activeVirtualPlayer);
            if (nearestPlayer) {
                this.vpState.isMovingToItem = false;
                this.moveVirtualPlayer(vpSocket, nearestPlayer.path, gameId, this.vpState.isMovingToItem);
                return true;
            }
        }
        return false;
    }

    private handleSameTeamStrategy(vpSocket: VpSocketManager, gameId: string, activeVirtualPlayer: VirtualPlayer): boolean {
        const nearestPlayer = this.findNearestPlayer(activeVirtualPlayer);
        if (nearestPlayer) {
            this.vpState.isMovingToItem = false;
            this.moveVirtualPlayer(vpSocket, nearestPlayer.path, gameId, this.vpState.isMovingToItem);
            return true;
        }
        const nearestPreferredItem = this.findNearestPreferredItem(activeVirtualPlayer);
        if (nearestPreferredItem) {
            this.vpState.isMovingToItem = true;
            this.moveVirtualPlayer(vpSocket, nearestPreferredItem.path, gameId, this.vpState.isMovingToItem);
            return true;
        }
        return false;
    }

    private handleEnemyWithFlag(vpSocket: VpSocketManager, gameId: string, activeVirtualPlayer: VirtualPlayer, playerWithFlag: Player): boolean {
        const playerWithFlagPosition = playerWithFlag.position;
        if (playerWithFlagPosition) {
            const pathToPlayerWithFlag = this.findPathToPlayerAtPosition(activeVirtualPlayer, playerWithFlagPosition);
            if (pathToPlayerWithFlag) {
                this.vpState.isMovingToItem = false;
                this.moveVirtualPlayer(vpSocket, pathToPlayerWithFlag.path, gameId, this.vpState.isMovingToItem);
                return true;
            }
        }
        const fallback = this.findNearestPlayer(activeVirtualPlayer);
        if (fallback) {
            this.vpState.isMovingToItem = false;
            this.moveVirtualPlayer(vpSocket, fallback.path, gameId, this.vpState.isMovingToItem);
            return true;
        }
        return false;
    }
    private handlePlayerWithFlag(vpSocket: VpSocketManager, gameId: string, activeVirtualPlayer: VirtualPlayer): boolean {
        const playerWithFlag = this.findPlayerWithFlag();
        if (!playerWithFlag) return false;

        if (this.isInSameTeam(activeVirtualPlayer, playerWithFlag) && !this.hasFlag(activeVirtualPlayer)) {
            return this.handleSameTeamStrategy(vpSocket, gameId, activeVirtualPlayer);
        } else {
            return this.handleEnemyWithFlag(vpSocket, gameId, activeVirtualPlayer, playerWithFlag);
        }
    }
}
