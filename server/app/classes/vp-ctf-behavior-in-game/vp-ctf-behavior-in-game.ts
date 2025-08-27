import { BaseVpBehaviorInGame } from '@app/classes/base-vp-behavior-in-game/base-vp-behavior-in-game';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { BoardGameGraph } from '@app/classes/board-game-graph/board-game-graph';
import { ItemType } from '@common/enums/item-type';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';
import { isDefinedAndFinite } from '@app/classes/vp-path-board-game-helpers/vp-path-board-game-helpers';

export abstract class CTFBehaviorInGame extends BaseVpBehaviorInGame {
    protected gameState: dataForm.GetGameStateRes;

    constructor(protected vpState: VpState) {
        super(vpState);
    }

    protected findFlag(): { item: Item; position: Position } | null {
        for (let i = 0; i < this.gameState.boardGame.tiles.length; i++) {
            for (let j = 0; j < this.gameState.boardGame.tiles[i].length; j++) {
                const tile = this.gameState.boardGame.tiles[i][j];
                const item = tile.containedItem;
                if (item && item.type === ItemType.Flag) {
                    return {
                        item,
                        position: { x: i, y: j },
                    };
                }
            }
        }
        return null;
    }

    protected findPlayerWithFlag(): Player | null {
        for (const player of this.gameState.listOfPlayers) {
            const playerHasFlag = player.inventory?.some((item) => item.type === ItemType.Flag) ?? false;

            if (playerHasFlag) {
                return player;
            }
        }
        return null;
    }

    protected hasFlag(virtualPlayer: VirtualPlayer): boolean {
        const doIHaveFlag = virtualPlayer.inventory?.some((item) => item.type === ItemType.Flag) ?? false;
        return doIHaveFlag;
    }

    protected findPathToFlag(virtualPlayer: VirtualPlayer): Position[] | null {
        const flag = this.findFlag();
        if (!flag) return null;

        const virtualPlayerCurrentPosition = virtualPlayer.position;
        if (!virtualPlayerCurrentPosition) return null;

        const ignoreDoorState = true;
        const ignorePlayer = false;

        const graph = new BoardGameGraph(this.gameState.boardGame.tiles, ignoreDoorState, ignorePlayer);
        graph.findDistances(virtualPlayerCurrentPosition);

        const targetNode = graph.getNodes()[flag.position.x][flag.position.y];
        const targetDistance = graph.getDistances().get(targetNode);

        if (targetDistance === Infinity) {
            const adjacentPosition = this.findAdjacentPosition(flag.position);

            if (adjacentPosition) {
                const adjacentNode = graph.getNodes()[adjacentPosition.x][adjacentPosition.y];
                const adjacentDistance = graph.getDistances().get(adjacentNode);

                if (adjacentDistance !== Infinity) {
                    const path = this.findPathToAdjacentPosition(graph, adjacentNode);

                    return path;
                }
            }
            return null;
        }

        return this.findPathToPosition(graph, targetNode);
    }

    protected findPathToStartPosition(virtualPlayer: VirtualPlayer): Position[] | null {
        const virtualPlayerStartPosition = virtualPlayer.startPosition;
        const virtualPlayerCurrentPosition = virtualPlayer.position;

        if (!virtualPlayerStartPosition || !virtualPlayerCurrentPosition) return null;

        const ignoreDoorState = true;
        const ignorePlayer = false;

        const graph = new BoardGameGraph(this.gameState.boardGame.tiles, ignoreDoorState, ignorePlayer);
        graph.findDistances(virtualPlayerCurrentPosition);

        const targetNode = graph.getNodes()[virtualPlayerStartPosition.x][virtualPlayerStartPosition.y];
        const targetDistance = graph.getDistances().get(targetNode);

        const pathReachable = isDefinedAndFinite(targetDistance);

        if (!pathReachable) return null;

        return this.findPathToPosition(graph, targetNode);
    }

    protected findPathToPlayerWithFlagStartPoint(activeVirtualPlayer: VirtualPlayer): Position[] | null {
        const flagCarrier = this.findPlayerWithFlag();
        const flagCarrierStart = flagCarrier?.startPosition;
        if (!flagCarrierStart) return null;

        const virtualPlayerCurrentPosition = activeVirtualPlayer.position;
        if (!virtualPlayerCurrentPosition) return null;

        const ignoreDoorState = true;
        const ignorePlayer = false;

        const graph = new BoardGameGraph(this.gameState.boardGame.tiles, ignoreDoorState, ignorePlayer);
        graph.findDistances(virtualPlayerCurrentPosition);

        const targetNode = graph.getNodes()[flagCarrierStart.x][flagCarrierStart.y];
        const targetDistance = graph.getDistances().get(targetNode);

        const pathReachable = isDefinedAndFinite(targetDistance);

        if (!pathReachable) return null;

        return this.findPathToPosition(graph, targetNode);
    }

    abstract handleBehavior(vpSocket: VpSocketManager, gameId: string, activeVirtualPlayer: VirtualPlayer, gameState: dataForm.GetGameStateRes): void;
}
