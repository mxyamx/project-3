import { DefensiveNormalBehaviorInFight } from '@app/classes/defensive-normal-behavior-in-fight/defensive-normal-behavior-in-fight';
import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { CharacterAttributes } from '@common/character-attributes';
import { SocketServerEventNames } from '@common/enums/socket-events-names';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { VirtualPlayer } from '@common/virtual-player';
import { assert } from 'chai';
import { EventEmitter } from 'events';
import * as sinon from 'sinon';

const initialHealth = 4;
const lostHealth = 2;
function createFakeVirtualPlayer(name: string, healthValue: number): VirtualPlayer {
    return {
        name,
        character: 'Warrior',
        attributes: { healthValue } as CharacterAttributes,
        organizer: false,
        virtualPlayer: true,
        profile: VirtualPlayerProfile.Defensive,
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

describe('DefensiveNormalBehaviorInFight', () => {
    let vpGameSessionManagerStub: sinon.SinonStubbedInstance<VpGameSessionManager>;
    let vpSocketStub: VpSocketManager;
    let behavior: DefensiveNormalBehaviorInFight;
    let virtualPlayer: VirtualPlayer;
    const gameId = 'test-game';

    beforeEach(() => {
        virtualPlayer = createFakeVirtualPlayer('Bot', initialHealth);
        vpGameSessionManagerStub = sinon.createStubInstance(VpGameSessionManager);
        // @ts-expect-error for test flexibility
        vpGameSessionManagerStub.attackingPlayer = createFakeSignalValue(virtualPlayer);
        vpGameSessionManagerStub.nbOfEvasions = {
            get: () => 2,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        vpSocketStub = {
            clientSocket: {
                emit: sinon.stub(),
            },
        } as unknown as VpSocketManager;

        behavior = new DefensiveNormalBehaviorInFight(vpGameSessionManagerStub as unknown as VpGameSessionManager);
    });

    it('should emit ExecuteAttack if player has not lost health', () => {
        behavior.handleBehavior(vpSocketStub, gameId, virtualPlayer, initialHealth);

        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).calledWith(SocketServerEventNames.ExecuteAttack, { gameCode: gameId }));
    });

    it('should emit AttemptEscape if player has lost health and has evasions', () => {
        virtualPlayer.attributes.healthValue = lostHealth;

        behavior.handleBehavior(vpSocketStub, gameId, virtualPlayer, initialHealth);

        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).calledWith(SocketServerEventNames.AttemptEscape, { gameCode: gameId }));
    });

    it('should emit ExecuteAttack if player has lost health but no evasions', () => {
        virtualPlayer.attributes.healthValue = lostHealth;
        // @ts-expect-error test override
        vpGameSessionManagerStub.nbOfEvasions = { get: () => 0 };

        behavior.handleBehavior(vpSocketStub, gameId, virtualPlayer, initialHealth);

        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).calledWith(SocketServerEventNames.ExecuteAttack, { gameCode: gameId }));
    });

    it('should not emit anything if not the attacking player', () => {
        // @ts-expect-error test override
        vpGameSessionManagerStub.attackingPlayer = createFakeSignalValue(createFakeVirtualPlayer('NotBot', initialHealth));

        behavior.handleBehavior(vpSocketStub, gameId, virtualPlayer, initialHealth);

        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).notCalled);
    });
});
