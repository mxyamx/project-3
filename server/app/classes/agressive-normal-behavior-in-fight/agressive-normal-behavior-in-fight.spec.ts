import { AgressiveNormalBehaviorInFight } from '@app/classes/agressive-normal-behavior-in-fight/agressive-normal-behavior-in-fight';
import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { CharacterAttributes } from '@common/character-attributes';
import { SocketServerEventNames } from '@common/enums/socket-events-names';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { VirtualPlayer } from '@common/virtual-player';
import { assert } from 'chai';
import { EventEmitter } from 'events';
import * as sinon from 'sinon';

function createFakeVirtualPlayer(name: string): VirtualPlayer {
    return {
        name,
        character: 'Warrior',
        attributes: {} as CharacterAttributes,
        organizer: false,
        virtualPlayer: true,
        profile: VirtualPlayerProfile.Agressive,
    };
}

function createFakeSignalValue(player: VirtualPlayer) {
    return {
        get: () => player,
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        set: () => {},
        value: player,
        eventName: 'attackingPlayerChanged',
        emitter: new EventEmitter(),
    };
}
describe('AgressiveNormalBehaviorInFight', () => {
    let vpGameSessionManagerStub: sinon.SinonStubbedInstance<VpGameSessionManager>;
    let vpSocketStub: VpSocketManager;
    let behavior: AgressiveNormalBehaviorInFight;
    let virtualPlayer: VirtualPlayer;
    const gameId = 'test-game';

    beforeEach(() => {
        virtualPlayer = createFakeVirtualPlayer('Bot');
        vpGameSessionManagerStub = sinon.createStubInstance(VpGameSessionManager);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vpGameSessionManagerStub as any).attackingPlayer = createFakeSignalValue(virtualPlayer);
        vpSocketStub = {
            clientSocket: {
                emit: sinon.stub(),
            },
        } as unknown as VpSocketManager;

        behavior = new AgressiveNormalBehaviorInFight(vpGameSessionManagerStub as unknown as VpGameSessionManager);
    });

    it('should emit ExecuteAttack if it is the attacking player', () => {
        behavior.handleBehavior(vpSocketStub, gameId, virtualPlayer);

        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).calledWith(SocketServerEventNames.ExecuteAttack, { gameCode: gameId }));
    });

    it('should not emit ExecuteAttack if it is not the attacking player', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vpGameSessionManagerStub as any).attackingPlayer = createFakeSignalValue(createFakeVirtualPlayer('NotBot'));

        behavior.handleBehavior(vpSocketStub, gameId, virtualPlayer);

        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).notCalled);
    });
});
