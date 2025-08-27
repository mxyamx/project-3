/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import { DefensiveCTFBehaviorInGame } from '@app/classes/defensive-ctf-behavior-in-game/defensive-ctf-behavior-in-game';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { CtfTeam } from '@common/enums/ctf-team';
import { GameMode } from '@common/enums/game-mode';
import { ItemName } from '@common/enums/item-name';
import { ItemType } from '@common/enums/item-type';
import { SocketClientEventNames, SocketServerEventNames } from '@common/enums/socket-events-names';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';
import { assert } from 'chai';
import * as sinon from 'sinon';

class TestDefensiveCTFBehaviorInGame extends DefensiveCTFBehaviorInGame {
    exposedHandleBehavior(vpSocket: VpSocketManager, gameId: string, activeVirtualPlayer: VirtualPlayer, gameState: dataForm.GetGameStateRes): void {
        this.handleBehavior(vpSocket, gameId, activeVirtualPlayer, gameState);
    }

    exposedGetPreferredItemType(): VpPreferenceItem {
        return this.getPreferredItemType();
    }

    exposedIsPositionOccupied(position: Position, activeVirtualPlayer: VirtualPlayer): boolean {
        return this.isPositionOccupied(position, activeVirtualPlayer);
    }
}

class MockVpSocketManager {
    clientSocket = {
        emit: sinon.stub(),
    };
}

const createMockPlayer = (name: string, pos: Position, ctfTeam?: CtfTeam, hasFlag: boolean = false): Player => {
    return {
        name,
        position: pos,
        ctfTeam: ctfTeam || CtfTeam.FirstTeam,
        attributes: { speedValue: 3 },
        character: 'mockCharacter',
        organizer: false,
        inventory: hasFlag ? [{ name: ItemName.Flag, type: ItemType.Flag, description: 'Flag' } as Item] : [],
    } as Player;
};

const createMockVirtualPlayer = (name: string, pos: Position, ctfTeam?: CtfTeam, hasFlag: boolean = false): VirtualPlayer => {
    return {
        name,
        position: pos,
        ctfTeam: ctfTeam || CtfTeam.FirstTeam,
        attributes: { speedValue: 3 },
        character: 'mockCharacter',
        organizer: false,
        inventory: hasFlag ? [{ name: ItemName.Flag, type: ItemType.Flag, description: 'Flag' } as Item] : [],
        startPosition: { x: 0, y: 0 },
        virtualPlayer: true,
        profile: VirtualPlayerProfile.Defensive,
    } as VirtualPlayer;
};

