/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import { GameVpSocketEvent } from '@app/classes/game-vp-socket-event/game-vp-socket-event';
import { VpBehaviorInGame } from '@app/classes/vp-behavior-in-game/vp-behavior-in-game';
import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { ITEM_NAMES } from '@app/constants/objects-constants';
import { SocketClientEventNames, SocketServerEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { VirtualPlayer } from '@common/virtual-player';
import { assert } from 'chai';
import * as sinon from 'sinon';

describe('GameVpSocketEvent', () => {
    let instance: GameVpSocketEvent;
    let behaviorStub: sinon.SinonStubbedInstance<VpBehaviorInGame>;
    let gameSessionStub: sinon.SinonStubbedInstance<VpGameSessionManager>;
    let vpSocketStub: VpSocketManager;
    let virtualPlayer: VirtualPlayer;

    beforeEach(() => {
        behaviorStub = sinon.createStubInstance(VpBehaviorInGame);
        gameSessionStub = sinon.createStubInstance(VpGameSessionManager);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gameSessionStub.nbOfActions = { get: sinon.stub().returns(2) } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionStub as any).nbOfEvasions = {
            get: sinon.stub().returns(2),
        };
        Object.defineProperty(gameSessionStub, 'initialNbOfEvasions', {
            get: () => 2,
        });
        gameSessionStub.updateNbOfActions = sinon.stub();

        virtualPlayer = {
            name: 'Bot',
            character: 'Mage',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            attributes: { healthValue: 10, speedValue: 3 } as any,
            organizer: false,
            virtualPlayer: true,
            profile: VirtualPlayerProfile.Agressive,
            socketId: '1234',
            position: { x: 1, y: 1 },
            startPosition: { x: 0, y: 0 },
        };

        vpSocketStub = {
            clientSocket: {
                id: '1234',
                on: sinon.stub(),
                emit: sinon.stub(),
                once: sinon.stub(),
            },
        } as unknown as VpSocketManager;

        instance = new GameVpSocketEvent(behaviorStub, {
            gameId: 'game-id',
            virtualPlayer,
            vpGameSessionManager: gameSessionStub,
            vpState: new VpState(),
        });
    });

    it('should update nbOfActions on StartTurn', () => {
        instance.configure(vpSocketStub);

        (instance as any).activePlayer = { name: 'Bot' };

        const startTurnCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.StartTurn).args[0][1];

        const data = { successful: true, activePlayer: { name: 'Bot' } };

        startTurnCb(data);

        assert(gameSessionStub.updateNbOfActions.calledWith(gameSessionStub.initialNbOfActions));
    });

    it('should emit log when flag is picked up', () => {
        const emitLogStub = sinon.stub(instance as any, 'emitLog');

        const data = {
            activePlayer: { name: 'Bot' },
            pickedItem: { name: 'Flag' },
        };

        (instance as any).showLogFlagNotification(vpSocketStub, data);

        sinon.assert.calledOnce(emitLogStub);

        const [socketArg, gameIdArg, gameEventArg] = emitLogStub.getCall(0).args;

        assert.strictEqual(socketArg, vpSocketStub);
        assert.strictEqual(gameIdArg, 'game-id');
        assert.strictEqual(gameEventArg.type, '🏳️');
        assert.strictEqual(gameEventArg.message, 'Bot a ramassé le drapeau');
        assert.deepEqual(gameEventArg.player, ['Bot']);
        assert.instanceOf(gameEventArg.timestamp, Date);
    });

    it('should emit log when other item is picked up', () => {
        const emitLogStub = sinon.stub(instance as any, 'emitLog');

        const data = {
            activePlayer: { name: 'Bot' },
            pickedItem: { name: 'Potion' },
        };

        (instance as any).showLogItemNotification(vpSocketStub, data);

        sinon.assert.calledOnce(emitLogStub);

        const [socketArg, gameIdArg, gameEventArg] = emitLogStub.getCall(0).args;

        assert.strictEqual(socketArg, vpSocketStub);
        assert.strictEqual(gameIdArg, 'game-id');
        assert.strictEqual(gameEventArg.type, '➕📦');
        assert.strictEqual(gameEventArg.message, 'Bot a ramassé un item: Potion');
        assert.deepEqual(gameEventArg.player, ['Bot']);
        assert.instanceOf(gameEventArg.timestamp, Date);
    });

    it("should call showLogTurnNotification if it is the virtual player's turn", () => {
        const showLogStub = sinon.stub(instance as any, 'showLogTurnNotification');

        (instance as any).activePlayer = { name: 'Bot' };

        instance['handleStartTurn'](vpSocketStub);

        const startTurnCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.StartTurn).args[0][1];

        startTurnCb({ successful: true });

        sinon.assert.calledOnce(showLogStub);
    });

    it('should emit a log when showLogTurnNotification is called', () => {
        const emitLogStub = sinon.stub(instance as any, 'emitLog');

        (instance as any).activePlayer = { name: 'Bot' };

        (instance as any).showLogTurnNotification(vpSocketStub);

        sinon.assert.calledOnce(emitLogStub);

        const [calledSocket, calledGameId, calledEvent] = emitLogStub.getCall(0).args;

        assert.strictEqual(calledSocket, vpSocketStub);
        assert.strictEqual(calledGameId, 'game-id');
        assert.strictEqual(calledEvent.type, '⏳');
        assert.include(calledEvent.message, "C'est le tour de : Bot");
        assert.deepEqual(calledEvent.player, ['Bot']);
        assert.instanceOf(calledEvent.timestamp, Date);
    });

    it('should update nbOfActions on EndTurn', () => {
        instance.configure(vpSocketStub);
        const endTurnCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.EndTurn).args[0][1];
        const data = { successful: true };
        endTurnCb(data);
        assert(gameSessionStub.updateNbOfActions.calledWith(gameSessionStub.initialNbOfActions));
    });

    it('should call updateCanEscape and updateCanExecuteAttack on successful escape', () => {
        instance.configure(vpSocketStub);
        const escapeCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.ProcessEscapeAttempt).args[0][1];
        const data = {
            successful: true,
            escapingPlayer: virtualPlayer,
            message: 'escaped',
        };
        escapeCb(data);
        assert(gameSessionStub.updateCanEscape.calledWith(false));
        assert(gameSessionStub.updateCanExecuteAttack.calledWith(false));
        assert(gameSessionStub.updateNbOfEvasions.calledWith(2));
    });
    it('should decrement nbOfEvasions on failed escape when evasions remain', () => {
        instance.configure(vpSocketStub);
        (gameSessionStub.nbOfEvasions.get as sinon.SinonStub).returns(1);
        const escapeCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.ProcessEscapeAttempt).args[0][1];
        const data = {
            successful: true,
            escapingPlayer: virtualPlayer,
            message: 'failed',
        };
        escapeCb(data);
        assert(gameSessionStub.updateNbOfEvasions.calledWith(0));
    });
    it('should updateCanExecuteAttack(false) when no evasions left after failed escape', () => {
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
    it('should not update anything if escaping player is not virtualPlayer', () => {
        instance.configure(vpSocketStub);
        const escapeCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.ProcessEscapeAttempt).args[0][1];
        const data = {
            successful: true,
            escapingPlayer: { name: 'Other' },
            message: 'escaped',
        };
        escapeCb(data);
        assert(gameSessionStub.updateCanEscape.notCalled);
        assert(gameSessionStub.updateCanExecuteAttack.notCalled);
        assert(gameSessionStub.updateNbOfEvasions.notCalled);
    });
    it('should open adjacent door and decrement actions if door is closed and VP has actions', async () => {
        instance.configure(vpSocketStub);
        (gameSessionStub.nbOfActions.get as sinon.SinonStub).returns(2);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'isVPTurn').returns(true);

        const mockTiles = [
            [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Grass }],
            [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Door, doorState: false }],
            [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Grass }],
        ];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).gameState = {
            boardGame: { tiles: mockTiles },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = { ...virtualPlayer, position: { x: 1, y: 1 } };
        const moveCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.MovePlayer).args[0][1];
        await moveCb({ successful: true, isMovingToItem: false });
        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).calledWithMatch(SocketClientEventNames.ToggleDoorState));
        assert(gameSessionStub.updateNbOfActions.calledWith(1));
    });

    it('should emit PickUpItem if player lands on preferred item', async () => {
        instance.configure(vpSocketStub);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'isVPTurn').returns(true);
        const preferredItem = {
            name: ITEM_NAMES.attributeEditor1, // ✅ Mappé à Agressive
            type: 'modificateur',
            description: 'Plume Du Faucon',
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).gameState = {
            boardGame: {
                tiles: [[{ type: TileType.Grass, containedItem: preferredItem }]],
            },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = {
            ...virtualPlayer,
            position: { x: 0, y: 0 },
            inventory: [],
        };
        const moveOverCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.MovementOver).args[0][1];
        await moveOverCb({ successful: true });
        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).calledWithMatch(SocketClientEventNames.PickUpItem));
    });
    it('should not emit PickUpItem if item is not preferred', async () => {
        instance.configure(vpSocketStub);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'isVPTurn').returns(true);
        const nonPreferredItem = {
            name: 'bouclier', // item sans correspondance dans FROM_ITEM_NAME_TO_VP_PREFERENCE
            type: 'armor',
            description: 'Bouclier solide',
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).gameState = {
            boardGame: {
                tiles: [[{ type: TileType.Grass, containedItem: nonPreferredItem }]],
            },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = {
            ...virtualPlayer,
            position: { x: 0, y: 0 },
            inventory: [],
        };
        const moveOverCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.MovementOver).args[0][1];
        await moveOverCb({ successful: true });
        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).neverCalledWithMatch(SocketClientEventNames.PickUpItem));
    });
    it('should emit EndTurn if no adjacent player and no item to pick', async () => {
        instance.configure(vpSocketStub);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'isVPTurn').returns(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).gameState = {
            boardGame: {
                tiles: [[{ type: TileType.Grass }]],
            },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = {
            ...virtualPlayer,
            position: { x: 0, y: 0 },
            inventory: [],
            startPosition: { x: 9, y: 9 },
        };
        const moveOverCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.MovementOver).args[0][1];
        await moveOverCb({ successful: true });
        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).calledWithMatch(SocketClientEventNames.EndTurn));
    });
    it('should not call anything if MovementOver is not successful', async () => {
        instance.configure(vpSocketStub);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'isVPTurn').returns(true);
        const moveOverCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.MovementOver).args[0][1];
        await moveOverCb({ successful: false });
        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).notCalled);
    });
    it('should call handleBehavior if it is VP turn and turnTime matches', async () => {
        instance.configure(vpSocketStub);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'isVPTurn').returns(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).turnTimeToMove = 3;
        const data = { turnClockValue: 3, fightClockValue: 0 };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (instance as any).handleClock(data, vpSocketStub);
        assert(behaviorStub.handleBehavior.calledOnce);
    });
    it('should register EndGame and UpdateGame listeners', () => {
        instance.configure(vpSocketStub);
        const endGameHandler = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.EndGame).args[0][1];
        const updateGameHandler = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.UpdateGame).args[0][1];
        endGameHandler({ successful: true });
        updateGameHandler({ successful: true });
        assert.isFunction(endGameHandler);
        assert.isFunction(updateGameHandler);
    });
    it('should return null if no adjacent closed door is found', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).gameState = {
            boardGame: {
                tiles: [
                    [{ type: TileType.Grass }, { type: TileType.Grass }],
                    [{ type: TileType.Grass }, { type: TileType.Grass }],
                ],
            },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (instance as any).findAdjacentClosedDoor({ x: 0, y: 0 });
        assert.isNull(result);
    });
    it('should emit EndTurn if no fight can start after movement', async () => {
        instance.configure(vpSocketStub);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'isVPTurn').returns(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = {
            ...virtualPlayer,
            position: { x: 0, y: 0 },
            inventory: [],
            startPosition: { x: 1, y: 1 },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).gameState = {
            boardGame: {
                tiles: [[{ type: TileType.Grass }]],
            },
        };
        const moveOverCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.MovementOver).args[0][1];
        await moveOverCb({ successful: true });
        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).calledWith(SocketClientEventNames.EndTurn));
    });
    it('should return null in findAdjacentPlayer if no player found', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).gameState = {
            boardGame: {
                tiles: [[{ type: TileType.Grass, containedPlayer: null }], [{ type: TileType.Grass, containedPlayer: null }]],
            },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = {
            ...virtualPlayer,
            position: { x: 0, y: 0 },
            name: 'Bot',
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (instance as any).findAdjacentPlayer();
        assert.isNull(result);
    });
    it('should emit StartFight with correct data and decrement actions', () => {
        (gameSessionStub.nbOfActions.get as sinon.SinonStub).returns(2);
        const adjacentPlayer = {
            name: 'Enemy',
            position: { x: 1, y: 1 },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).startFight(vpSocketStub, adjacentPlayer);
        assert(gameSessionStub.updateNbOfActions.calledWith(1));
        assert(
            (vpSocketStub.clientSocket.emit as sinon.SinonStub).calledWith(SocketServerEventNames.StartFight, {
                gameCode: 'game-id',
                targetPlayerPosition: { x: 1, y: 1 },
            }),
        );
    });
    it('should call startFight if an adjacent enemy is found and conditions are met', async () => {
        instance.configure(vpSocketStub);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'isVPTurn').returns(true);
        const adjacentEnemy = {
            name: 'Enemy',
            position: { x: 1, y: 2 },
            ctfTeam: 'red',
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = {
            ...virtualPlayer,
            position: { x: 1, y: 1 },
            startPosition: { x: 9, y: 9 },
            inventory: [],
            ctfTeam: 'blue',
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).vpState.isMovingToItem = false;
        (gameSessionStub.nbOfActions.get as sinon.SinonStub).returns(2);
        const tiles = [
            [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Grass }],
            [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Grass, containedPlayer: adjacentEnemy }],
        ];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).gameState = {
            boardGame: { tiles },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const startFightStub = sinon.stub(instance as any, 'startFight');
        const moveOverCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.MovementOver).args[0][1];
        await moveOverCb({ successful: true });
        assert(startFightStub.calledWith(vpSocketStub, adjacentEnemy));
    });
    it('should return the correct adjacent player in findAdjacentPlayer', () => {
        const enemyPlayer = {
            name: 'Enemy',
            position: { x: 1, y: 2 },
        };
        const tiles = [
            [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Grass }],
            [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Grass, containedPlayer: enemyPlayer }],
        ];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).gameState = {
            boardGame: { tiles },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = {
            ...virtualPlayer,
            position: { x: 1, y: 1 },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (instance as any).findAdjacentPlayer();
        assert.deepEqual(result, enemyPlayer);
    });
    it('should not call handleBehavior if it is not VP turn', async () => {
        instance.configure(vpSocketStub);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'isVPTurn').returns(false);
        const data = { turnClockValue: 3, fightClockValue: 0 };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (instance as any).handleClock(data, vpSocketStub);
        assert(behaviorStub.handleBehavior.notCalled);
    });
    it('should not update anything if EndTurn is not successful', () => {
        instance.configure(vpSocketStub);
        const cb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.EndTurn).args[0][1];
        cb({ successful: false });
        assert(gameSessionStub.updateNbOfActions.notCalled);
    });
    it('should not update anything if StartTurn is not successful', () => {
        instance.configure(vpSocketStub);
        const cb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.StartTurn).args[0][1];
        cb({ successful: false });
        assert(gameSessionStub.updateNbOfActions.notCalled);
    });
    it('should return early on unsuccessful EndGame', () => {
        instance.configure(vpSocketStub);
        const cb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.EndGame).args[0][1];
        cb({ successful: false });
        assert.isTrue(true);
    });
    it('should return early on unsuccessful UpdateGame', () => {
        instance.configure(vpSocketStub);
        const cb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.UpdateGame).args[0][1];
        cb({ successful: false });
        assert.isTrue(true);
    });
    it('should return early on unsuccessful escape attempt', () => {
        instance.configure(vpSocketStub);
        const cb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.ProcessEscapeAttempt).args[0][1];
        cb({ successful: false });
        assert.isTrue(true);
    });
    it('should not proceed in handleMovePlayer if move is not successful', async () => {
        instance.configure(vpSocketStub);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        const cb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.MovePlayer).args[0][1];
        await cb({ successful: false });
        assert.isTrue(true);
    });
    it('should not proceed in handleMovePlayer if not VP turn', async () => {
        instance.configure(vpSocketStub);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'isVPTurn').returns(false);
        const cb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.MovePlayer).args[0][1];
        await cb({ successful: true });
        assert.isTrue(true);
    });
    it('should detect winning CTF game when flag is in inventory and player at start', async () => {
        instance.configure(vpSocketStub);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getGameState').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(instance as any, 'isVPTurn').returns(true);
        const playerWithFlag = {
            ...virtualPlayer,
            inventory: [{ type: 'flag' }],
            position: { x: 0, y: 0 },
            startPosition: { x: 0, y: 0 },
        };
        const tiles = [[{ type: TileType.Grass }]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).gameState = { boardGame: { tiles } };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = playerWithFlag;
        const cb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.MovementOver).args[0][1];
        await cb({ successful: true });
        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).calledWith(SocketClientEventNames.EndTurn));
    });
    it('should return null if active player has no position in findAdjacentPlayer', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).activePlayer = { ...virtualPlayer, position: null };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (instance as any).findAdjacentPlayer();
        assert.isNull(result);
    });
    it('should not proceed in handleMovementOver if not VP turn', async () => {
        instance.configure(vpSocketStub);
        sinon.stub(instance as any, 'getGameState').resolves();
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        sinon.stub(instance as any, 'isVPTurn').returns(false);
        const movementOverCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.MovementOver).args[0][1];
        await movementOverCb({ successful: true });
        assert.isTrue(true);
    });
    it('should not proceed in handleMovementOver if active player has no position', async () => {
        instance.configure(vpSocketStub);
        sinon.stub(instance as any, 'getGameState').resolves();
        sinon.stub(instance as any, 'getActivePlayer').resolves();
        sinon.stub(instance as any, 'isVPTurn').returns(true);
        (instance as any).activePlayer = { ...virtualPlayer, position: null };
        (instance as any).gameState = {
            boardGame: {
                tiles: [[{ type: TileType.Grass }]],
            },
        };
        const movementOverCb = (vpSocketStub.clientSocket.on as sinon.SinonStub).withArgs(SocketClientEventNames.MovementOver).args[0][1];
        await movementOverCb({ successful: true });
        assert.isTrue(true);
    });
});
