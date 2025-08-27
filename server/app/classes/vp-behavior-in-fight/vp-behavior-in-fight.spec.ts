import { DefensiveNormalBehaviorInFight } from '@app/classes/defensive-normal-behavior-in-fight/defensive-normal-behavior-in-fight';
import { VpBehaviorInFight } from '@app/classes/vp-behavior-in-fight/vp-behavior-in-fight';
import { AgressiveNormalBehaviorInFight } from '@app/classes/agressive-normal-behavior-in-fight/agressive-normal-behavior-in-fight';
import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { CharacterAttributes } from '@common/character-attributes';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { VirtualPlayer } from '@common/virtual-player';
import { assert } from 'chai';
import { EventEmitter } from 'events';
import * as sinon from 'sinon';

const initialHealth = 10;
function createFakeVirtualPlayer(profile: VirtualPlayerProfile, healthValue = initialHealth): VirtualPlayer {
    return {
        name: 'Bot',
        character: 'Warrior',
        attributes: { healthValue } as CharacterAttributes,
        organizer: false,
        virtualPlayer: true,
        profile,
    };
}

function createFakeSignalValue(player: VirtualPlayer) {
    return {
        get: () => player,
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        set: () => {},
        value: player,
        eventName: 'mockEvent',
        emitter: new EventEmitter(),
    };
}
describe('VpBehaviorInFight', () => {
    let vpGameSessionManagerStub: sinon.SinonStubbedInstance<VpGameSessionManager>;
    let vpSocketStub: VpSocketManager;
    let behavior: VpBehaviorInFight;
    const gameId = 'test-game';

    beforeEach(() => {
        vpGameSessionManagerStub = sinon.createStubInstance(VpGameSessionManager);
        vpSocketStub = {
            clientSocket: {
                emit: sinon.stub(),
            },
        } as unknown as VpSocketManager;
        behavior = new VpBehaviorInFight(vpGameSessionManagerStub as unknown as VpGameSessionManager);
    });

    it('should call AgressiveNormalBehaviorInFight.handleBehavior if player is agressive', () => {
        const virtualPlayer = createFakeVirtualPlayer(VirtualPlayerProfile.Agressive, initialHealth);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vpGameSessionManagerStub as any).attackingPlayer = createFakeSignalValue(virtualPlayer);
        const spy = sinon.spy(AgressiveNormalBehaviorInFight.prototype, 'handleBehavior');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        behavior.handleBehavior(vpSocketStub, gameId, virtualPlayer, {} as any, initialHealth);

        assert(spy.calledOnce);
        spy.restore();
    });

    it('should call DefensiveNormalBehaviorInFight.handleBehavior if player is defensive', () => {
        const virtualPlayer = createFakeVirtualPlayer(VirtualPlayerProfile.Defensive, initialHealth);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vpGameSessionManagerStub as any).attackingPlayer = createFakeSignalValue(virtualPlayer);
        const spy = sinon.spy(DefensiveNormalBehaviorInFight.prototype, 'handleBehavior');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        behavior.handleBehavior(vpSocketStub, gameId, virtualPlayer, {} as any, initialHealth);

        assert(spy.calledOnce);
        spy.restore();
    });
});