describe('DefensiveCTFBehaviorInGame', () => {
    let behavior: TestDefensiveCTFBehaviorInGame;
    let mockGameState: dataForm.GetGameStateRes;
    let vpSocket: MockVpSocketManager;
    let gameId: string;
    const BOARD_SIZE = 5;

    beforeEach(() => {
        behavior = new TestDefensiveCTFBehaviorInGame(new VpState());
        vpSocket = new MockVpSocketManager();
        gameId = 'TESTGAME';
        mockGameState = {
            boardGame: {
                tiles: Array(BOARD_SIZE).fill(Array(BOARD_SIZE).fill({ type: 'Grass' })),
                gameMode: GameMode.Normal,
            },
            listOfPlayers: [],
        } as dataForm.GetGameStateRes;
    });

    describe('getPreferredItemType', () => {
        it('should return VpPreferenceItem.Defensive', () => {
            assert.equal(behavior.exposedGetPreferredItemType(), VpPreferenceItem.Defensive);
        });
    });

    describe('isPositionOccupied', () => {
        it('should return true when a player is at the specified position', () => {
            const position = { x: 1, y: 1 };
            const vp = createMockVirtualPlayer('VP', { x: 0, y: 0 });
            const player = createMockPlayer('Player', position);

            mockGameState.listOfPlayers = [player];
            behavior['gameState'] = mockGameState;

            assert.isTrue(behavior.exposedIsPositionOccupied(position, vp));
        });

        it('should return false when no player is at the specified position', () => {
            const position = { x: 1, y: 1 };
            const vp = createMockVirtualPlayer('VP', { x: 0, y: 0 });
            const player = createMockPlayer('Player', { x: 2, y: 2 });

            mockGameState.listOfPlayers = [player];
            behavior['gameState'] = mockGameState;

            assert.isFalse(behavior.exposedIsPositionOccupied(position, vp));
        });

        it('should return false when only the active player is at the specified position', () => {
            const position = { x: 1, y: 1 };
            const vp = createMockVirtualPlayer('VP', position);
            const player = createMockPlayer('VP', position);

            mockGameState.listOfPlayers = [player];
            behavior['gameState'] = mockGameState;

            assert.isFalse(behavior.exposedIsPositionOccupied(position, vp));
        });
    });

    describe('handleBehavior', () => {
        it('should do nothing if active virtual player has no position', () => {
            const vp = createMockVirtualPlayer('VP', null as any);
            behavior.exposedHandleBehavior(vpSocket as any, gameId, vp, mockGameState);
            assert.isFalse(vpSocket.clientSocket.emit.called);
        });

        describe('handleHasFlag branch', () => {
            let vp: VirtualPlayer;
            beforeEach(() => {
                vp = createMockVirtualPlayer('VP', { x: 0, y: 0 }, CtfTeam.FirstTeam, true);
                mockGameState.activePlayer = vp;
                mockGameState.boardGame = {
                    tiles: Array(BOARD_SIZE).fill(Array(BOARD_SIZE).fill({ type: 'Grass' })),
                    gameMode: GameMode.Normal,
                } as any;
            });

            it('should call moveVirtualPlayer with pathToStart if VP has flag and findPathToStartPosition returns a path', () => {
                const pathToStart: Position[] = [
                    { x: 0, y: 0 },
                    { x: 1, y: 0 },
                ];
                sinon.stub(behavior as any, 'findPathToStartPosition').returns(pathToStart);
                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp, mockGameState);
                assert.isTrue(
                    (vpSocket.clientSocket.emit as sinon.SinonStub).calledWith(
                        SocketServerEventNames.Move,
                        sinon.match({ gameCode: gameId, path: pathToStart, isMovingToItem: false }),
                    ),
                );

                (behavior as any).findPathToStartPosition.restore();
            });

            it('should try findPathToPlayerAtPosition if findPathToStartPosition returns null and startPosition exists', () => {
                const vp1 = createMockVirtualPlayer('VP', { x: 0, y: 0 }, CtfTeam.FirstTeam, true);
                vp1.startPosition = { x: 2, y: 2 };
                mockGameState.activePlayer = vp1;
                sinon.stub(behavior as any, 'findPathToStartPosition').returns(null);
                const pathToPlayerAtStart: Position[] = [
                    { x: 0, y: 0 },
                    { x: 1, y: 0 },
                    { x: 2, y: 2 },
                ];
                sinon.stub(behavior as any, 'findPathToPlayerAtPosition').returns({ path: pathToPlayerAtStart });
                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp1, mockGameState);
                assert.isTrue(
                    (vpSocket.clientSocket.emit as sinon.SinonStub).calledWith(
                        SocketServerEventNames.Move,
                        sinon.match({ gameCode: gameId, path: pathToPlayerAtStart, isMovingToItem: false }),
                    ),
                );

                (behavior as any).findPathToStartPosition.restore();
                (behavior as any).findPathToPlayerAtPosition.restore();
            });

            it('should try nearestPlayer if no path found for start position', () => {
                const vp2 = createMockVirtualPlayer('VP', { x: 0, y: 0 }, CtfTeam.FirstTeam, true);

                vp2.startPosition = { x: 2, y: 2 };
                mockGameState.activePlayer = vp2;

                sinon.stub(behavior as any, 'findPathToStartPosition').returns(null);
                sinon.stub(behavior as any, 'findPathToPlayerAtPosition').returns(null);
                const nearestPlayerPath: Position[] = [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                ];
                sinon.stub(behavior as any, 'findNearestPlayer').returns({ path: nearestPlayerPath });

                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp2, mockGameState);

                assert.isTrue(
                    (vpSocket.clientSocket.emit as sinon.SinonStub).calledWith(
                        SocketServerEventNames.Move,
                        sinon.match({ gameCode: gameId, path: nearestPlayerPath, isMovingToItem: false }),
                    ),
                );

                (behavior as any).findPathToStartPosition.restore();
                (behavior as any).findPathToPlayerAtPosition.restore();
                (behavior as any).findNearestPlayer.restore();
            });

            it('should try nearestPlayer if startPosition does not exist', () => {
                const vp3 = createMockVirtualPlayer('VP', { x: 0, y: 0 }, CtfTeam.FirstTeam, true);
                vp3.startPosition = undefined;
                mockGameState.activePlayer = vp3;

                sinon.stub(behavior as any, 'findPathToStartPosition').returns(null);
                const nearestPlayerPath: Position[] = [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                ];
                sinon.stub(behavior as any, 'findNearestPlayer').returns({ path: nearestPlayerPath });

                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp3, mockGameState);

                assert.isTrue(
                    (vpSocket.clientSocket.emit as sinon.SinonStub).calledWith(
                        SocketServerEventNames.Move,
                        sinon.match({ gameCode: gameId, path: nearestPlayerPath, isMovingToItem: false }),
                    ),
                );

                (behavior as any).findPathToStartPosition.restore();
                (behavior as any).findNearestPlayer.restore();
            });

            it('should return false if no path found and nearestPlayer returns null', () => {
                sinon.stub(behavior as any, 'findPathToStartPosition').returns(null);
                sinon.stub(behavior as any, 'findPathToPlayerAtPosition').returns(null);
                sinon.stub(behavior as any, 'findNearestPlayer').returns(null);
                sinon.stub(behavior as any, 'moveVirtualPlayer').returns(undefined);

                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp, mockGameState);

                assert.isTrue(vpSocket.clientSocket.emit.calledWith(SocketClientEventNames.EndTurn, { gameCode: gameId }));

                (behavior as any).findPathToStartPosition.restore();
                (behavior as any).findPathToPlayerAtPosition.restore();
                (behavior as any).findNearestPlayer.restore();
                (behavior as any).moveVirtualPlayer.restore();
            });
        });

        describe('handleNobodyHasFlag branch', () => {
            let vp: VirtualPlayer;
            beforeEach(() => {
                vp = createMockVirtualPlayer('VP', { x: 0, y: 0 }, CtfTeam.FirstTeam, false);
                mockGameState.activePlayer = vp;
                mockGameState.boardGame = {
                    tiles: Array(BOARD_SIZE).fill(Array(BOARD_SIZE).fill({ type: 'Grass' })),
                    gameMode: GameMode.Normal,
                } as any;
            });

            it('should call moveVirtualPlayer with pathToFlag if findPathToFlag returns a path', () => {
                const vp2 = createMockVirtualPlayer('VP', { x: 0, y: 0 }, CtfTeam.FirstTeam, false);
                mockGameState.activePlayer = vp2;

                sinon.stub(behavior as any, 'findPlayerWithFlag').returns(null);

                const pathToFlag: Position[] = [
                    { x: 0, y: 0 },
                    { x: 1, y: 0 },
                    { x: 2, y: 0 },
                ];
                sinon.stub(behavior as any, 'findPathToFlag').returns(pathToFlag);

                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp2, mockGameState);

                assert.isTrue(
                    (vpSocket.clientSocket.emit as sinon.SinonStub).calledWith(
                        SocketServerEventNames.Move,
                        sinon.match({ gameCode: gameId, path: pathToFlag, isMovingToItem: true }),
                    ),
                );

                (behavior as any).findPlayerWithFlag.restore();
                (behavior as any).findPathToFlag.restore();
            });

            it('should call moveVirtualPlayer with nearestPlayer path if findPathToFlag returns null but nearestPlayer is found', () => {
                const vp4 = createMockVirtualPlayer('VP', { x: 0, y: 0 }, CtfTeam.FirstTeam, false);
                mockGameState.activePlayer = vp4;

                sinon.stub(behavior as any, 'findPlayerWithFlag').returns(null);
                sinon.stub(behavior as any, 'findPathToFlag').returns(null);
                const nearestPlayerPath: Position[] = [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                ];
                sinon.stub(behavior as any, 'findNearestPlayer').returns({ path: nearestPlayerPath });

                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp4, mockGameState);

                assert.isTrue(
                    (vpSocket.clientSocket.emit as sinon.SinonStub).calledWith(
                        SocketServerEventNames.Move,
                        sinon.match({ gameCode: gameId, path: nearestPlayerPath, isMovingToItem: false }),
                    ),
                );

                (behavior as any).findPlayerWithFlag.restore();
                (behavior as any).findPathToFlag.restore();
                (behavior as any).findNearestPlayer.restore();
            });

            it('should return false if findPathToFlag and findNearestPlayer both return null', () => {
                sinon.stub(behavior as any, 'findPlayerWithFlag').returns(null);
                sinon.stub(behavior as any, 'findPathToFlag').returns(null);
                sinon.stub(behavior as any, 'findNearestPlayer').returns(null);
                sinon.stub(behavior as any, 'moveVirtualPlayer').returns(undefined);

                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp, mockGameState);

                assert.isTrue(vpSocket.clientSocket.emit.calledWith(SocketClientEventNames.EndTurn, { gameCode: gameId }));

                (behavior as any).findPlayerWithFlag.restore();
                (behavior as any).findPathToFlag.restore();
                (behavior as any).findNearestPlayer.restore();
                (behavior as any).moveVirtualPlayer.restore();
            });
        });

        describe('handlePlayerWithFlag branch', () => {
            let vp: VirtualPlayer;
            let targetPlayer: Player;
            const targetPos: Position = { x: 2, y: 2 };
            beforeEach(() => {
                vp = createMockVirtualPlayer('VP', { x: 0, y: 0 }, CtfTeam.FirstTeam, false);
                mockGameState.activePlayer = vp;
                targetPlayer = createMockPlayer('Target', targetPos, CtfTeam.SecondTeam, true);
                mockGameState.listOfPlayers = [targetPlayer];
                mockGameState.boardGame = {
                    tiles: Array(BOARD_SIZE).fill(Array(BOARD_SIZE).fill({ type: 'Grass' })),
                    gameMode: GameMode.Normal,
                } as any;
            });

            it('should handle same team strategy if target player is in same team and VP does not have flag', () => {
                targetPlayer.ctfTeam = CtfTeam.FirstTeam;
                vp.inventory = [];

                sinon.stub(behavior as any, 'findPlayerWithFlag').returns(targetPlayer);

                const preferredItemPath: Position[] = [
                    { x: 0, y: 0 },
                    { x: 1, y: 0 },
                ];
                sinon.stub(behavior as any, 'findNearestPreferredItem').returns({ path: preferredItemPath });

                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp, mockGameState);

                assert.isTrue(
                    (vpSocket.clientSocket.emit as sinon.SinonStub).calledWith(
                        SocketServerEventNames.Move,
                        sinon.match({ gameCode: gameId, path: preferredItemPath, isMovingToItem: true }),
                    ),
                );

                (behavior as any).findPlayerWithFlag.restore();
                (behavior as any).findNearestPreferredItem.restore();
            });

            it('should try findNearestPlayer if findNearestPreferredItem returns null in same team strategy', () => {
                targetPlayer.ctfTeam = CtfTeam.FirstTeam;

                vp.inventory = [];

                sinon.stub(behavior as any, 'findPlayerWithFlag').returns(targetPlayer);
                sinon.stub(behavior as any, 'findNearestPreferredItem').returns(null);
                const nearestPlayerPath: Position[] = [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                ];
                sinon.stub(behavior as any, 'findNearestPlayer').returns({ path: nearestPlayerPath });

                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp, mockGameState);

                assert.isTrue(
                    (vpSocket.clientSocket.emit as sinon.SinonStub).calledWith(
                        SocketServerEventNames.Move,
                        sinon.match({ gameCode: gameId, path: nearestPlayerPath, isMovingToItem: false }),
                    ),
                );

                (behavior as any).findPlayerWithFlag.restore();
                (behavior as any).findNearestPreferredItem.restore();
                (behavior as any).findNearestPlayer.restore();
            });

            it('should return false if both findNearestPreferredItem and findNearestPlayer return null in same team strategy', () => {
                targetPlayer.ctfTeam = CtfTeam.FirstTeam;
                sinon.stub(behavior as any, 'findPlayerWithFlag').returns(targetPlayer);
                sinon.stub(behavior as any, 'findNearestPreferredItem').returns(null);
                sinon.stub(behavior as any, 'findNearestPlayer').returns(null);
                sinon.stub(behavior as any, 'moveVirtualPlayer').returns(undefined);

                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp, mockGameState);

                assert.isTrue(vpSocket.clientSocket.emit.calledWith(SocketClientEventNames.EndTurn, { gameCode: gameId }));

                (behavior as any).findPlayerWithFlag.restore();
                (behavior as any).findNearestPreferredItem.restore();
                (behavior as any).findNearestPlayer.restore();
                (behavior as any).moveVirtualPlayer.restore();
            });

            it('should handle enemy with flag by using findPathToPlayerWithFlagStartPoint if target has a startPosition', () => {
                targetPlayer.startPosition = { x: 3, y: 3 };
                targetPlayer.ctfTeam = CtfTeam.SecondTeam;
                sinon.stub(behavior as any, 'findPlayerWithFlag').returns(targetPlayer);
                sinon.stub(behavior as any, 'isPositionOccupied').returns(false);
                const pathToFlagStart: Position[] = [
                    { x: 0, y: 0 },
                    { x: 1, y: 0 },
                    { x: 2, y: 0 },
                    { x: 3, y: 3 },
                ];
                sinon.stub(behavior as any, 'findPathToPlayerWithFlagStartPoint').returns(pathToFlagStart);

                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp, mockGameState);

                assert.isTrue(
                    (vpSocket.clientSocket.emit as sinon.SinonStub).calledWith(
                        SocketServerEventNames.Move,
                        sinon.match({ gameCode: gameId, path: pathToFlagStart, isMovingToItem: false }),
                    ),
                );

                (behavior as any).findPlayerWithFlag.restore();
                (behavior as any).isPositionOccupied.restore();
                (behavior as any).findPathToPlayerWithFlagStartPoint.restore();
            });

            it('should handle enemy with flag by using findPathToPlayerAtPosition if findPathToPlayerWithFlagStartPoint returns null', () => {
                targetPlayer.startPosition = { x: 3, y: 3 };
                targetPlayer.position = { x: 5, y: 5 };

                sinon.stub(behavior as any, 'findPlayerWithFlag').returns(targetPlayer);
                sinon.stub(behavior as any, 'isPositionOccupied').returns(false);
                sinon.stub(behavior as any, 'findPathToPlayerWithFlagStartPoint').returns(null);

                const pathToPlayer: Position[] = [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                    { x: 2, y: 2 },
                ];
                sinon.stub(behavior as any, 'findPathToPlayerAtPosition').returns({ path: pathToPlayer });

                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp, mockGameState);

                assert.isTrue(
                    (vpSocket.clientSocket.emit as sinon.SinonStub).calledWith(
                        SocketServerEventNames.Move,
                        sinon.match({ gameCode: gameId, path: pathToPlayer, isMovingToItem: false }),
                    ),
                );

                (behavior as any).findPlayerWithFlag.restore();
                (behavior as any).isPositionOccupied.restore();
                (behavior as any).findPathToPlayerWithFlagStartPoint.restore();
                (behavior as any).findPathToPlayerAtPosition.restore();
            });

            it('should handle enemy with flag by using findPathToPlayerAtPosition if no other path available', () => {
                targetPlayer.startPosition = undefined;
                targetPlayer.position = { x: 5, y: 5 };

                sinon.stub(behavior as any, 'findPlayerWithFlag').returns(targetPlayer);
                sinon.stub(behavior as any, 'isPositionOccupied').returns(false);
                sinon.stub(behavior as any, 'findPathToPlayerWithFlagStartPoint').returns(null);

                const pathToPlayer: Position[] = [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                    { x: 2, y: 2 },
                ];
                sinon.stub(behavior as any, 'findPathToPlayerAtPosition').returns({ path: pathToPlayer });

                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp, mockGameState);

                assert.isTrue(
                    (vpSocket.clientSocket.emit as sinon.SinonStub).calledWith(
                        SocketServerEventNames.Move,
                        sinon.match({ gameCode: gameId, path: pathToPlayer, isMovingToItem: false }),
                    ),
                );

                (behavior as any).findPlayerWithFlag.restore();
                (behavior as any).isPositionOccupied.restore();
                (behavior as any).findPathToPlayerWithFlagStartPoint.restore();
                (behavior as any).findPathToPlayerAtPosition.restore();
            });

            it('should handle enemy with flag by using findPathToPlayerAtPosition when startPosition is occupied', () => {
                targetPlayer.startPosition = { x: 3, y: 3 };
                targetPlayer.position = { x: 5, y: 5 };

                sinon.stub(behavior as any, 'findPlayerWithFlag').returns(targetPlayer);
                sinon.stub(behavior as any, 'isPositionOccupied').returns(true);
                sinon.stub(behavior as any, 'findPathToPlayerWithFlagStartPoint').returns(null);
                const pathToPlayer: Position[] = [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                    { x: 3, y: 3 },
                ];
                sinon.stub(behavior as any, 'findPathToPlayerAtPosition').returns({ path: pathToPlayer });

                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp, mockGameState);

                assert.isTrue(
                    (vpSocket.clientSocket.emit as sinon.SinonStub).calledWith(
                        SocketServerEventNames.Move,
                        sinon.match({ gameCode: gameId, path: pathToPlayer, isMovingToItem: false }),
                    ),
                );

                (behavior as any).findPlayerWithFlag.restore();
                (behavior as any).isPositionOccupied.restore();
                (behavior as any).findPathToPlayerWithFlagStartPoint.restore();
                (behavior as any).findPathToPlayerAtPosition.restore();
            });

            it('should handle enemy with flag by using findPathToPlayerAtPosition when player has no position', () => {
                targetPlayer.ctfTeam = CtfTeam.SecondTeam;
                targetPlayer.startPosition = { x: 3, y: 3 };
                targetPlayer.position = undefined;

                sinon.stub(behavior as any, 'findPlayerWithFlag').returns(targetPlayer);

                sinon.stub(behavior as any, 'isPositionOccupied').returns(true);

                sinon.stub(behavior as any, 'findPathToPlayerWithFlagStartPoint').returns(null);

                const pathToPlayer: Position[] = [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                    { x: 3, y: 3 },
                ];
                sinon.stub(behavior as any, 'findPathToPlayerAtPosition').returns({ path: pathToPlayer });

                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp, mockGameState);

                assert.isTrue(
                    (vpSocket.clientSocket.emit as sinon.SinonStub).calledWith(
                        SocketServerEventNames.Move,
                        sinon.match({ gameCode: gameId, path: pathToPlayer, isMovingToItem: false }),
                    ),
                );

                (behavior as any).findPlayerWithFlag.restore();
                (behavior as any).isPositionOccupied.restore();
                (behavior as any).findPathToPlayerWithFlagStartPoint.restore();
                (behavior as any).findPathToPlayerAtPosition.restore();
            });

            it('should return false if findPlayerWithFlag returns null', () => {
                sinon.stub(behavior as any, 'findPlayerWithFlag').returns(null);
                sinon.stub(behavior as any, 'moveVirtualPlayer').returns(undefined);

                behavior.exposedHandleBehavior(vpSocket as any, gameId, vp, mockGameState);

                assert.isTrue(vpSocket.clientSocket.emit.calledWith(SocketClientEventNames.EndTurn, { gameCode: gameId }));

                (behavior as any).findPlayerWithFlag.restore();
                (behavior as any).moveVirtualPlayer.restore();
            });
        });

        it('should emit EndTurn if no branch moves the VP', () => {
            sinon.stub(behavior as any, 'handleHasFlag').returns(false);
            sinon.stub(behavior as any, 'handleNobodyHasFlag').returns(false);
            sinon.stub(behavior as any, 'handlePlayerWithFlag').returns(false);

            const vp = createMockVirtualPlayer('VP', { x: 0, y: 0 });
            behavior.exposedHandleBehavior(vpSocket as any, gameId, vp, mockGameState);

            assert.isTrue(vpSocket.clientSocket.emit.calledWith(SocketClientEventNames.EndTurn, { gameCode: gameId }));

            (behavior as any).handleHasFlag.restore();
            (behavior as any).handleNobodyHasFlag.restore();
            (behavior as any).handlePlayerWithFlag.restore();
        });
    });

    it('should return false when enemy with flag branch fails to produce a path (findPathToPlayerAtPosition returns null)', () => {
        const targetPlayer = createMockPlayer('Target', { x: 5, y: 5 }, CtfTeam.SecondTeam, true);
        const vp = createMockVirtualPlayer('VP', { x: 0, y: 0 }, CtfTeam.FirstTeam, false);

        targetPlayer.ctfTeam = CtfTeam.SecondTeam;
        targetPlayer.startPosition = undefined;
        targetPlayer.position = { x: 5, y: 5 };

        sinon.stub(behavior as any, 'findPlayerWithFlag').returns(targetPlayer);
        sinon.stub(behavior as any, 'isPositionOccupied').returns(false);
        sinon.stub(behavior as any, 'findPathToPlayerWithFlagStartPoint').returns(null);
        sinon.stub(behavior as any, 'findPathToPlayerAtPosition').returns(null);

        const result = behavior['handlePlayerWithFlag'](vpSocket as any, gameId, vp);

        assert.isFalse(result, 'Expected handlePlayerWithFlag to return false when no path is found');

        assert.isFalse((vpSocket.clientSocket.emit as sinon.SinonStub).called, 'Expected no movement event to be emitted');

        (behavior as any).findPlayerWithFlag.restore();
        (behavior as any).isPositionOccupied.restore();
        (behavior as any).findPathToPlayerWithFlagStartPoint.restore();
        (behavior as any).findPathToPlayerAtPosition.restore();
    });
});
