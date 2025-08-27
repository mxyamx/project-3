/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import { VpState } from '@app/classes/vp-state/vp-state';
import { BoardGame } from '@common/board-game';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import { Tile } from '@common/tile';
import { VirtualPlayer } from '@common/virtual-player';
import { assert } from 'chai';
import { CTFBehaviorInGame } from './vp-ctf-behavior-in-game';

const GRID_SIZE = 3;

class TestCTFBehaviorInGame extends CTFBehaviorInGame {
    handleBehavior(): void {
        // Do nothing
    }

    getPreferredItemType(): VpPreferenceItem {
        return VpPreferenceItem.Defensive;
    }

    exposedFindFlag() {
        return this.findFlag();
    }

    exposedFindPlayerWithFlag() {
        return this.findPlayerWithFlag();
    }

    exposedHasFlag(virtualPlayer: VirtualPlayer) {
        return this.hasFlag(virtualPlayer);
    }

    exposedFindPathToFlag(virtualPlayer: VirtualPlayer) {
        return this.findPathToFlag(virtualPlayer);
    }

    exposedFindPathToStartPosition(virtualPlayer: VirtualPlayer) {
        return this.findPathToStartPosition(virtualPlayer);
    }

    exposedFindPathToPlayerWithFlagStartPoint(activeVirtualPlayer: VirtualPlayer) {
        return this.findPathToPlayerWithFlagStartPoint(activeVirtualPlayer);
    }

    setGameState(gameState: dataForm.GetGameStateRes) {
        this.gameState = gameState;
    }
}

