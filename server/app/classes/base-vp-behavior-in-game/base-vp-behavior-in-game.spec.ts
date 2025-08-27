/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { BoardGame } from '@common/board-game';
import { BoardGameGraph, BoardGameNode } from '@app/classes/board-game-graph/board-game-graph';
import { CtfTeam } from '@common/enums/ctf-team';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { SocketServerEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import { Tile } from '@common/tile';
import { VirtualPlayer } from '@common/virtual-player';
import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import { BaseVpBehaviorInGame } from './base-vp-behavior-in-game';

const DEFAULT_SPEED = 3;
const DEFAULT_GRID_SIZE = 10;
const MAX_DEPTH = 3;
const EXPECTED_PATH_LENGTH = 5;
const WALL_LOOP_LIMIT = 4;
const MAX_MANHATTAN_DISTANCE = 4;

const GRID_SIZE_X = DEFAULT_GRID_SIZE;
const GRID_SIZE_Y = DEFAULT_GRID_SIZE;

// Mock VpSocketManager
class MockVpSocketManager {
    clientSocket = {
        emit: sinon.stub(),
    };
    gameId = 'testGameId';
}

class TestBaseVpBehaviorInGame extends BaseVpBehaviorInGame {
    constructor(vpState: VpState, maxSearchDepthOverride?: number) {
        super(vpState);
        if (typeof maxSearchDepthOverride === 'number') {
            (this as any).maxSearchDepth = maxSearchDepthOverride;
        }
    }
    getPreferredItemType(): VpPreferenceItem {
        return VpPreferenceItem.Defensive;
    }

    exposedGetTileCost(tile: Tile, ignoreDoorStateForVP: boolean): number {
        return this.getTileCost(tile, ignoreDoorStateForVP);
    }

    exposedIsInSameTeam(player1: Player, player2: Player): boolean {
        return this.isInSameTeam(player1, player2);
    }

    exposedFindAdjacentPosition(playerPosition: Position): Position | null {
        return this.findAdjacentPosition(playerPosition);
    }

    exposedIsAdjacentToPlayer(playerPosition: Position, targetPosition: Position): boolean {
        return this.isAdjacentToPlayer(playerPosition, targetPosition);
    }

    exposedFindNearestPreferredItem(virtualPlayer: VirtualPlayer) {
        return this.findNearestPreferredItem(virtualPlayer);
    }

    exposedFindNearestPlayer(virtualPlayer: VirtualPlayer) {
        return this.findNearestPlayer(virtualPlayer);
    }

    exposedFindPathToPosition(graph: BoardGameGraph, targetNode: BoardGameNode): Position[] {
        return this.findPathToPosition(graph, targetNode);
    }

    exposedFindPathToAdjacentPosition(graph: BoardGameGraph, targetNode: BoardGameNode, depth: number = 1): Position[] | null {
        return this.findPathToAdjacentPosition(graph, targetNode, depth);
    }

    exposedMoveVirtualPlayer(vpSocket: VpSocketManager, positions: Position[], gameId: string, isMovingToItem: boolean): void {
        this.moveVirtualPlayer(vpSocket, positions, gameId, isMovingToItem);
    }

    exposedFindPathToPlayerAtPosition(virtualPlayer: VirtualPlayer, targetPosition: Position) {
        return this.findPathToPlayerAtPosition(virtualPlayer, targetPosition);
    }

    setGameState(gameState: dataForm.GetGameStateRes) {
        this.gameState = gameState;
    }
}

describe('BaseVpBehaviorInGame', () => {
    let behavior: TestBaseVpBehaviorInGame;
    let vpState: VpState;
    let mockGameState: dataForm.GetGameStateRes;
    let mockVpSocketManager: MockVpSocketManager;
    let mockBoardGraph: BoardGameGraph;

    const createMockTile = (
        type: TileType = TileType.Grass,
        doorState = true,
        containedItem: Item | null = null,
        containedPlayer: Player | null = null,
    ): Tile => ({
        type,
        containedItem,
        containedPlayer,
        doorState,
        shortestDistanceFromPosition: [],
    });

    const createMockPlayer = (name: string, x: number, y: number, ctfTeam: string | null = null, speed = DEFAULT_SPEED): Player =>
        ({
            name,
            position: { x, y },
            ctfTeam,
            attributes: { speedValue: speed },
            character: 'character',
            organizer: false,
        }) as Player;

    beforeEach(() => {
        vpState = {} as VpState;
        behavior = new TestBaseVpBehaviorInGame(vpState);
        mockVpSocketManager = new MockVpSocketManager();
        sinon.resetHistory();

        const tiles: Tile[][] = Array(GRID_SIZE_X)
            .fill(null)
            .map(() =>
                Array(GRID_SIZE_Y)
                    .fill(null)
                    .map(() => createMockTile(TileType.Grass)),
            );

        const boardGame = {
            tiles,
            gameMode: GameMode.Normal,
            dimensions: { x: GRID_SIZE_X, y: GRID_SIZE_Y },
        } as unknown as BoardGame;

        const activePlayer = createMockPlayer('VP', 0, 0, 'red', DEFAULT_SPEED);

        mockGameState = {
            boardGame,
            listOfPlayers: [activePlayer],
            activePlayer,
        } as dataForm.GetGameStateRes;
        behavior.setGameState(mockGameState);
        mockBoardGraph = new BoardGameGraph(mockGameState.boardGame.tiles, true, false);
        const position = activePlayer.position;
        if (position) {
            mockBoardGraph.findDistances(position);
        }
        mockGameState.boardGame.gameMode = GameMode.Normal;
    });

    describe('getTileCost', () => {
        it('should return 0 for Ice tile', () => {
            const tile: Tile = { type: TileType.Ice } as Tile;
            const cost = behavior.exposedGetTileCost(tile, true);
            assert.equal(cost, 0);
        });

        it('should return 2 for Water tile', () => {
            const tile: Tile = { type: TileType.Water } as Tile;
            const cost = behavior.exposedGetTileCost(tile, true);
            assert.equal(cost, 2);
        });

        it('should return 1 for Grass tile', () => {
            const tile: Tile = { type: TileType.Grass } as Tile;
            const cost = behavior.exposedGetTileCost(tile, true);
            assert.equal(cost, 1);
        });

        it('should return 1 for Door tile if door is open or ignored', () => {
            const tile: Tile = { type: TileType.Door, doorState: true } as Tile;
            const cost = behavior.exposedGetTileCost(tile, true);
            assert.equal(cost, 1);
        });

        it('should return Infinity for Door tile if door is closed and not ignored', () => {
            const tile: Tile = { type: TileType.Door, doorState: false } as Tile;
            const cost = behavior.exposedGetTileCost(tile, false);
            assert.equal(cost, Infinity);
        });

        it('should return Infinity for unknown tile type', () => {
            const tile: Tile = { type: 'Unknown' as TileType } as Tile;
            const cost = behavior.exposedGetTileCost(tile, true);
            assert.equal(cost, Infinity);
        });
    });

    describe('isInSameTeam', () => {
        it('should return true when players are in the same team', () => {
            const player1 = {
                name: 'P1',
                ctfTeam: 'red',
                character: 'character1',
                attributes: { speedValue: 1 },
                organizer: false,
            } as unknown as Player;
            const player2 = {
                name: 'P2',
                ctfTeam: 'red',
                character: 'character2',
                attributes: { speedValue: 1 },
                organizer: false,
            } as unknown as Player;
            assert.isTrue(behavior.exposedIsInSameTeam(player1, player2));
        });

        it('should return false when players are in different teams', () => {
            const player1 = {
                name: 'P1',
                ctfTeam: 'red',
                character: 'character1',
                attributes: { speedValue: 1 },
                organizer: false,
            } as unknown as Player;
            const player2 = {
                name: 'P2',
                ctfTeam: 'blue',
                character: 'character2',
                attributes: { speedValue: 1 },
                organizer: false,
            } as unknown as Player;
            assert.isFalse(behavior.exposedIsInSameTeam(player1, player2));
        });
    });

    describe('isAdjacentToPlayer', () => {
        it('should return true when positions are adjacent horizontally', () => {
            const playerPos = { x: 1, y: 1 };
            const targetPos = { x: 1, y: 2 };
            assert.isTrue(behavior.exposedIsAdjacentToPlayer(playerPos, targetPos));
        });

        it('should return true when positions are adjacent vertically', () => {
            const playerPos = { x: 1, y: 1 };
            const targetPos = { x: 2, y: 1 };
            assert.isTrue(behavior.exposedIsAdjacentToPlayer(playerPos, targetPos));
        });

        it('should return false when positions are diagonal', () => {
            const playerPos = { x: 1, y: 1 };
            const targetPos = { x: 2, y: 2 };
            assert.isFalse(behavior.exposedIsAdjacentToPlayer(playerPos, targetPos));
        });

        it('should return false when positions are not adjacent', () => {
            const playerPos = { x: 0, y: 0 };
            const targetPos = { x: 2, y: 2 };
            assert.isFalse(behavior.exposedIsAdjacentToPlayer(playerPos, targetPos));
        });
    });

    describe('findAdjacentPosition', () => {
        it('should return null if virtual player has no position', () => {
            mockGameState.activePlayer.position = undefined;
            behavior.setGameState(mockGameState);
            assert.isNull(behavior.exposedFindAdjacentPosition({ x: 1, y: 1 }));
        });

        it('should find an accessible adjacent position closest to the VP', () => {
            const playerPos = { x: 2, y: 2 };

            const adjacentPos = behavior.exposedFindAdjacentPosition(playerPos);

            expect(adjacentPos).to.deep.oneOf([
                { x: 1, y: 2 },
                { x: 2, y: 1 },
            ]);
        });

        it('should ignore closed doors when finding adjacent positions', () => {
            const playerPos = { x: 1, y: 1 };

            mockGameState.boardGame.tiles[1][2].type = TileType.Door;
            mockGameState.boardGame.tiles[1][2].doorState = false;
            behavior.setGameState(mockGameState);

            const adjacentPos = behavior.exposedFindAdjacentPosition(playerPos);

            assert.isDefined(adjacentPos);
            if (adjacentPos) {
                expect(adjacentPos).to.not.deep.equal({ x: 1, y: 2 });
            }
        });

        it('should return null when all adjacent positions are walls', () => {
            const playerPos = { x: 1, y: 1 };
            mockGameState.boardGame.tiles[0][1].type = TileType.Wall;
            mockGameState.boardGame.tiles[1][0].type = TileType.Wall;
            mockGameState.boardGame.tiles[1][2].type = TileType.Wall;
            mockGameState.boardGame.tiles[2][1].type = TileType.Wall;
            behavior.setGameState(mockGameState);
            assert.isNull(behavior.exposedFindAdjacentPosition(playerPos));
        });

        it('should return null when all adjacent positions are occupied', () => {
            const playerPos = { x: 1, y: 1 };
            const otherPlayer = createMockPlayer('Other', 0, 0);
            mockGameState.boardGame.tiles[0][1].containedPlayer = otherPlayer;
            mockGameState.boardGame.tiles[1][0].containedPlayer = otherPlayer;
            mockGameState.boardGame.tiles[1][2].containedPlayer = otherPlayer;
            mockGameState.boardGame.tiles[2][1].containedPlayer = otherPlayer;
            behavior.setGameState(mockGameState);
            assert.isNull(behavior.exposedFindAdjacentPosition(playerPos));
        });
    });

    describe('findNearestPreferredItem', () => {
        it('should return null if virtual player has no position', () => {
            const virtualPlayer = createMockPlayer('VP', 0, 0);
            virtualPlayer.position = undefined;
            assert.isNull(behavior.exposedFindNearestPreferredItem(virtualPlayer as VirtualPlayer));
        });

        it('should find the nearest preferred item (Defensive)', () => {
            const virtualPlayer = mockGameState.activePlayer as VirtualPlayer;

            virtualPlayer.position = { x: 0, y: 0 };
            assert.isDefined(virtualPlayer.position, 'La position du joueur virtuel doit être définie');

            const item = {
                type: ItemType.AttributeEditor,
                name: 'Carapace Enchantee',
                description: 'Protège contre les attaques et améliore la défense',
            } as Item;

            mockGameState.boardGame.tiles[1][1].containedItem = item;
            mockGameState.boardGame.tiles[1][1].type = TileType.Grass;

            mockGameState.boardGame.tiles[0][1].type = TileType.Grass;
            mockGameState.boardGame.tiles[1][0].type = TileType.Grass;

            behavior.setGameState(mockGameState);

            mockBoardGraph = new BoardGameGraph(mockGameState.boardGame.tiles, true, true);
            mockBoardGraph.findDistances(virtualPlayer.position);

            const result = behavior.exposedFindNearestPreferredItem(virtualPlayer);

            assert.isNotNull(result, "L'item défensif devrait être trouvé");
            if (result) {
                assert.deepEqual(result.item, item, "L'item trouvé ne correspond pas");
                assert.deepEqual(result.position, { x: 1, y: 1 }, 'Position incorrecte');
                assert.isTrue(result.path.length > 0, 'Le chemin devrait contenir des positions');
            }
        });

        it('should return null when no preferred items are available', () => {
            const virtualPlayer = mockGameState.activePlayer as VirtualPlayer;
            const item = { type: ItemType.RandomItem, name: 'NonDefensiveItem' } as Item;
            mockGameState.boardGame.tiles[2][2].containedItem = item;
            behavior.setGameState(mockGameState);

            assert.isNull(behavior.exposedFindNearestPreferredItem(virtualPlayer));
        });

        it('should find an item reachable via an adjacent path if direct path is blocked', () => {
            const virtualPlayer = mockGameState.activePlayer as VirtualPlayer;
            const item = {
                type: ItemType.AttributeEditor,
                name: 'Carapace Enchantee',
                description: 'Protège contre les attaques et améliore la défense',
            } as Item;
            mockGameState.boardGame.tiles[1][1].containedItem = item;
            mockGameState.boardGame.tiles[0][1].type = TileType.Wall;
            mockGameState.boardGame.tiles[1][0].type = TileType.Wall;
            mockGameState.boardGame.tiles[0][2].type = TileType.Grass;
            mockGameState.boardGame.tiles[1][2].type = TileType.Grass;
            behavior.setGameState(mockGameState);
            mockBoardGraph = new BoardGameGraph(mockGameState.boardGame.tiles, true, false);

            const result = behavior.exposedFindNearestPreferredItem(virtualPlayer);
            assert.isNotNull(result);
            if (result) {
                expect(result.position).to.deep.equal({ x: 1, y: 1 });
                expect(result.path).to.have.length.greaterThan(0);
            }
        });
    });

    describe('findNearestPlayer', () => {
        it('should return null if virtual player has no position', () => {
            const virtualPlayer = createMockPlayer('VP', 0, 0);
            virtualPlayer.position = undefined;
            assert.isNull(behavior.exposedFindNearestPlayer(virtualPlayer as VirtualPlayer));
        });

        it('should find the nearest player from different team', () => {
            const virtualPlayer = mockGameState.activePlayer as VirtualPlayer;
            const targetPlayer = createMockPlayer('P1', 2, 2, 'blue');
            mockGameState.boardGame.tiles[2][2].containedPlayer = targetPlayer;
            mockGameState.listOfPlayers.push(targetPlayer);
            behavior.setGameState(mockGameState);
            mockBoardGraph = new BoardGameGraph(mockGameState.boardGame.tiles, true, true);

            const result = behavior.exposedFindNearestPlayer(virtualPlayer);
            assert.isNotNull(result);
            if (result) {
                assert.deepEqual(result.player, targetPlayer);
                assert.deepEqual(result.position, { x: 2, y: 2 });
                expect(result.path.length).to.be.greaterThan(0);
                const lastPos = result.path[result.path.length - 1];
                const targetPosition = targetPlayer.position;
                if (!targetPosition) {
                    throw new Error('Target player position is undefined');
                }
                expect(Math.abs(lastPos.x - targetPosition.x) + Math.abs(lastPos.y - targetPosition.y)).to.equal(1);
            }
        });

        it('should find the nearest adjacent player', () => {
            const virtualPlayer = mockGameState.activePlayer as VirtualPlayer;
            const targetPlayer = createMockPlayer('P1', 0, 1, 'blue');
            mockGameState.boardGame.tiles[0][1].containedPlayer = targetPlayer;
            mockGameState.listOfPlayers.push(targetPlayer);
            behavior.setGameState(mockGameState);
            mockBoardGraph = new BoardGameGraph(mockGameState.boardGame.tiles, true, true);

            const result = behavior.exposedFindNearestPlayer(virtualPlayer);
            assert.isNotNull(result);
            if (result) {
                expect(result.player).to.deep.equal(targetPlayer);
                expect(result.position).to.deep.equal({ x: 0, y: 1 });
                expect(result.distance).to.equal(0);
                expect(result.path).to.deep.equal([virtualPlayer.position]);
            }
        });

        it('should return null when only same team players are available in CTF mode', () => {
            mockGameState.boardGame.gameMode = GameMode.CTF;
            const virtualPlayer = mockGameState.activePlayer as VirtualPlayer;
            const sameTeamPlayer = createMockPlayer('P1', 2, 2, 'red');
            mockGameState.boardGame.tiles[2][2].containedPlayer = sameTeamPlayer;
            mockGameState.listOfPlayers.push(sameTeamPlayer);
            behavior.setGameState(mockGameState);

            assert.isNull(behavior.exposedFindNearestPlayer(virtualPlayer));
        });

        it('should find player when not in CTF mode even if same team concept exists', () => {
            mockGameState.boardGame.gameMode = GameMode.Normal;
            const virtualPlayer = mockGameState.activePlayer as VirtualPlayer;
            const otherPlayer = createMockPlayer('P1', 2, 2, 'red');
            mockGameState.boardGame.tiles[2][2].containedPlayer = otherPlayer;
            mockGameState.listOfPlayers.push(otherPlayer);
            behavior.setGameState(mockGameState);
            mockBoardGraph = new BoardGameGraph(mockGameState.boardGame.tiles, true, true);

            const result = behavior.exposedFindNearestPlayer(virtualPlayer);
            assert.isNotNull(result);
            if (result) {
                expect(result.player).to.deep.equal(otherPlayer);
            }
        });

        it('should return null when no other players are available', () => {
            const virtualPlayer = mockGameState.activePlayer as VirtualPlayer;
            mockGameState.listOfPlayers = [virtualPlayer];
            for (let x = 0; x < GRID_SIZE_X; x++) {
                for (let y = 0; y < GRID_SIZE_Y; y++) {
                    mockGameState.boardGame.tiles[x][y].containedPlayer = null;
                }
            }
            if (virtualPlayer.position) {
                mockGameState.boardGame.tiles[virtualPlayer.position.x][virtualPlayer.position.y].containedPlayer = virtualPlayer;
            }
            behavior.setGameState(mockGameState);
            assert.isNull(behavior.exposedFindNearestPlayer(virtualPlayer));
        });
    });

    describe('findPathToPosition', () => {
        it('should return a valid path within movement points', () => {
            const targetPos = { x: 2, y: 2 };
            mockGameState.activePlayer.attributes.speedValue = 5;
            behavior.setGameState(mockGameState);
            mockBoardGraph = new BoardGameGraph(mockGameState.boardGame.tiles, true, true);
            mockBoardGraph.findDistances({ x: 0, y: 0 });
            const targetNode = mockBoardGraph.getNodes()[targetPos.x][targetPos.y];

            const path = behavior.exposedFindPathToPosition(mockBoardGraph, targetNode);

            expect(path.length).to.be.greaterThan(1);

            expect(path[0]).to.deep.equal({ x: 0, y: 0 });
            expect(path[path.length - 1]).to.deep.equal({ x: 2, y: 2 });

            for (let i = 1; i < path.length; i++) {
                const prev = path[i - 1];
                const curr = path[i];
                const delta = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);
                expect(delta).to.equal(1);
            }
        });

        it('should return a truncated path if total cost exceeds movement points', () => {
            const targetPos = { x: 3, y: 3 };
            mockGameState.activePlayer.attributes.speedValue = 4;
            behavior.setGameState(mockGameState);
            mockBoardGraph = new BoardGameGraph(mockGameState.boardGame.tiles, true, true);
            mockBoardGraph.findDistances({ x: 0, y: 0 });
            const targetNode = mockBoardGraph.getNodes()[targetPos.x][targetPos.y];

            const path = behavior.exposedFindPathToPosition(mockBoardGraph, targetNode);

            expect(path[0]).to.deep.equal({ x: 0, y: 0 });

            let totalCost = 0;
            for (let i = 1; i < path.length; i++) {
                const pos = path[i];
                const tile = mockGameState.boardGame.tiles[pos.x][pos.y];
                totalCost += behavior.exposedGetTileCost(tile, true);
            }

            expect(totalCost).to.be.at.most(mockGameState.activePlayer.attributes.speedValue);

            for (let i = 1; i < path.length; i++) {
                const prev = path[i - 1];
                const curr = path[i];
                const delta = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);
                expect(delta).to.equal(1);
            }
        });

        it('should return just the start position if the first step costs too much', () => {
            mockGameState.boardGame.tiles[1][0].type = TileType.Water;
            mockGameState.boardGame.tiles[0][1].type = TileType.Water;
            mockGameState.activePlayer.attributes.speedValue = 1;
            behavior.setGameState(mockGameState);
            mockBoardGraph = new BoardGameGraph(mockGameState.boardGame.tiles, true, true);
            mockBoardGraph.findDistances({ x: 0, y: 0 });
            const targetNode = mockBoardGraph.getNodes()[2][2];

            const path = behavior.exposedFindPathToPosition(mockBoardGraph, targetNode);
            expect(path).to.deep.equal([{ x: 0, y: 0 }]);
        });

        it('should handle path cost exactly matching movement points', () => {
            const targetPos = { x: 2, y: 2 };
            mockGameState.activePlayer.attributes.speedValue = 4;
            behavior.setGameState(mockGameState);
            mockBoardGraph = new BoardGameGraph(mockGameState.boardGame.tiles, true, true);
            mockBoardGraph.findDistances({ x: 0, y: 0 });
            const targetNode = mockBoardGraph.getNodes()[targetPos.x][targetPos.y];

            const path = behavior.exposedFindPathToPosition(mockBoardGraph, targetNode);

            expect(path).to.have.length.greaterThan(0);
            expect(path[0]).to.deep.equal({ x: 0, y: 0 });
            expect(path[path.length - 1]).to.deep.equal({ x: 2, y: 2 });

            for (let i = 1; i < path.length; i++) {
                const prev = path[i - 1];
                const curr = path[i];
                const delta = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);
                expect(delta).to.equal(1);
            }

            let totalCost = 0;
            for (let i = 1; i < path.length; i++) {
                const pos = path[i];
                const tile = mockGameState.boardGame.tiles[pos.x][pos.y];
                totalCost += behavior.exposedGetTileCost(tile, true);
            }

            expect(totalCost).to.equal(mockGameState.activePlayer.attributes.speedValue);
            expect(path.length).to.equal(EXPECTED_PATH_LENGTH);
        });

        it('should return empty path if targetNode is null or undefined', () => {
            const graph = new BoardGameGraph(mockGameState.boardGame.tiles, true, true);
            graph.findDistances({ x: 0, y: 0 });
            const startNode = graph.getNodes()[0][0];
            const path = behavior.exposedFindPathToPosition(graph, startNode);
            expect(path).to.deep.equal([{ x: 0, y: 0 }]);
        });
    });

    describe('findPathToAdjacentPosition', () => {
        it('should return direct path if target is reachable', () => {
            const targetPos = { x: 1, y: 1 };
            mockBoardGraph.findDistances({ x: 0, y: 0 });
            const targetNode = mockBoardGraph.getNodes()[targetPos.x][targetPos.y];
            const path = behavior.exposedFindPathToAdjacentPosition(mockBoardGraph, targetNode);
            expect(path).to.deep.equal([
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
            ]);
        });

        it('should return path to an adjacent node if target is unreachable but adjacent is reachable', () => {
            const targetPos = { x: 1, y: 1 };
            mockGameState.boardGame.tiles[1][1].type = TileType.Wall;

            mockGameState.boardGame.tiles[1][0].type = TileType.Grass;
            behavior.setGameState(mockGameState);

            mockBoardGraph = new BoardGameGraph(mockGameState.boardGame.tiles, true, true);
            mockBoardGraph.findDistances({ x: 0, y: 0 });
            const targetNode = mockBoardGraph.getNodes()[targetPos.x][targetPos.y];

            const path = behavior.exposedFindPathToAdjacentPosition(mockBoardGraph, targetNode);

            expect(path).to.have.length(2);
            expect(path[0]).to.deep.equal({ x: 0, y: 0 });

            const possibleSecondPositions = [
                { x: 1, y: 0 },
                { x: 0, y: 1 },
                { x: 1, y: 2 },
                { x: 2, y: 1 },
            ];

            expect(possibleSecondPositions).to.deep.include(path[1]);
        });

        it('should return path using recursive search if immediate adjacents are unreachable', () => {
            const targetPos = { x: 2, y: 2 };

            mockGameState.boardGame.tiles[2][2].type = TileType.Wall;

            mockGameState.boardGame.tiles[1][2].type = TileType.Wall;
            mockGameState.boardGame.tiles[2][1].type = TileType.Wall;
            mockGameState.boardGame.tiles[2][3].type = TileType.Wall;

            behavior.setGameState(mockGameState);
            mockBoardGraph = new BoardGameGraph(mockGameState.boardGame.tiles, true, true);
            mockBoardGraph.findDistances({ x: 0, y: 0 });
            const targetNode = mockBoardGraph.getNodes()[targetPos.x][targetPos.y];

            const path = behavior.exposedFindPathToAdjacentPosition(mockBoardGraph, targetNode);
            expect(path).not.to.equal(null);
            if (path) {
                const lastPos = path[path.length - 1];
                const tile = mockGameState.boardGame.tiles[lastPos.x][lastPos.y];
                expect(tile.type).to.not.equal(TileType.Wall);

                const manhattanDistance = Math.abs(lastPos.x - targetPos.x) + Math.abs(lastPos.y - targetPos.y);

                expect(manhattanDistance).to.be.at.most(MAX_MANHATTAN_DISTANCE, 'La dernière position du chemin est trop éloignée de la cible');
            }
        });

        it('should return null if no adjacent path found within max depth', () => {
            const targetPos = { x: 4, y: 4 };
            mockGameState.boardGame.tiles[4][4].type = TileType.Wall;
            for (let i = 1; i <= WALL_LOOP_LIMIT; i++) {
                mockGameState.boardGame.tiles[i][0].type = TileType.Wall;
                mockGameState.boardGame.tiles[0][i].type = TileType.Wall;
            }
            mockGameState.boardGame.tiles[1][1].type = TileType.Wall;
            mockGameState.boardGame.tiles[2][1].type = TileType.Wall;
            mockGameState.boardGame.tiles[1][2].type = TileType.Wall;
            mockGameState.boardGame.tiles[2][2].type = TileType.Wall;
            mockGameState.boardGame.tiles[3][2].type = TileType.Wall;
            mockGameState.boardGame.tiles[2][3].type = TileType.Wall;
            mockGameState.boardGame.tiles[3][3].type = TileType.Wall;

            behavior.setGameState(mockGameState);
            mockBoardGraph = new BoardGameGraph(mockGameState.boardGame.tiles, true, true);
            mockBoardGraph.findDistances({ x: 0, y: 0 });
            const targetNode = mockBoardGraph.getNodes()[targetPos.x][targetPos.y];

            const path = behavior.exposedFindPathToAdjacentPosition(mockBoardGraph, targetNode);
            expect(path).to.equal(null);
        });

        it('should return null immediately if depth exceeds maxSearchDepth', () => {
            const targetPos = { x: 1, y: 1 };
            mockBoardGraph.findDistances({ x: 0, y: 0 });
            const targetNode = mockBoardGraph.getNodes()[targetPos.x][targetPos.y];
            const customBehavior = new TestBaseVpBehaviorInGame(vpState, 2);
            customBehavior.setGameState(mockGameState);

            const path = customBehavior.exposedFindPathToAdjacentPosition(mockBoardGraph, targetNode, MAX_DEPTH);
            expect(path).to.equal(null);
        });
    });

    describe('moveVirtualPlayer', () => {
        let vpSocket: VpSocketManager;
        const gameId = 'game123';

        beforeEach(() => {
            vpSocket = mockVpSocketManager as any;
            mockVpSocketManager.clientSocket.emit.resetHistory();
        });

        it('should emit Move event with the original path if no obstacles', () => {
            const path: Position[] = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
            ];
            behavior.exposedMoveVirtualPlayer(vpSocket, path, gameId, false);

            assert.isTrue(mockVpSocketManager.clientSocket.emit.calledOnce);
            assert.isTrue(
                mockVpSocketManager.clientSocket.emit.calledWith(SocketServerEventNames.Move, {
                    gameCode: gameId,
                    path,
                    isMovingToItem: false,
                }),
            );
        });

        it('should truncate path before the tile containing another player', () => {
            const otherPlayer = createMockPlayer('OtherP', 1, 1);
            mockGameState.boardGame.tiles[1][1].containedPlayer = otherPlayer;
            behavior.setGameState(mockGameState);
            const path: Position[] = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
                { x: 2, y: 1 },
            ];
            const expectedPath: Position[] = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
            ];

            behavior.exposedMoveVirtualPlayer(vpSocket, path, gameId, true);

            assert.isTrue(mockVpSocketManager.clientSocket.emit.calledOnce);
            assert.isTrue(
                mockVpSocketManager.clientSocket.emit.calledWith(SocketServerEventNames.Move, {
                    gameCode: gameId,
                    path: expectedPath,
                    isMovingToItem: true,
                }),
            );
        });

        it('should not truncate path if the player is on the first tile (start position)', () => {
            const path: Position[] = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
            ];
            mockGameState.boardGame.tiles[0][0].containedPlayer = mockGameState.activePlayer;
            behavior.setGameState(mockGameState);

            behavior.exposedMoveVirtualPlayer(vpSocket, path, gameId, false);

            assert.isTrue(mockVpSocketManager.clientSocket.emit.calledOnce);
            assert.isTrue(
                mockVpSocketManager.clientSocket.emit.calledWith(SocketServerEventNames.Move, {
                    gameCode: gameId,
                    path,
                    isMovingToItem: false,
                }),
            );
        });

        it('should truncate path before the second closed door if more than two closed doors are on the path', () => {
            mockGameState.boardGame.tiles[1][0].type = TileType.Door;
            mockGameState.boardGame.tiles[1][0].doorState = false;
            mockGameState.boardGame.tiles[2][1].type = TileType.Door;
            mockGameState.boardGame.tiles[2][1].doorState = false;
            mockGameState.boardGame.tiles[3][1].type = TileType.Door;
            mockGameState.boardGame.tiles[3][1].doorState = false;
            behavior.setGameState(mockGameState);

            const path: Position[] = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
                { x: 2, y: 1 },
                { x: 3, y: 1 },
            ];

            const expectedPath: Position[] = [{ x: 0, y: 0 }];

            behavior.exposedMoveVirtualPlayer(vpSocket, path, gameId, false);

            assert.isTrue(mockVpSocketManager.clientSocket.emit.calledOnce);
            assert.isTrue(
                mockVpSocketManager.clientSocket.emit.calledWith(SocketServerEventNames.Move, {
                    gameCode: gameId,
                    path: expectedPath,
                    isMovingToItem: false,
                }),
            );
        });

        it('should not truncate path if there are two or fewer closed doors', () => {
            mockGameState.boardGame.tiles[1][0].type = TileType.Door;
            mockGameState.boardGame.tiles[1][0].doorState = false;
            mockGameState.boardGame.tiles[2][1].type = TileType.Door;
            mockGameState.boardGame.tiles[2][1].doorState = false;
            behavior.setGameState(mockGameState);

            const path: Position[] = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
                { x: 2, y: 1 },
                { x: 3, y: 1 },
            ];

            behavior.exposedMoveVirtualPlayer(vpSocket, path, gameId, false);

            assert.isTrue(mockVpSocketManager.clientSocket.emit.calledOnce);
            assert.isTrue(
                mockVpSocketManager.clientSocket.emit.calledWith(SocketServerEventNames.Move, {
                    gameCode: gameId,
                    path,
                    isMovingToItem: false,
                }),
            );
        });

        it('should handle player collision and door truncation together (player takes precedence)', () => {
            const otherPlayer = createMockPlayer('OtherP', 2, 1);
            mockGameState.boardGame.tiles[2][1].containedPlayer = otherPlayer;
            mockGameState.boardGame.tiles[1][0].type = TileType.Door;
            mockGameState.boardGame.tiles[1][0].doorState = false;
            mockGameState.boardGame.tiles[3][1].type = TileType.Door;
            mockGameState.boardGame.tiles[3][1].doorState = false;
            mockGameState.boardGame.tiles[4][1].type = TileType.Door;
            mockGameState.boardGame.tiles[4][1].doorState = false;
            behavior.setGameState(mockGameState);

            const path: Position[] = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
                { x: 2, y: 1 },
                { x: 3, y: 1 },
                { x: 4, y: 1 },
            ];
            const expectedPath: Position[] = [{ x: 0, y: 0 }];

            behavior.exposedMoveVirtualPlayer(vpSocket, path, gameId, false);

            assert.isTrue(mockVpSocketManager.clientSocket.emit.calledOnce);
            assert.isTrue(
                mockVpSocketManager.clientSocket.emit.calledWith(SocketServerEventNames.Move, {
                    gameCode: gameId,
                    path: expectedPath,
                    isMovingToItem: false,
                }),
            );
        });
    });

    describe('findPathToPlayerAtPosition', () => {
        let virtualPlayer: VirtualPlayer;
        let targetPlayer: Player;
        const targetPos: Position = { x: 2, y: 2 };

        beforeEach(() => {
            virtualPlayer = mockGameState.activePlayer as VirtualPlayer;
            targetPlayer = createMockPlayer('TargetP', targetPos.x, targetPos.y, 'blue');
            mockGameState.boardGame.tiles[targetPos.x][targetPos.y].containedPlayer = targetPlayer;
            mockGameState.listOfPlayers.push(targetPlayer);
            behavior.setGameState(mockGameState);
            mockBoardGraph = new BoardGameGraph(mockGameState.boardGame.tiles, true, true);
        });

        it('should return path info if player exists at target and path is found to adjacent', () => {
            const result = behavior.exposedFindPathToPlayerAtPosition(virtualPlayer, targetPos);
            assert.isNotNull(result);
            if (result) {
                expect(result.player).to.deep.equal(targetPlayer);
                expect(result.position).to.deep.equal(targetPos);
                expect(result.path.length).to.be.greaterThan(0);
                const lastPos = result.path[result.path.length - 1];
                const targetPosition = targetPlayer.position;
                if (!targetPosition) {
                    throw new Error('Target player position is undefined');
                }
                expect(Math.abs(lastPos.x - targetPosition.x) + Math.abs(lastPos.y - targetPosition.y)).to.equal(1);
            }
        });

        it('should return path info for adjacent player', () => {
            const adjacentPos = { x: 0, y: 1 };
            targetPlayer = createMockPlayer('AdjacentP', adjacentPos.x, adjacentPos.y, 'blue');
            mockGameState.boardGame.tiles[adjacentPos.x][adjacentPos.y].containedPlayer = targetPlayer;
            mockGameState.listOfPlayers = [virtualPlayer, targetPlayer];
            mockGameState.boardGame.tiles[targetPos.x][targetPos.y].containedPlayer = null;
            behavior.setGameState(mockGameState);

            const result = behavior.exposedFindPathToPlayerAtPosition(virtualPlayer, adjacentPos);
            assert.isNotNull(result);
            if (result) {
                expect(result.player).to.deep.equal(targetPlayer);
                expect(result.position).to.deep.equal(adjacentPos);
                expect(result.distance).to.equal(0);
                expect(result.path).to.deep.equal([virtualPlayer.position]);
            }
        });

        it('should return null if target position has no player', () => {
            mockGameState.boardGame.tiles[targetPos.x][targetPos.y].containedPlayer = null;
            mockGameState.listOfPlayers = [virtualPlayer];
            behavior.setGameState(mockGameState);

            const result = behavior.exposedFindPathToPlayerAtPosition(virtualPlayer, targetPos);
            assert.isNull(result);
        });

        it('should return null if the player at target position is the virtual player itself', () => {
            if (!virtualPlayer.position) return;
            const vpCurrentPos = virtualPlayer.position;
            mockGameState.boardGame.tiles[targetPos.x][targetPos.y].containedPlayer = virtualPlayer;
            mockGameState.boardGame.tiles[vpCurrentPos.x][vpCurrentPos.y].containedPlayer = null;
            virtualPlayer.position = targetPos;
            mockGameState.activePlayer = virtualPlayer;
            mockGameState.listOfPlayers = [virtualPlayer];
            behavior.setGameState(mockGameState);

            const result = behavior.exposedFindPathToPlayerAtPosition(virtualPlayer, targetPos);
            assert.isNull(result);
        });

        it('should return null in CTF mode if target player is in the same team', () => {
            mockGameState.boardGame.gameMode = GameMode.CTF;

            virtualPlayer.ctfTeam = CtfTeam.FirstTeam;
            targetPlayer.ctfTeam = CtfTeam.FirstTeam;

            mockGameState.boardGame.tiles[targetPos.x][targetPos.y].containedPlayer = targetPlayer;
            behavior.setGameState(mockGameState);

            const result = behavior.exposedFindPathToPlayerAtPosition(virtualPlayer, targetPos);
            assert.isNull(result);
        });

        it('should return player info in Normal mode even if target player is in the same team', () => {
            mockGameState.boardGame.gameMode = GameMode.Normal;
            targetPlayer.ctfTeam = CtfTeam.FirstTeam;
            mockGameState.boardGame.tiles[targetPos.x][targetPos.y].containedPlayer = targetPlayer;
            behavior.setGameState(mockGameState);

            const result = behavior.exposedFindPathToPlayerAtPosition(virtualPlayer, targetPos);
            assert.isNotNull(result);
            if (result) {
                expect(result.player).to.deep.equal(targetPlayer);
            }
        });

        it('should return null if no path found to any adjacent position of the target player', () => {
            mockGameState.boardGame.tiles[targetPos.x - 1][targetPos.y].type = TileType.Wall;
            mockGameState.boardGame.tiles[targetPos.x + 1][targetPos.y].type = TileType.Wall;
            mockGameState.boardGame.tiles[targetPos.x][targetPos.y - 1].type = TileType.Wall;
            mockGameState.boardGame.tiles[targetPos.x][targetPos.y + 1].type = TileType.Wall;
            mockGameState.boardGame.tiles[1][0].type = TileType.Wall;
            mockGameState.boardGame.tiles[0][1].type = TileType.Wall;
            mockGameState.boardGame.tiles[1][1].type = TileType.Wall;
            mockGameState.boardGame.tiles[2][0].type = TileType.Wall;
            mockGameState.boardGame.tiles[0][2].type = TileType.Wall;

            behavior.setGameState(mockGameState);

            const result = behavior.exposedFindPathToPlayerAtPosition(virtualPlayer, targetPos);
            assert.isNull(result);
        });

        it('should return null if virtual player has no position', () => {
            virtualPlayer.position = undefined;
            const result = behavior.exposedFindPathToPlayerAtPosition(virtualPlayer, targetPos);
            assert.isNull(result);
        });
    });
});
