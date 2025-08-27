import { FightVpSocketEvent } from '@app/classes/fight-vp-socket-event/fight-vp-socket-event';
import { VpBehaviorInFight } from '@app/classes/vp-behavior-in-fight/vp-behavior-in-fight';
import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { PlayerState } from '@common/enums/player-state';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { VirtualPlayer } from '@common/virtual-player';
import { assert } from 'chai';
import * as sinon from 'sinon';
describe('FightVpSocketEvent', () => {
    let vpBehaviorStub: sinon.SinonStubbedInstance<VpBehaviorInFight>;
    let gameSessionStub: sinon.SinonStubbedInstance<VpGameSessionManager>;
    let vpSocketStub: VpSocketManager;
    let virtualPlayer: VirtualPlayer;
    let instance: FightVpSocketEvent;

    beforeEach(() => {
        vpBehaviorStub = sinon.createStubInstance(VpBehaviorInFight);
        gameSessionStub = sinon.createStubInstance(VpGameSessionManager);

        gameSessionStub.attackingPlayer = {
            get: sinon.stub().returns({ name: 'Bot' }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        gameSessionStub.defendingPlayer = {
            get: sinon.stub().returns({ name: 'Enemy' }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionStub as any).nbOfEvasions = {
            get: sinon.stub().returns(2),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionStub as any).initialNbOfEvasions = 2;

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

        instance = new FightVpSocketEvent(vpBehaviorStub as unknown as VpBehaviorInFight, {
            gameId: 'game-id',
            virtualPlayer,
            vpGameSessionManager: gameSessionStub,
            vpState: new VpState(),
        });
    });

    it('should call vpBehavior.handleBehavior if it is the VP turn and timeToAttack reached', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = virtualPlayer;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).gameState = { dummy: true };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).initialHealth = 10;

        const data = { fightClockValue: 2 };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).handleClock(data, vpSocketStub);

        assert(vpBehaviorStub.handleBehavior.calledOnce);
    });

    it('should not call handleBehavior if fightClockValue is not equal to timeToAttack', () => {
        const data = { fightClockValue: 1 };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).handleClock(data, vpSocketStub);

        assert(vpBehaviorStub.handleBehavior.notCalled);
    });

    it('should handle ProcessEscapeAttempt and call updateCanEscape when escape is successful', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).configure(vpSocketStub);
        const escapeCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.ProcessEscapeAttempt).args[0][1];
        const escapeData = {
            successful: true,
            escapingPlayer: virtualPlayer,
            defenderPlayer: { name: 'Enemy' },
            message: 'escaped',
        };
        escapeCb(escapeData);

        assert(gameSessionStub.updateCanEscape.calledWith(false));
        assert(gameSessionStub.updateNbOfEvasions.calledWith(gameSessionStub.initialNbOfEvasions));
    });

    it('should handle EndFight and emit EndTurn if isVPTurn is true', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).configure(vpSocketStub);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'isVPTurn').returns(true);

        const endFightCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.EndFight).args[0][1];
        const endFightData = {
            successful: true,
            activePlayer: virtualPlayer,
            attackingPlayer: { name: 'Bot' },
        };

        await endFightCb(endFightData);

        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).calledWith(SocketClientEventNames.EndTurn));
    });
    it('should change state to Defending when virtualPlayer is defender', async () => {
        instance.configure(vpSocketStub);
        const startFightCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.StartFight).args[0][1];
        const data = {
            successful: true,
            attackingPlayer: { name: 'Other' },
            defendingPlayer: virtualPlayer,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = virtualPlayer;
        (vpSocketStub.clientSocket.once as sinon.SinonStub).callsFake((event, cb) => {
            if (event === SocketClientEventNames.GetActivePlayer) {
                cb({ successful: true, activePlayer: virtualPlayer });
            }
        });
        await startFightCb(data);
        assert(gameSessionStub.changeState.calledWith(PlayerState.Defending));
    });

    it('should change state to SpectatingFight when virtualPlayer is not involved', async () => {
        instance.configure(vpSocketStub);
        const startFightCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.StartFight).args[0][1];
        const data = {
            successful: true,
            attackingPlayer: { name: 'Other1' },
            defendingPlayer: { name: 'Other2' },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = virtualPlayer;
        (vpSocketStub.clientSocket.once as sinon.SinonStub).callsFake((event, cb) => {
            if (event === SocketClientEventNames.GetActivePlayer) {
                cb({ successful: true, activePlayer: virtualPlayer });
            }
        });
        await startFightCb(data);
        assert(gameSessionStub.changeState.calledWith(PlayerState.SpectatingFight));
    });
    it('should change state to SpectatingFight when virtualPlayer is not attacker or defender', () => {
        instance.configure(vpSocketStub);
        const switchTurnCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.SwitchTurn).args[0][1];
        const data = {
            successful: true,
            attackingPlayer: { name: 'SomeoneElse' },
            defendingPlayer: { name: 'Another' },
        };
        switchTurnCb(data);

        assert(gameSessionStub.changeState.calledWith(PlayerState.SpectatingFight));
    });
    it('should change state to WaitingForTurn when virtualPlayer is not activePlayer', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'isVPTurn').returns(false);
        instance.configure(vpSocketStub);
        const endFightCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.EndFight).args[0][1];

        const data = {
            successful: true,
            activePlayer: { name: 'Other' },
        };
        await endFightCb(data);
        assert(gameSessionStub.changeState.calledWith(PlayerState.WaitingForTurn));
    });
    it('should updateCanExecuteAttack(false) when no evasions left', () => {
        instance.configure(vpSocketStub);
        (gameSessionStub.nbOfEvasions.get as sinon.SinonStub).returns(0);
        const escapeCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.ProcessEscapeAttempt).args[0][1];
        const data = {
            successful: true,
            escapingPlayer: virtualPlayer,
            message: 'failed',
        };
        escapeCb(data);
        assert(gameSessionStub.updateCanExecuteAttack.calledWith(false));
    });

    it('should emit combat log on successful attack', () => {
        instance.configure(vpSocketStub);
        const testAttacker = virtualPlayer;
        (gameSessionStub.attackingPlayer.get as sinon.SinonStub).returns(testAttacker);
        (gameSessionStub.defendingPlayer.get as sinon.SinonStub).returns({ name: 'Enemy' });
        const attackCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.ProcessAttack).args[0][1];
        const data = {
            successful: true,
            attackingPlayer: virtualPlayer,
            defendingPlayer: { name: 'Enemy' },
            attackDice: 10,
            defenseDice: 5,
            damageDoneAttackingPlayer: 3,
        };
        attackCb(data);
        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).calledWithMatch('combat-log'));
    });

    it('should change state to Attacking and set initialHealth when virtualPlayer is attacker', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        instance.configure(vpSocketStub);
        const startFightCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.StartFight).args[0][1];
        const data = {
            successful: true,
            attackingPlayer: virtualPlayer,
            defendingPlayer: { name: 'Enemy' },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = virtualPlayer;
        await startFightCb(data);
        assert(gameSessionStub.changeState.calledWith(PlayerState.Attacking));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.equal((instance as any).initialHealth, virtualPlayer.attributes.healthValue);
    });
    it('should change state to Attacking when virtualPlayer is attacker in SwitchTurn', () => {
        instance.configure(vpSocketStub);
        const switchTurnCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.SwitchTurn).args[0][1];
        const data = {
            successful: true,
            attackingPlayer: virtualPlayer,
            defendingPlayer: { name: 'Other' },
        };
        switchTurnCb(data);
        assert(gameSessionStub.changeState.calledWith(PlayerState.Attacking));
    });
    it('should change state to Defending when virtualPlayer is defender in SwitchTurn', () => {
        instance.configure(vpSocketStub);
        const switchTurnCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.SwitchTurn).args[0][1];
        const data = {
            successful: true,
            attackingPlayer: { name: 'Other' },
            defendingPlayer: virtualPlayer,
        };
        switchTurnCb(data);
        assert(gameSessionStub.changeState.calledWith(PlayerState.Defending));
    });
    it('should decrement nbOfEvasions on failed escape when evasions remain', () => {
        (gameSessionStub.nbOfEvasions.get as sinon.SinonStub).returns(1);
        instance.configure(vpSocketStub);
        const escapeCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.ProcessEscapeAttempt).args[0][1];
        const data = {
            successful: true,
            escapingPlayer: virtualPlayer,
            message: 'failed',
        };
        escapeCb(data);
        assert(gameSessionStub.updateNbOfEvasions.calledWith(0));
    });
    it('should not call handleBehavior if attacker is undefined', () => {
        (gameSessionStub.attackingPlayer.get as sinon.SinonStub).returns(undefined);
        const data = { fightClockValue: 2 };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).handleClock(data, vpSocketStub);
        assert(vpBehaviorStub.handleBehavior.notCalled);
    });

    it('should log combat info when virtual player is the attacker', () => {
        const fakeData = {
            attackingPlayer: { name: 'Bot' },
            defendingPlayer: { name: 'Enemy' },
            attackDice: 5,
            defenseDice: 3,
            damageDoneAttackingPlayer: 2,
        };

        const onStub = vpSocketStub.clientSocket.on as sinon.SinonStub;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const emitCombatLogStub = sinon.stub(instance as any, 'emitCombatLog');

        instance['handleAttack'](vpSocketStub);

        const callback = onStub.withArgs(SocketClientEventNames.ProcessAttack).args[0][1];
        callback(fakeData);

        sinon.assert.calledOnce(emitCombatLogStub);
        const calledArgs = emitCombatLogStub.getCall(0).args;

        assert.strictEqual(calledArgs[0], vpSocketStub);
        assert.strictEqual(calledArgs[1], 'game-id');
        assert.strictEqual(calledArgs[2].type, '🎲⚔️');
        assert.include(calledArgs[2].message, 'roule');
    });
});
