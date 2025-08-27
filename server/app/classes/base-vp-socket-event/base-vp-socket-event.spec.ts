import { BaseVpSocketEvent } from '@app/classes/base-vp-socket-event/base-vp-socket-event';
import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { VirtualPlayer } from '@common/virtual-player';
import { assert } from 'chai';
import * as sinon from 'sinon';

class ConcreteVpSocketEvent extends BaseVpSocketEvent {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    configure(): void {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected handleClock(): void {}
}

describe('BaseVpSocketEvent', () => {
    let instance: ConcreteVpSocketEvent;
    let virtualPlayer: VirtualPlayer;
    let vpSocketStub: VpSocketManager;
    let vpGameSessionManagerStub: VpGameSessionManager;

    beforeEach(() => {
        virtualPlayer = {
            name: 'Bot',
            character: 'Mage',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            attributes: { healthValue: 10, speedValue: 3 } as any,
            organizer: false,
            virtualPlayer: true,
            profile: VirtualPlayerProfile.Agressive,
            socketId: '1234',
        };

        vpSocketStub = {
            clientSocket: {
                id: '1234',
                on: sinon.stub(),
                once: sinon.stub(),
                emit: sinon.stub(),
            },
        } as unknown as VpSocketManager;

        vpGameSessionManagerStub = {} as VpGameSessionManager;

        instance = new ConcreteVpSocketEvent('game-id', virtualPlayer, vpGameSessionManagerStub, new VpState());
    });

    it('should assign gameState when getGameState receives successful response', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mockData = { successful: true, listOfPlayers: [], boardGame: {}, message: '', activePlayer: virtualPlayer } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'awaitEvent').resolves(mockData);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (instance as any).getGameState(vpSocketStub);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.deepEqual((instance as any).gameState, mockData);
    });

    it('should assign activePlayer when getActivePlayer receives successful response', async () => {
        const mockData = { successful: true, activePlayer: virtualPlayer };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'awaitEvent').resolves(mockData);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (instance as any).getActivePlayer(vpSocketStub);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.deepEqual((instance as any).activePlayer, virtualPlayer);
    });

    it('should return true when isVPTurn is valid', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = virtualPlayer;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (instance as any).isVPTurn(vpSocketStub);
        assert.isTrue(result);
    });

    it('should return false when isVPTurn is invalid (wrong socketId)', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = { ...virtualPlayer, socketId: 'wrong' };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (instance as any).isVPTurn(vpSocketStub);
        assert.isFalse(result);
    });

    it('should handle Clock event and call getGameState & getActivePlayer when successful', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getGameStateStub = sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getActivePlayerStub = sinon.stub(instance as any, 'getActivePlayer').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleClockStub = sinon.stub(instance as any, 'handleClock');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clockHandler: any = {};
        (vpSocketStub.clientSocket.on as sinon.SinonStub).callsFake((event, cb) => {
            if (event === SocketClientEventNames.Clock) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                clockHandler.value = async (data: any) => cb(data);
            }
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).registerClock(vpSocketStub);
        await clockHandler.value({ successful: true });
        assert.isTrue(getGameStateStub.calledOnce);
        assert.isTrue(getActivePlayerStub.calledOnce);
        assert.isTrue(handleClockStub.calledOnce);
    });

    it('should handle Clock event and skip handleClock when not successful', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getGameStateStub = sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getActivePlayerStub = sinon.stub(instance as any, 'getActivePlayer').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleClockStub = sinon.stub(instance as any, 'handleClock');
        const clockHandler = sinon.stub();
        (vpSocketStub.clientSocket.on as sinon.SinonStub).callsFake((event, cb) => {
            if (event === SocketClientEventNames.Clock) {
                clockHandler.value = cb;
            }
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).registerClock(vpSocketStub);
        clockHandler.value({ successful: false });
        assert.isTrue(getGameStateStub.calledOnce);
        assert.isTrue(getActivePlayerStub.calledOnce);
        assert.isFalse(handleClockStub.called);
    });
    it('should emit and resolve awaited event correctly via awaitEvent', async () => {
        const testData = { message: 'ok' };
        const onceStub = sinon.stub();
        const emitStub = sinon.stub();
        onceStub.callsFake((event, cb) => {
            if (event === 'testEvent') cb(testData);
        });
        vpSocketStub.clientSocket.once = onceStub;
        vpSocketStub.clientSocket.emit = emitStub;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (instance as any).awaitEvent(vpSocketStub, 'testEvent', 'emitEvent', { payload: 123 });
        assert.deepEqual(result, testData);
        assert.isTrue(emitStub.calledWith('emitEvent', { payload: 123 }));
    });
});
