import { NormalBehaviorInGame } from '@app/classes/vp-normal-behavior-in-game/vp-normal-behavior-in-game';
import { isDefinedAndFinite } from '@app/classes/vp-path-board-game-helpers/vp-path-board-game-helpers';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { BoardGameGraph } from '@app/classes/board-game-graph/board-game-graph';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';

export class AgressiveNormalBehaviorInGame extends NormalBehaviorInGame {
    handleBehavior(vpSocket: VpSocketManager, gameId: string, activeVirtualPlayer: VirtualPlayer, initialGameState: dataForm.GetGameStateRes): void {
        this.gameState = initialGameState;
        const initialPosition = activeVirtualPlayer.position;
        if (!initialPosition) return;

        const reachable = this.findReachableAdjacentPlayer(activeVirtualPlayer);
        if (reachable) {
            this.vpState.isMovingToItem = false;
            this.moveVirtualPlayer(vpSocket, reachable.path, gameId, this.vpState.isMovingToItem);
        } else {
            const nearestItem = this.findNearestPreferredItem(activeVirtualPlayer);
            if (nearestItem) {
                this.vpState.isMovingToItem = true;
                this.moveVirtualPlayer(vpSocket, nearestItem.path, gameId, this.vpState.isMovingToItem);
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
    }

    protected getPreferredItemType(): VpPreferenceItem {
        return VpPreferenceItem.Aggressive;
    }

    protected findReachableAdjacentPlayer(virtualPlayer: VirtualPlayer): { path: Position[]; position: Position } | null {
        const ignoreDoorState = true;
        const ignorePlayer = true;
        const playerPosition = virtualPlayer.position;

        const graph = new BoardGameGraph(this.gameState.boardGame.tiles, ignoreDoorState, ignorePlayer);
        graph.findDistances(playerPosition);

        for (const other of this.gameState.listOfPlayers) {
            if (other.name === virtualPlayer.name) continue;
            const pos = other.position;
            const adjacent = this.findAdjacentPosition(pos);
            if (!adjacent) continue;
            const node = graph.getNodes()[adjacent.x][adjacent.y];
            const path = this.findPathToAdjacentPosition(graph, node);
            const distance = graph.getDistances().get(node);

            if (path && path.length > 1 && isDefinedAndFinite(distance) && distance <= virtualPlayer.attributes.speedValue) {
                return { path, position: adjacent };
            }
        }
        return null;
    }
}
