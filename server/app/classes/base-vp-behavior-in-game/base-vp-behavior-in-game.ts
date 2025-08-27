import { getDirections, inBounds, isDefinedAndFinite } from '@app/classes/vp-path-board-game-helpers/vp-path-board-game-helpers';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { FROM_ITEM_NAME_TO_VP_PREFERENCE } from '@app/constants/objects-constants';
import { BoardGameGraph, BoardGameNode } from '@app/classes/board-game-graph/board-game-graph';
import { SocketServerEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import { Tile } from '@common/tile';
import { VirtualPlayer } from '@common/virtual-player';

export abstract class BaseVpBehaviorInGame {
    protected gameState: dataForm.GetGameStateRes;
    protected readonly maxSearchDepth = 3;

    constructor(protected readonly vpState: VpState) {}

    protected getTileCost(tile: Tile, ignoreDoorStateForVP: boolean): number {
        switch (tile.type) {
            case TileType.Ice:
                return 0;
            case TileType.Water:
                return 2;
            case TileType.Grass:
                return 1;
            case TileType.Door:
                if (tile.doorState || ignoreDoorStateForVP) return 1;
                return Infinity;
            default:
                return Infinity;
        }
    }

    protected isInSameTeam(player1: Player, player2: Player): boolean {
        return player1.ctfTeam === player2.ctfTeam;
    }

    protected findPathToPosition(boardGraph: BoardGameGraph, targetNode: BoardGameNode): Position[] {
        const path: Position[] = [];
        let currentNode = targetNode;
        let totalCost = 0;
        const maxMovementPoints = this.gameState.activePlayer.attributes.speedValue;
        let isFirstNode = true;

        while (currentNode) {
            path.unshift({
                x: currentNode.tilePosition.x,
                y: currentNode.tilePosition.y,
            });

            const tileCost = this.getTileCost(currentNode.tile, true);
            if (!isFirstNode) {
                totalCost += tileCost;
            } else {
                isFirstNode = false;
            }
            currentNode = boardGraph.getPreviousNodes().get(currentNode) || null;
        }

        if (totalCost > maxMovementPoints) {
            const truncatedPath: Position[] = [];
            let currentCost = 0;
            let isFirstTile = true;

            for (const position of path) {
                const tile = this.gameState.boardGame.tiles[position.x][position.y];
                const tileCost = this.getTileCost(tile, true);
                if (isFirstTile) {
                    isFirstTile = false;
                    truncatedPath.push(position);
                    continue;
                }

                if (currentCost + tileCost <= maxMovementPoints) {
                    truncatedPath.push(position);
                    currentCost += tileCost;
                } else {
                    break;
                }
            }

            return truncatedPath;
        } else {
            return path;
        }
    }

    protected findPathToAdjacentPosition(boardGraph: BoardGameGraph, targetNode: BoardGameNode, depth: number = 1): Position[] | null {
        if (depth > this.maxSearchDepth) {
            return null;
        }
        const directDistance = boardGraph.getDistances().get(targetNode);
        if (isDefinedAndFinite(directDistance)) {
            return this.findPathToPosition(boardGraph, targetNode);
        }
        const targetPosition = targetNode.tilePosition;

        const immediatePath = this.tryImmediateAdjacent(boardGraph, targetPosition);
        if (immediatePath) {
            return immediatePath;
        }

        return this.tryRecursiveAdjacent(boardGraph, targetPosition, depth);
    }
    protected isAdjacentToPlayer(playerPosition: Position, targetPosition: Position): boolean {
        const directions = getDirections();

        for (const dir of directions) {
            const newX = targetPosition.x + dir.x;
            const newY = targetPosition.y + dir.y;
            if (newX === playerPosition.x && newY === playerPosition.y) {
                return true;
            }
        }

        return false;
    }

    protected findAdjacentPosition(playerPosition: Position): Position | null {
        const directions = getDirections();

        const virtualPlayerPosition = this.gameState.activePlayer.position;
        if (!virtualPlayerPosition) return null;
        const validAdjacentPositions: Position[] = [];
        for (const dir of directions) {
            const newX = playerPosition.x + dir.x;
            const newY = playerPosition.y + dir.y;
            if (newX >= 0 && newX < this.gameState.boardGame.tiles.length && newY >= 0 && newY < this.gameState.boardGame.tiles[0].length) {
                const tile = this.gameState.boardGame.tiles[newX][newY];
                const isWall = tile.type === TileType.Wall;
                const isClosedDoor = tile.type === TileType.Door && !tile.doorState;
                const isOccupied = !!tile.containedPlayer;
                if (!isWall && !isClosedDoor && !isOccupied) {
                    validAdjacentPositions.push({ x: newX, y: newY });
                }
            }
        }

        validAdjacentPositions.sort((a, b) => {
            const distA = Math.abs(a.x - virtualPlayerPosition.x) + Math.abs(a.y - virtualPlayerPosition.y);
            const distB = Math.abs(b.x - virtualPlayerPosition.x) + Math.abs(b.y - virtualPlayerPosition.y);
            return distA - distB;
        });
        return validAdjacentPositions.length > 0 ? validAdjacentPositions[0] : null;
    }

    protected moveVirtualPlayer(vpSocket: VpSocketManager, positions: Position[], gameId: string, isMovingToItem: boolean): void {
        const doorsOnPath = positions.filter((pos) => {
            const tile = this.gameState.boardGame.tiles[pos.x][pos.y];
            return tile.type === TileType.Door && !tile.doorState;
        });

        let modifiedPositions = [...positions];

        for (let i = 1; i < modifiedPositions.length; i++) {
            const position = modifiedPositions[i];
            const tile = this.gameState.boardGame.tiles[position.x][position.y];
            if (tile.containedPlayer) {
                modifiedPositions = modifiedPositions.slice(0, i);
                break;
            }
        }

        if (doorsOnPath.length > 2) {
            const secondDoorIndex = positions.findIndex((pos) => {
                const tile = this.gameState.boardGame.tiles[pos.x][pos.y];
                return tile.type === TileType.Door && !tile.doorState;
            });

            if (secondDoorIndex !== -1) {
                modifiedPositions = positions.slice(0, secondDoorIndex);
            }
        }

        const data: dataForm.MoveReq = {
            gameCode: gameId,
            path: modifiedPositions,
            isMovingToItem,
        };

        vpSocket.clientSocket.emit(SocketServerEventNames.Move, data);
    }

    protected findNearestPreferredItem(
        virtualPlayer: VirtualPlayer,
    ): { item: Item; position: Position; distance: number; doorsOnPath: Position[]; path: Position[] } | null {
        const preferredType = this.getPreferredItemType();
        const ignoreDoorStateForVP = true;
        const ignorePlayerForVP = false;
        const virtualPlayerCurrentPosition = virtualPlayer.position;

        if (!virtualPlayerCurrentPosition) return null;

        const boardGraph = new BoardGameGraph(this.gameState.boardGame.tiles, ignoreDoorStateForVP, ignorePlayerForVP);
        let nearestItem = null;
        let shortestDistance = Infinity;

        boardGraph.findDistances(virtualPlayerCurrentPosition);

        for (let x = 0; x < this.gameState.boardGame.tiles.length; x++) {
            for (let y = 0; y < this.gameState.boardGame.tiles[x].length; y++) {
                const tile = this.gameState.boardGame.tiles[x][y];
                const item = tile.containedItem;

                if (item && FROM_ITEM_NAME_TO_VP_PREFERENCE[item.name] === preferredType) {
                    const targetNode = boardGraph.getNodes()[x][y];
                    const distance = boardGraph.getDistances().get(targetNode);

                    if (distance === Infinity) {
                        const adjacentPath = this.findPathToAdjacentPosition(boardGraph, targetNode);
                        if (adjacentPath && adjacentPath.length > 0) {
                            const adjacentDistance = adjacentPath.length;
                            if (adjacentDistance < shortestDistance) {
                                const doorsOnPath = adjacentPath.filter((pos) => this.gameState.boardGame.tiles[pos.x][pos.y].type === TileType.Door);
                                shortestDistance = adjacentDistance;
                                nearestItem = {
                                    item,
                                    position: { x, y },
                                    distance: adjacentDistance,
                                    doorsOnPath,
                                    path: adjacentPath,
                                };
                            }
                        }
                    } else if (isDefinedAndFinite(distance) && distance < shortestDistance) {
                        const path = this.findPathToPosition(boardGraph, targetNode);
                        if (path.length > 0) {
                            const doorsOnPath = path.filter((pos) => this.gameState.boardGame.tiles[pos.x][pos.y].type === TileType.Door);
                            shortestDistance = distance;
                            nearestItem = {
                                item,
                                position: { x, y },
                                distance,
                                doorsOnPath,
                                path,
                            };
                        }
                    }
                }
            }
        }

        return nearestItem;
    }

    protected findNearestPlayer(
        virtualPlayer: VirtualPlayer,
    ): { player: Player; position: Position; distance: number; doorsOnPath: Position[]; path: Position[] } | null {
        const ignoreDoorStateForVP = true;
        const ignorePlayerForVP = true;
        const virtualPlayerCurrentPosition = virtualPlayer.position;
        if (!virtualPlayerCurrentPosition) return null;

        const boardGraph = new BoardGameGraph(this.gameState.boardGame.tiles, ignoreDoorStateForVP, ignorePlayerForVP);
        let nearestPlayer = null;
        let shortestDistance = Infinity;

        boardGraph.findDistances(virtualPlayerCurrentPosition);

        for (let x = 0; x < this.gameState.boardGame.tiles.length; x++) {
            for (let y = 0; y < this.gameState.boardGame.tiles[x].length; y++) {
                const tile = this.gameState.boardGame.tiles[x][y];
                const player = tile.containedPlayer;

                if (player && player.name !== virtualPlayer.name) {
                    if (this.gameState.boardGame.gameMode === 'CTF' && this.isInSameTeam(virtualPlayer, player)) {
                        continue;
                    }

                    const distance = boardGraph.getDistances().get(boardGraph.getNodes()[x][y]);

                    if (isDefinedAndFinite(distance) && distance < shortestDistance) {
                        const isAdjacent = this.isAdjacentToPlayer(virtualPlayerCurrentPosition, { x, y });

                        if (isAdjacent) {
                            shortestDistance = 0;
                            nearestPlayer = {
                                player,
                                position: { x, y },
                                distance: 0,
                                doorsOnPath: [],
                                path: [virtualPlayerCurrentPosition],
                            };
                            break;
                        } else {
                            const adjacentPosition = this.findAdjacentPosition({ x, y });

                            if (adjacentPosition) {
                                const path = this.findPathToAdjacentPosition(
                                    boardGraph,
                                    boardGraph.getNodes()[adjacentPosition.x][adjacentPosition.y],
                                );

                                if (path) {
                                    const doorsOnPath = path.filter((pos) => this.gameState.boardGame.tiles[pos.x][pos.y].type === TileType.Door);
                                    shortestDistance = distance;
                                    nearestPlayer = {
                                        player,
                                        position: { x, y },
                                        distance,
                                        doorsOnPath,
                                        path,
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }

        return nearestPlayer;
    }

    protected findPathToPlayerAtPosition(
        virtualPlayer: VirtualPlayer,
        targetPosition: Position,
    ): { player: Player; position: Position; distance: number; doorsOnPath: Position[]; path: Position[] } | null {
        const ignoreDoorStateForVP = true;
        const ignorePlayerForVP = true;
        const virtualPlayerCurrentPosition = virtualPlayer.position;
        if (!virtualPlayerCurrentPosition) return null;

        const boardGraph = new BoardGameGraph(this.gameState.boardGame.tiles, ignoreDoorStateForVP, ignorePlayerForVP);
        boardGraph.findDistances(virtualPlayerCurrentPosition);

        const tile = this.gameState.boardGame.tiles[targetPosition.x][targetPosition.y];
        const player = tile.containedPlayer;

        if (!player || player.name === virtualPlayer.name) return null;

        if (this.gameState.boardGame.gameMode === 'CTF' && this.isInSameTeam(virtualPlayer, player)) {
            return null;
        }

        const distance = boardGraph.getDistances().get(boardGraph.getNodes()[targetPosition.x][targetPosition.y]);

        if (isDefinedAndFinite(distance)) {
            const isAdjacent = this.isAdjacentToPlayer(virtualPlayerCurrentPosition, targetPosition);

            if (isAdjacent) {
                return {
                    player,
                    position: targetPosition,
                    distance: 0,
                    doorsOnPath: [],
                    path: [virtualPlayerCurrentPosition],
                };
            } else {
                const adjacentPosition = this.findAdjacentPosition(targetPosition);

                if (adjacentPosition) {
                    const path = this.findPathToAdjacentPosition(boardGraph, boardGraph.getNodes()[adjacentPosition.x][adjacentPosition.y]);

                    if (path) {
                        const doorsOnPath = path.filter((pos) => this.gameState.boardGame.tiles[pos.x][pos.y].type === TileType.Door);

                        return {
                            player,
                            position: targetPosition,
                            distance,
                            doorsOnPath,
                            path,
                        };
                    }
                }
            }
        }

        return null;
    }

    private tryImmediateAdjacent(boardGraph: BoardGameGraph, targetPosition: Position): Position[] | null {
        const directions = getDirections();

        for (const dir of directions) {
            const newX = targetPosition.x + dir.x;
            const newY = targetPosition.y + dir.y;
            if (inBounds(newX, newY, this.gameState.boardGame.tiles)) {
                const adjacentNode = boardGraph.getNodes()[newX][newY];
                const distance = boardGraph.getDistances().get(adjacentNode);
                if (isDefinedAndFinite(distance)) {
                    return this.findPathToPosition(boardGraph, adjacentNode);
                }
            }
        }
        return null;
    }

    private tryRecursiveAdjacent(boardGraph: BoardGameGraph, targetPosition: Position, depth: number): Position[] | null {
        const directions = getDirections();
        for (const dir of directions) {
            const newX = targetPosition.x + dir.x;
            const newY = targetPosition.y + dir.y;
            if (inBounds(newX, newY, this.gameState.boardGame.tiles)) {
                const adjacentNode = boardGraph.getNodes()[newX][newY];
                const path = this.findPathToAdjacentPosition(boardGraph, adjacentNode, depth + 1);
                if (path) {
                    return path;
                }
            }
        }
        return null;
    }

    protected abstract getPreferredItemType(): VpPreferenceItem;
}
