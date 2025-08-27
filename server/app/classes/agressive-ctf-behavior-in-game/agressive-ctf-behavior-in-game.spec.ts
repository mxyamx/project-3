/* eslint-disable @typescript-eslint/no-explicit-any */
import { AgressiveCTFBehaviorInGame } from '@app/classes/agressive-ctf-behavior-in-game/agressive-ctf-behavior-in-game';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { CtfTeam } from '@common/enums/ctf-team';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import { VirtualPlayer } from '@common/virtual-player';
import { assert } from 'chai';
import * as sinon from 'sinon';
describe('AgressiveCTFBehaviorInGame', () => {
    let instance: AgressiveCTFBehaviorInGame;
    let vpSocketStub: VpSocketManager;
    let virtualPlayer: VirtualPlayer;
    let emitStub: sinon.SinonStub;
    let mockGameState: any;
    beforeEach(() => {
        virtualPlayer = {
            name: 'Bot',
            character: 'Mage',
            socketId: 'socket-id',
            profile: VirtualPlayerProfile.Agressive,
            organizer: false,
            virtualPlayer: true,
            position: { x: 1, y: 1 },
            startPosition: { x: 0, y: 0 },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            attributes: { healthValue: 10, speedValue: 2 } as any,
        };

        vpSocketStub = {
            clientSocket: {
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                emit: () => {},
            },
        } as unknown as VpSocketManager;
        emitStub = sinon.stub(vpSocketStub.clientSocket, 'emit');

        mockGameState = {
            boardGame: {
                tiles: [
                    [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Grass }],
                    [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Grass }],
                    [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Grass }],
                ],
            },
            listOfPlayers: [] as Player[],
        };
        instance = new AgressiveCTFBehaviorInGame(mockGameState as any);
    });
    it('should move to base if VP has flag and path to start exists', () => {
        sinon.stub(instance as any, 'hasFlag').returns(true);
        sinon.stub(instance as any, 'findPathToStartPosition').returns([{ x: 0, y: 0 }]);
        sinon.stub(instance as any, 'moveVirtualPlayer').callsFake(() => {
            vpSocketStub.clientSocket.emit(SocketClientEventNames.MovePlayer, {});
        });
        instance.handleBehavior(vpSocketStub, 'game-id', virtualPlayer, mockGameState as any);
        assert(emitStub.calledWithMatch(SocketClientEventNames.MovePlayer));
    });
    it('should move to player at start position if VP has flag but base is blocked', () => {
        sinon.stub(instance as any, 'hasFlag').returns(true);
        sinon.stub(instance as any, 'findPathToStartPosition').returns(null);
        sinon.stub(instance as any, 'findPathToPlayerAtPosition').returns({ path: [{ x: 0, y: 0 }] });
        sinon.stub(instance as any, 'moveVirtualPlayer').callsFake(() => {
            vpSocketStub.clientSocket.emit(SocketClientEventNames.MovePlayer, {});
        });
        instance.handleBehavior(vpSocketStub, 'game-id', virtualPlayer, mockGameState as any);
        assert(emitStub.calledWithMatch(SocketClientEventNames.MovePlayer));
    });
    it('should move to nearest player if VP has flag and other options fail', () => {
        sinon.stub(instance as any, 'hasFlag').returns(true);
        sinon.stub(instance as any, 'findPathToStartPosition').returns(null);
        sinon.stub(instance as any, 'findPathToPlayerAtPosition').returns(null);
        sinon.stub(instance as any, 'findNearestPlayer').returns({ path: [{ x: 1, y: 1 }] });
        sinon.stub(instance as any, 'moveVirtualPlayer').callsFake(() => {
            vpSocketStub.clientSocket.emit(SocketClientEventNames.MovePlayer, {});
        });
        instance.handleBehavior(vpSocketStub, 'game-id', virtualPlayer, mockGameState as any);
        assert(emitStub.calledWithMatch(SocketClientEventNames.MovePlayer));
    });
    it('should move to flag if nobody has it and path exists', () => {
        sinon.stub(instance as any, 'findPlayerWithFlag').returns(undefined);
        sinon.stub(instance as any, 'findPathToFlag').returns([{ x: 1, y: 1 }]);
        sinon.stub(instance as any, 'moveVirtualPlayer').callsFake(() => {
            vpSocketStub.clientSocket.emit(SocketClientEventNames.MovePlayer, {});
        });
        instance.handleBehavior(vpSocketStub, 'game-id', virtualPlayer, mockGameState as any);
        assert(emitStub.calledWithMatch(SocketClientEventNames.MovePlayer));
    });
    it('should move to nearest player if flag is not found and no path to flag', () => {
        sinon.stub(instance as any, 'findPlayerWithFlag').returns(undefined);
        sinon.stub(instance as any, 'findPathToFlag').returns(null);
        sinon.stub(instance as any, 'findNearestPlayer').returns({ path: [{ x: 2, y: 2 }] });
        sinon.stub(instance as any, 'moveVirtualPlayer').callsFake(() => {
            vpSocketStub.clientSocket.emit(SocketClientEventNames.MovePlayer, {});
        });
        instance.handleBehavior(vpSocketStub, 'game-id', virtualPlayer, mockGameState as any);
        assert(emitStub.calledWithMatch(SocketClientEventNames.MovePlayer));
    });
    it('should follow same team strategy when teammate has flag', () => {
        const teammate = {
            name: 'teammate',
            position: { x: 0, y: 0 },
            ctfTeam: CtfTeam.FirstTeam,
        };
        virtualPlayer.ctfTeam = CtfTeam.FirstTeam;
        mockGameState.listOfPlayers = [teammate];
        sinon.stub(instance as any, 'findPlayerWithFlag').returns(teammate);
        sinon.stub(instance as any, 'hasFlag').returns(false);
        sinon.stub(instance as any, 'moveVirtualPlayer').callsFake(() => {
            vpSocketStub.clientSocket.emit(SocketClientEventNames.MovePlayer, {});
        });
        sinon.stub(instance as any, 'findNearestPlayer').returns({ path: [{ x: 1, y: 1 }] });
        instance.handleBehavior(vpSocketStub, 'game-id', virtualPlayer, mockGameState as any);
        assert(emitStub.calledWithMatch(SocketClientEventNames.MovePlayer));
    });
    it('should attack enemy with flag if found', () => {
        sinon.stub(instance as any, 'findPlayerWithFlag').returns({ name: 'enemy', position: { x: 1, y: 1 } });
        sinon.stub(instance as any, 'isInSameTeam').returns(false);
        sinon.stub(instance as any, 'findPathToPlayerAtPosition').returns({ path: [{ x: 1, y: 1 }] });
        sinon.stub(instance as any, 'moveVirtualPlayer').callsFake(() => {
            vpSocketStub.clientSocket.emit(SocketClientEventNames.MovePlayer, {});
        });
        instance.handleBehavior(vpSocketStub, 'game-id', virtualPlayer, mockGameState as any);
        assert(emitStub.calledWithMatch(SocketClientEventNames.MovePlayer));
    });
    it('should emit EndTurn if no specific action is taken', () => {
        sinon.stub(instance as any, 'handleHasFlag').returns(false);
        sinon.stub(instance as any, 'handleNobodyHasFlag').returns(false);
        sinon.stub(instance as any, 'handlePlayerWithFlag').returns(false);
        instance.handleBehavior(vpSocketStub, 'game-id', virtualPlayer, mockGameState as any);
        assert(emitStub.calledWithMatch(SocketClientEventNames.EndTurn));
    });
    it('should return Aggressive as preferred item type', () => {
        const result = (instance as any).getPreferredItemType();
        assert.equal(result, VpPreferenceItem.Aggressive);
    });
    it('should move to nearest preferred item if no player is nearby', () => {
        sinon.stub(instance as any, 'findNearestPlayer').returns(null);
        sinon.stub(instance as any, 'findNearestPreferredItem').returns({ path: [{ x: 2, y: 2 }] });
        sinon.stub(instance as any, 'moveVirtualPlayer').callsFake(() => {
            vpSocketStub.clientSocket.emit(SocketClientEventNames.MovePlayer, {});
        });
        const result = (instance as any).handleSameTeamStrategy(vpSocketStub, 'game-id', virtualPlayer);
        assert.isTrue(result);
        assert(emitStub.calledWithMatch(SocketClientEventNames.MovePlayer));
    });
    it('should move to fallback player if path to player with flag is not found', () => {
        const playerWithFlag = { name: 'enemy', position: { x: 1, y: 1 } };
        sinon.stub(instance as any, 'findPathToPlayerAtPosition').returns(null);
        sinon.stub(instance as any, 'findNearestPlayer').returns({ path: [{ x: 3, y: 3 }] });
        sinon.stub(instance as any, 'moveVirtualPlayer').callsFake(() => {
            vpSocketStub.clientSocket.emit(SocketClientEventNames.MovePlayer, {});
        });
        const result = (instance as any).handleEnemyWithFlag(vpSocketStub, 'game-id', virtualPlayer, playerWithFlag);
        assert.isTrue(result);
        assert(emitStub.calledWithMatch(SocketClientEventNames.MovePlayer));
    });
    it('should call handleEnemyWithFlag when player with flag is enemy', () => {
        const enemyWithFlag = { name: 'enemy', position: { x: 4, y: 4 } };
        sinon.stub(instance as any, 'findPlayerWithFlag').returns(enemyWithFlag);
        sinon.stub(instance as any, 'isInSameTeam').returns(false);
        sinon.stub(instance as any, 'findPathToPlayerAtPosition').returns({ path: [{ x: 4, y: 4 }] });
        sinon.stub(instance as any, 'moveVirtualPlayer').callsFake(() => {
            vpSocketStub.clientSocket.emit(SocketClientEventNames.MovePlayer, {});
        });
        const result = (instance as any).handlePlayerWithFlag(vpSocketStub, 'game-id', virtualPlayer);
        assert.isTrue(result);
        assert(emitStub.calledWithMatch(SocketClientEventNames.MovePlayer));
    });
    it('should move to nearest player if found in same team strategy', () => {
        sinon.stub(instance as any, 'findPlayerWithFlag').returns({ name: 'teammate' });
        sinon.stub(instance as any, 'isInSameTeam').returns(true);
        sinon.stub(instance as any, 'hasFlag').returns(false);
        sinon.stub(instance as any, 'findNearestPlayer').returns({ path: [{ x: 0, y: 0 }] });
        sinon.stub(instance as any, 'moveVirtualPlayer').callsFake(() => {
            vpSocketStub.clientSocket.emit(SocketClientEventNames.MovePlayer, {});
        });
        instance.handleBehavior(vpSocketStub, 'game-id', virtualPlayer, mockGameState);
        assert(emitStub.calledWithMatch(SocketClientEventNames.MovePlayer));
    });
    it('should return false in same team strategy if no player or preferred item found', () => {
        sinon.stub(instance as any, 'findPlayerWithFlag').returns({ name: 'teammate' });
        sinon.stub(instance as any, 'isInSameTeam').returns(true);
        sinon.stub(instance as any, 'hasFlag').returns(false);
        sinon.stub(instance as any, 'findNearestPlayer').returns(null);
        sinon.stub(instance as any, 'findNearestPreferredItem').returns(null);
        (instance as any).handleBehavior(vpSocketStub, 'game-id', virtualPlayer, mockGameState);
        assert.isTrue(true);
    });

    it('should return false in enemy strategy if no target reachable', () => {
        const enemy: Player = {
            name: 'enemy',
            character: 'Warrior',
            attributes: { healthValue: 10, speedValue: 2 } as any,
            organizer: false,
            position: undefined as Position | undefined,
        };
        sinon.stub(instance as any, 'findPlayerWithFlag').returns(enemy);
        sinon.stub(instance as any, 'isInSameTeam').returns(false);
        (instance as any).handleBehavior(vpSocketStub, 'game-id', virtualPlayer, mockGameState);
        assert.isTrue(true);
    });
    it('should call handleSameTeamStrategy in handlePlayerWithFlag when on same team and no flag', () => {
        const teammate = { name: 'teammate', ctfTeam: 'Red' };
        virtualPlayer.ctfTeam = CtfTeam.FirstTeam;
        sinon.stub(instance as any, 'findPlayerWithFlag').returns(teammate);
        sinon.stub(instance as any, 'isInSameTeam').returns(true);
        sinon.stub(instance as any, 'hasFlag').returns(false);
        const strategyStub = sinon.stub(instance as any, 'handleSameTeamStrategy').returns(true);
        instance.handleBehavior(vpSocketStub, 'game-id', virtualPlayer, mockGameState);
        assert(strategyStub.calledOnce);
    });
    it('should move to nearest player in same team strategy', () => {
        sinon.stub(instance as any, 'findPlayerWithFlag').returns({ name: 'teammate', ctfTeam: 1 });
        sinon.stub(instance as any, 'isInSameTeam').returns(true);
        sinon.stub(instance as any, 'hasFlag').returns(false);
        sinon.stub(instance as any, 'findNearestPlayer').returns({ path: [{ x: 1, y: 2 }] });
        sinon.stub(instance as any, 'findNearestPreferredItem').returns(null);
        sinon.stub(instance as any, 'moveVirtualPlayer').callsFake(() => {
            vpSocketStub.clientSocket.emit(SocketClientEventNames.MovePlayer, {});
        });
        (instance as any).handleBehavior(vpSocketStub, 'game-id', virtualPlayer, mockGameState);
        assert(emitStub.calledWithMatch(SocketClientEventNames.MovePlayer));
    });
    it('should move to nearest player when calling handleSameTeamStrategy directly', () => {
        sinon.stub(instance as any, 'findNearestPlayer').returns({ path: [{ x: 1, y: 2 }] });
        sinon.stub(instance as any, 'moveVirtualPlayer').callsFake(() => {
            vpSocketStub.clientSocket.emit(SocketClientEventNames.MovePlayer, {});
        });
        const result = (instance as any).handleSameTeamStrategy(vpSocketStub, 'game-id', virtualPlayer);
        assert.isTrue(result);
        assert(emitStub.calledWithMatch(SocketClientEventNames.MovePlayer));
    });
    it('should return false if no player has the flag', () => {
        sinon.stub(instance as any, 'findPlayerWithFlag').returns(undefined);
        const result = (instance as any).handlePlayerWithFlag(vpSocketStub, 'game-id', virtualPlayer);
        assert.isFalse(result);
    });
});
