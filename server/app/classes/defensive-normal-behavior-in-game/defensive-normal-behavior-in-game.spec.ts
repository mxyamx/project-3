import { DefensiveNormalBehaviorInGame } from '@app/classes/defensive-normal-behavior-in-game/defensive-normal-behavior-in-game';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { CharacterAttributes } from '@common/character-attributes';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';
import { VirtualPlayer } from '@common/virtual-player';
import { assert } from 'chai';
import * as sinon from 'sinon';

function createFakeVirtualPlayer(name = 'Bot'): VirtualPlayer {
    return {
        name,
        character: 'Warrior',
        attributes: {} as CharacterAttributes,
        organizer: false,
        virtualPlayer: true,
        profile: VirtualPlayerProfile.Defensive,
        position: { x: 1, y: 1 },
    };
}

describe('DefensiveNormalBehaviorInGame', () => {
    let behavior: DefensiveNormalBehaviorInGame;
    let vpSocketStub: VpSocketManager;
    let vpStateStub: VpState;
    let virtualPlayer: VirtualPlayer;
    const gameId = 'game-id';

    beforeEach(() => {
        vpStateStub = new VpState();
        behavior = new DefensiveNormalBehaviorInGame(vpStateStub);

        vpSocketStub = {
            clientSocket: {
                emit: sinon.stub(),
            },
        } as unknown as VpSocketManager;

        virtualPlayer = createFakeVirtualPlayer();
    });

    it('should move toward preferred item if found', () => {
        const preferredPath = [{ x: 1, y: 2 }];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(behavior as any, 'findNearestPreferredItem').returns({ path: preferredPath });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const moveStub = sinon.stub(behavior as any, 'moveVirtualPlayer');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        behavior.handleBehavior(vpSocketStub, gameId, virtualPlayer, { boardGame: {}, listOfPlayers: [] } as any);

        assert(moveStub.calledWith(vpSocketStub, preferredPath, gameId, true));
    });

    it('should move toward nearest player if no preferred item found', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(behavior as any, 'findNearestPreferredItem').returns(undefined);
        const playerPath = [{ x: 3, y: 4 }];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(behavior as any, 'findNearestPlayer').returns({ path: playerPath });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const moveStub = sinon.stub(behavior as any, 'moveVirtualPlayer');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        behavior.handleBehavior(vpSocketStub, gameId, virtualPlayer, { boardGame: {}, listOfPlayers: [] } as any);

        assert(moveStub.calledWith(vpSocketStub, playerPath, gameId, false));
    });

    it('should emit EndTurn if no item or player found', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(behavior as any, 'findNearestPreferredItem').returns(undefined);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(behavior as any, 'findNearestPlayer').returns(undefined);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        behavior.handleBehavior(vpSocketStub, gameId, virtualPlayer, { boardGame: {}, listOfPlayers: [] } as any);

        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).calledWith(SocketClientEventNames.EndTurn, { gameCode: gameId }));
    });

    it('should return early if virtualPlayer has no position', () => {
        virtualPlayer.position = undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const findItemSpy = sinon.spy(behavior as any, 'findNearestPreferredItem');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        behavior.handleBehavior(vpSocketStub, gameId, virtualPlayer, { boardGame: {}, listOfPlayers: [] } as any);

        assert(findItemSpy.notCalled);
    });
    it('should return Defensive as preferred item type', () => {
        const result = behavior['getPreferredItemType']();
        assert.equal(result, VpPreferenceItem.Defensive);
    });
});