describe('CTFBehaviorInGame', () => {
    let behavior: TestCTFBehaviorInGame;
    let vpState: VpState;
    let mockGameState: dataForm.GetGameStateRes;

    beforeEach(() => {
        vpState = {} as VpState;
        behavior = new TestCTFBehaviorInGame(vpState);

        const tiles: Tile[][] = Array(GRID_SIZE)
            .fill(null)
            .map(() =>
                Array(GRID_SIZE)
                    .fill(null)
                    .map(
                        () =>
                            ({
                                type: TileType.Grass,
                                containedItem: null,
                                containedPlayer: null,
                                doorState: true,
                                shortestDistanceFromPosition: [],
                            }) as Tile,
                    ),
            );

        const boardGame = {
            tiles,
        } as BoardGame;

        mockGameState = {
            boardGame,
            listOfPlayers: [],
            activePlayer: {
                attributes: {
                    speedValue: 5,
                },
                position: { x: 0, y: 0 },
            },
        } as dataForm.GetGameStateRes;
        behavior.setGameState(mockGameState);
    });

    describe('findFlag', () => {
        it('should return null if no flag is found', () => {
            mockGameState.boardGame.tiles = [[{ containedItem: null, type: TileType.Grass } as Tile]];
            assert.isNull(behavior.exposedFindFlag());
        });

        it('should find the flag and return its position', () => {
            const flag: Item = { type: ItemType.Flag } as Item;
            mockGameState.boardGame.tiles = [
                [{ containedItem: null, type: TileType.Grass } as Tile, { containedItem: null, type: TileType.Grass } as Tile],
                [{ containedItem: null, type: TileType.Grass } as Tile, { containedItem: flag, type: TileType.Grass } as Tile],
            ];

            const result = behavior.exposedFindFlag();
            assert.deepEqual(result, {
                item: flag,
                position: { x: 1, y: 1 },
            });
        });
    });

    describe('findPlayerWithFlag', () => {
        it('should return null if no player has the flag', () => {
            mockGameState.listOfPlayers = [
                { inventory: [{ type: ItemType.RandomItem }] } as Player,
                { inventory: [{ type: ItemType.ConditionBased }] } as Player,
            ];
            assert.isNull(behavior.exposedFindPlayerWithFlag());
        });

        it('should return the player who has the flag', () => {
            const playerWithFlag = { inventory: [{ type: ItemType.Flag }] } as Player;
            mockGameState.listOfPlayers = [{ inventory: [{ type: ItemType.RandomItem }] } as Player, playerWithFlag];
            assert.strictEqual(behavior.exposedFindPlayerWithFlag(), playerWithFlag);
        });

        it('should handle the case where a player has no inventory', () => {
            const playerWithoutInventory = {} as Player;
            mockGameState.listOfPlayers = [playerWithoutInventory];
            assert.isNull(behavior.exposedFindPlayerWithFlag());
        });
    });

    describe('hasFlag', () => {
        it('should return true if the virtual player has the flag', () => {
            const virtualPlayer = { inventory: [{ type: ItemType.Flag }] } as VirtualPlayer;
            assert.isTrue(behavior.exposedHasFlag(virtualPlayer));
        });

        it('should return false if the virtual player does not have the flag', () => {
            const virtualPlayer = { inventory: [{ type: ItemType.RandomItem }] } as VirtualPlayer;
            assert.isFalse(behavior.exposedHasFlag(virtualPlayer));
        });

        it('should handle the case where the virtual player has no inventory', () => {
            const virtualPlayer = {} as VirtualPlayer;
            assert.isFalse(behavior.exposedHasFlag(virtualPlayer));
        });
    });

    describe('findPathToFlag', () => {
        it('should return null if the flag does not exist', () => {
            const virtualPlayer = { position: { x: 0, y: 0 } } as VirtualPlayer;
            assert.isNull(behavior.exposedFindPathToFlag(virtualPlayer));
        });

        it('should return null if the virtual player has no position', () => {
            const flag: Item = { type: ItemType.Flag } as Item;
            mockGameState.boardGame.tiles[2][2].containedItem = flag;
            assert.isNull(behavior.exposedFindPathToFlag({} as VirtualPlayer));
        });

        it('should return null if the path to the flag is inaccessible', () => {
            for (let i = 0; i < GRID_SIZE; i++) {
                for (let j = 0; j < GRID_SIZE; j++) {
                    mockGameState.boardGame.tiles[i][j].containedPlayer = null;
                    mockGameState.boardGame.tiles[i][j].type = TileType.Grass;
                    mockGameState.boardGame.tiles[i][j].doorState = true;
                }
            }
            const flag: Item = { type: ItemType.Flag } as Item;
            mockGameState.boardGame.tiles[2][2].containedItem = flag;
            mockGameState.boardGame.tiles[2][2].type = TileType.Wall;

            (behavior as any).findPathToPosition = (): Position[] | null => {
                return null;
            };

            const virtualPlayer = { position: { x: 0, y: 0 } } as VirtualPlayer;
            assert.isNull(behavior.exposedFindPathToFlag(virtualPlayer));
        });

        it('should find a path to the flag', () => {
            for (let i = 0; i < GRID_SIZE; i++) {
                for (let j = 0; j < GRID_SIZE; j++) {
                    mockGameState.boardGame.tiles[i][j].containedPlayer = null;
                    mockGameState.boardGame.tiles[i][j].type = TileType.Grass;
                    mockGameState.boardGame.tiles[i][j].doorState = true;
                }
            }
            const flag: Item = { type: ItemType.Flag } as Item;
            mockGameState.boardGame.tiles[2][2].containedItem = flag;
            const virtualPlayer = { position: { x: 0, y: 0 } } as VirtualPlayer;
            const path = behavior.exposedFindPathToFlag(virtualPlayer);
            assert.isDefined(path);
            assert.isNotNull(path);
            if (path) {
                assert.isTrue(path.length > 0);
                for (let i = 1; i < path.length; i++) {
                    const prev = path[i - 1];
                    const curr = path[i];
                    const dx = Math.abs(curr.x - prev.x);
                    const dy = Math.abs(curr.y - prev.y);
                    assert.isTrue(dx + dy === 1, 'The path must be adjacent');
                }
                assert.deepEqual(path[path.length - 1], { x: 2, y: 2 });
            }
        });

        it('should return a path via the adjacent tile when the direct path to the flag is blocked', () => {
            for (let i = 0; i < GRID_SIZE; i++) {
                for (let j = 0; j < GRID_SIZE; j++) {
                    mockGameState.boardGame.tiles[i][j].containedPlayer = null;
                    mockGameState.boardGame.tiles[i][j].type = TileType.Grass;
                    mockGameState.boardGame.tiles[i][j].doorState = true;
                }
            }
            const flag: Item = { type: ItemType.Flag } as Item;
            mockGameState.boardGame.tiles[2][2].containedItem = flag;
            mockGameState.boardGame.tiles[2][2].type = TileType.Wall;

            mockGameState.boardGame.tiles[2][1].type = TileType.Grass;

            (behavior as any).findAdjacentPosition = (flagPos: Position): Position | null => {
                return { x: flagPos.x, y: flagPos.y - 1 };
            };
            (behavior as any).findPathToAdjacentPosition = (): Position[] => {
                return [
                    { x: 0, y: 0 },
                    { x: 1, y: 0 },
                    { x: 1, y: 1 },
                    { x: 2, y: 1 },
                ];
            };

            const virtualPlayer = { position: { x: 0, y: 0 } } as VirtualPlayer;
            const path = behavior.exposedFindPathToFlag(virtualPlayer);

            assert.isDefined(path);
            assert.isNotNull(path);
            if (path) {
                assert.deepEqual(path[path.length - 1], { x: 2, y: 1 });
                for (let i = 1; i < path.length; i++) {
                    const prev = path[i - 1];
                    const curr = path[i];
                    const dx = Math.abs(curr.x - prev.x);
                    const dy = Math.abs(curr.y - prev.y);
                    assert.isTrue(dx + dy === 1, 'The path must consist of adjacent tiles');
                }
            }
        });

        it('should return null when the path via the adjacent tile is inaccessible', () => {
            for (let i = 0; i < GRID_SIZE; i++) {
                for (let j = 0; j < GRID_SIZE; j++) {
                    mockGameState.boardGame.tiles[i][j].containedPlayer = null;
                    mockGameState.boardGame.tiles[i][j].type = TileType.Grass;
                    mockGameState.boardGame.tiles[i][j].doorState = true;
                }
            }
            const flag: Item = { type: ItemType.Flag } as Item;
            const flagPos = { x: 2, y: 2 };
            mockGameState.boardGame.tiles[flagPos.x][flagPos.y].containedItem = flag;
            mockGameState.boardGame.tiles[flagPos.x][flagPos.y].type = TileType.Wall;

            (behavior as any).findAdjacentPosition = (position: Position): Position | null => {
                return { x: position.x, y: position.y - 1 };
            };

            mockGameState.boardGame.tiles[2][1].type = TileType.Wall;

            (behavior as any).findPathToAdjacentPosition = (): Position[] | null => {
                return null;
            };

            const virtualPlayer = { position: { x: 0, y: 0 } } as VirtualPlayer;
            const path = behavior.exposedFindPathToFlag(virtualPlayer);
            assert.isNull(path, 'The path should be null because the adjacent is inaccessible');
        });

        it('should find a path to a position adjacent to the flag if the direct path is blocked', () => {
            for (let i = 0; i < GRID_SIZE; i++) {
                for (let j = 0; j < GRID_SIZE; j++) {
                    mockGameState.boardGame.tiles[i][j].containedPlayer = null;
                    mockGameState.boardGame.tiles[i][j].type = TileType.Grass;
                    mockGameState.boardGame.tiles[i][j].doorState = true;
                }
            }
            mockGameState.boardGame.tiles[2][2].type = TileType.Wall;
            mockGameState.boardGame.tiles[1][1].type = TileType.Wall;

            mockGameState.boardGame.tiles[0][1].type = TileType.Grass;

            const flag: Item = { type: ItemType.Flag } as Item;
            mockGameState.boardGame.tiles[1][2].containedItem = flag;
            const virtualPlayer = { position: { x: 0, y: 0 } } as VirtualPlayer;

            const path = behavior.exposedFindPathToFlag(virtualPlayer);
            assert.isDefined(path);
            assert.isNotNull(path);
            if (path) {
                assert.isTrue(path.length > 0);
                for (let i = 1; i < path.length; i++) {
                    const prev = path[i - 1];
                    const curr = path[i];
                    const dx = Math.abs(curr.x - prev.x);
                    const dy = Math.abs(curr.y - prev.y);
                    assert.isTrue(dx + dy === 1, 'The path must be adjacent');
                }
                const lastPos = path[path.length - 1];
                const distX = Math.abs(lastPos.x - 2);
                const distY = Math.abs(lastPos.y - 2);
                assert.isTrue(distX + distY === 1, 'The path must lead to a position adjacent to the flag');
            }
        });

        it('should return null when the path to the starting position of the player with the flag is unreachable', () => {
            for (let i = 0; i < GRID_SIZE; i++) {
                for (let j = 0; j < GRID_SIZE; j++) {
                    mockGameState.boardGame.tiles[i][j].containedPlayer = null;
                    mockGameState.boardGame.tiles[i][j].type = TileType.Grass;
                    mockGameState.boardGame.tiles[i][j].doorState = true;
                }
            }

            const playerWithFlag = {
                inventory: [{ type: ItemType.Flag } as Item],
                startPosition: { x: 2, y: 2 },
            } as Player;
            mockGameState.listOfPlayers = [playerWithFlag];

            const virtualPlayer = { position: { x: 0, y: 0 } } as VirtualPlayer;

            mockGameState.boardGame.tiles[1][0].type = TileType.Wall;
            mockGameState.boardGame.tiles[1][1].type = TileType.Wall;
            mockGameState.boardGame.tiles[0][1].type = TileType.Wall;
            mockGameState.boardGame.tiles[2][1].type = TileType.Wall;

            const path = behavior.exposedFindPathToPlayerWithFlagStartPoint(virtualPlayer);
            assert.isNull(path, 'The path should be null because the starting position of the player with the flag is unreachable');
        });
    });

    describe('findPathToStartPosition', () => {
        it('should return null if the virtual player has no starting position', () => {
            const virtualPlayer = { position: { x: 0, y: 0 } } as VirtualPlayer;
            assert.isNull(behavior.exposedFindPathToStartPosition(virtualPlayer));
        });

        it('should return null if the virtual player has no current position', () => {
            const virtualPlayer = { startPosition: { x: 2, y: 2 } } as VirtualPlayer;
            assert.isNull(behavior.exposedFindPathToStartPosition(virtualPlayer));
        });

        it('should find a path to the starting position', () => {
            for (let i = 0; i < GRID_SIZE; i++) {
                for (let j = 0; j < GRID_SIZE; j++) {
                    mockGameState.boardGame.tiles[i][j].containedPlayer = null;
                    mockGameState.boardGame.tiles[i][j].type = TileType.Grass;
                    mockGameState.boardGame.tiles[i][j].doorState = true;
                }
            }
            const virtualPlayer = {
                position: { x: 0, y: 0 },
                startPosition: { x: 2, y: 2 },
            } as VirtualPlayer;
            const path = behavior.exposedFindPathToStartPosition(virtualPlayer);
            assert.isDefined(path);
            assert.isNotNull(path);
            if (path) {
                assert.isTrue(path.length > 0);
                for (let i = 1; i < path.length; i++) {
                    const prev = path[i - 1];
                    const curr = path[i];
                    const dx = Math.abs(curr.x - prev.x);
                    const dy = Math.abs(curr.y - prev.y);
                    assert.isTrue(dx + dy === 1, 'The path must be adjacent');
                }
                assert.deepEqual(path[path.length - 1], virtualPlayer.startPosition);
            }
        });

        it("should return null when the path to the virtual player's starting position is unreachable", () => {
            for (let i = 0; i < GRID_SIZE; i++) {
                for (let j = 0; j < GRID_SIZE; j++) {
                    mockGameState.boardGame.tiles[i][j].containedPlayer = null;
                    mockGameState.boardGame.tiles[i][j].type = TileType.Grass;
                    mockGameState.boardGame.tiles[i][j].doorState = true;
                }
            }

            const virtualPlayer = {
                position: { x: 0, y: 0 },
                startPosition: { x: 2, y: 2 },
            } as VirtualPlayer;

            mockGameState.boardGame.tiles[1][0].type = TileType.Wall;
            mockGameState.boardGame.tiles[1][1].type = TileType.Wall;
            mockGameState.boardGame.tiles[0][1].type = TileType.Wall;

            const path = behavior.exposedFindPathToStartPosition(virtualPlayer);

            assert.isNull(path, "The path should be null because the virtual player's starting position is unreachable");
        });
    });

    describe('findPathToPlayerWithFlagStartPoint', () => {
        it('should return null if no player has the flag', () => {
            const virtualPlayer = { position: { x: 0, y: 0 } } as VirtualPlayer;
            assert.isNull(behavior.exposedFindPathToPlayerWithFlagStartPoint(virtualPlayer));
        });

        it('should return null if the player with the flag has no starting position', () => {
            const playerWithFlag = { inventory: [{ type: ItemType.Flag }] } as Player;
            mockGameState.listOfPlayers = [playerWithFlag];
            const virtualPlayer = { position: { x: 0, y: 0 } } as VirtualPlayer;
            assert.isNull(behavior.exposedFindPathToPlayerWithFlagStartPoint(virtualPlayer));
        });

        it('should return null if the virtual player has no position', () => {
            const playerWithFlag = {
                inventory: [{ type: ItemType.Flag }],
                startPosition: { x: 2, y: 2 },
            } as Player;
            mockGameState.listOfPlayers = [playerWithFlag];
            assert.isNull(behavior.exposedFindPathToPlayerWithFlagStartPoint({} as VirtualPlayer));
        });

        it('should return null if the path to the starting position is inaccessible', () => {
            const playerWithFlag = {
                inventory: [{ type: ItemType.Flag }],
                startPosition: { x: 2, y: 2 },
            } as Player;
            mockGameState.listOfPlayers = [playerWithFlag];
            const virtualPlayer = { position: { x: 0, y: 0 } } as VirtualPlayer;

            (behavior as any).findPathToPosition = (): Position[] | null => {
                return null;
            };

            assert.isNull(behavior.exposedFindPathToPlayerWithFlagStartPoint(virtualPlayer));
        });

        it('should find a path to the starting position of the player with the flag', () => {
            for (let i = 0; i < GRID_SIZE; i++) {
                for (let j = 0; j < GRID_SIZE; j++) {
                    mockGameState.boardGame.tiles[i][j].containedPlayer = null;
                    mockGameState.boardGame.tiles[i][j].type = TileType.Grass;
                    mockGameState.boardGame.tiles[i][j].doorState = true;
                }
            }
            const playerWithFlag = {
                inventory: [{ type: ItemType.Flag }],
                startPosition: { x: 2, y: 2 },
            } as Player;
            mockGameState.listOfPlayers = [playerWithFlag];
            const virtualPlayer = { position: { x: 0, y: 0 } } as VirtualPlayer;
            const path = behavior.exposedFindPathToPlayerWithFlagStartPoint(virtualPlayer);
            assert.isDefined(path);
            assert.isNotNull(path);
            if (path) {
                assert.isTrue(path.length > 0);

                for (let i = 1; i < path.length; i++) {
                    const prev = path[i - 1];
                    const curr = path[i];
                    const dx = Math.abs(curr.x - prev.x);
                    const dy = Math.abs(curr.y - prev.y);
                    assert.isTrue(dx + dy === 1, 'The path must be adjacent');
                }
                assert.deepEqual(path[path.length - 1], playerWithFlag.startPosition);
            }
        });
    });
});
