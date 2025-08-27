import { GameScheduler } from '@app/classes/game-scheduler/game-scheduler';
import { GameVpSocketEvent } from '@app/classes/game-vp-socket-event/game-vp-socket-event';
import { VirtualPlayerManager } from '@app/classes/virtual-player-manager/virtual-player-manager';
import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { CurrentGamesService } from '@app/services/current-games/current-games.service';
import { BoardGame } from '@common/board-game';
import { CurrentGame } from '@common/current-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameMode } from '@common/enums/game-mode';
import { PlayerLimits } from '@common/enums/players-limit';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { Player } from '@common/player';
import { VirtualPlayer } from '@common/virtual-player';
import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import { Server } from 'socket.io';
import { Socket } from 'socket.io-client';
import { VpSocketAddingHandler } from '@app/classes/vp-socket-adding-handler/vp-socket-adding-handler';
import { VpBehaviorInGame } from '@app/classes/vp-behavior-in-game/vp-behavior-in-game';
import { VpBehaviorInFight } from '@app/classes/vp-behavior-in-fight/vp-behavior-in-fight';
import { FightVpSocketEvent } from '@app/classes/fight-vp-socket-event/fight-vp-socket-event';

describe('VpSocketAddingHandler', () => {
    let handler: VpSocketAddingHandler;
    let mockSio: Server;
    let mockSocket: Socket;
    let mockGameService: sinon.SinonStubbedInstance<CurrentGamesService>;
    let mockGameScheduler: sinon.SinonStubbedInstance<GameScheduler>;
    let mockVpManager: sinon.SinonStubbedInstance<VirtualPlayerManager>;
    let mockVpSocketManager: sinon.SinonStubbedInstance<VpSocketManager>;

    let testBoard: BoardGame;
    let testGame: CurrentGame;
    let testPlayer: Player;
    let testVirtualPlayer: VirtualPlayer;

    beforeEach(() => {
        testBoard = {
            id: 'bg1',
            name: 'Test Game',
            description: 'A test game',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: [],
            previewImage: '',
            visibility: true,
            lastModified: new Date(),
        };

        const attributes = {
            attackValue: 4,
            defenseValue: 4,
            speedValue: 4,
            healthValue: 6,
            bonusAttack: DiceBonus.FourSideBonus,
            bonusDefense: DiceBonus.SixSideBonus,
        };

        testPlayer = {
            name: 'Alice',
            character: 'a',
            attributes,
            organizer: true,
            virtualPlayer: false,
        };

        testVirtualPlayer = {
            character: 'a',
            attributes,
            organizer: false,
            name: 'VirtualPlayer',
            virtualPlayer: true,
            profile: VirtualPlayerProfile.Agressive,
        };

        testGame = {
            id: '1234',
            players: [testPlayer],
            boardGame: testBoard,
            locked: false,
        };
        mockSio = sinon.createStubInstance(Server);
        const mockEmit = sinon.stub();
        const mockTo = sinon.stub().returns({ emit: mockEmit });
        (mockSio.to as sinon.SinonStub) = mockTo;

        mockSocket = {
            id: 'test-socket-id',
            on: sinon.stub(),
            once: sinon.stub(),
            emit: sinon.stub(),
            connect: sinon.stub(),
            disconnect: sinon.stub(),
        } as unknown as Socket;
        mockGameService = sinon.createStubInstance(CurrentGamesService);
        mockGameScheduler = sinon.createStubInstance(GameScheduler);
        mockVpManager = sinon.createStubInstance(VirtualPlayerManager);
        mockVpSocketManager = sinon.createStubInstance(VpSocketManager);
        mockSocket.id = 'test-socket-id';
        mockVpSocketManager.clientSocket = mockSocket;

        const config = {
            sio: mockSio as unknown as Server,
            gameService: mockGameService,
            gameScheduler: mockGameScheduler,
            vpManagers: new Map<string, VirtualPlayerManager>([['test-game', mockVpManager]]),
            vpSockets: new Map<string, VpSocketManager>(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            gameVpSocketEvents: new Map<string, any>(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fightVpSocketEvents: new Map<string, any>(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vpBehaviorsInGame: new Map<string, any>(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vpBehaviorsInFight: new Map<string, any>(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vpGameSessionManagers: new Map<string, any>(),
            games: {},
        };

        config.vpManagers.set('test-game', mockVpManager);

        handler = new VpSocketAddingHandler(config);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('register', () => {
        it('should add virtual player when conditions are met', async () => {
            mockGameService.getGame.resolves(testGame);
            mockVpManager.createVirtualPlayer.returns(testVirtualPlayer);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mockVpManager as any).availableAvatars = ['avatar1'];
            mockGameService.addPlayer.resolves();

            const addVpCallback = sinon.stub();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mockSocket as any).on.callsFake((event: string, callback: any) => {
                if (event === 'add-virtual-player') {
                    addVpCallback.callsFake(callback);
                }
                return mockSocket;
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            handler.register(mockSocket as any);
            await addVpCallback({ gameId: 'test-game', profile: VirtualPlayerProfile.Agressive });

            assert.isTrue(mockVpManager.createVirtualPlayer.calledWith(VirtualPlayerProfile.Agressive));
            assert.isTrue(mockGameService.addPlayer.calledWith(testVirtualPlayer, 'test-game'));
        });

        it('should not add virtual player when game is full', async () => {
            const fullGame = {
                ...testGame,
                players: Array(PlayerLimits[BoardGameSize.Small].maxPlayers).fill({}),
            };
            mockGameService.getGame.resolves(fullGame);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            handler.register(mockSocket as any);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const addVpCallback = (mockSocket as any).on.getCall(0).args[1];
            await addVpCallback({ gameId: 'test-game', profile: VirtualPlayerProfile.Agressive });

            assert.isTrue(mockVpManager.createVirtualPlayer.notCalled);
        });

        it('should return null when no avatars are available', () => {
            mockVpManager.createVirtualPlayer.returns(testVirtualPlayer);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mockVpManager as any).availableAvatars = [];
            handler['games']['test-game'] = new Set(['assets/avatars/avatar1']);

            const result = handler['createVpContext'](VirtualPlayerProfile.Agressive, 'test-game', testGame, mockVpManager);

            assert.isNull(result, 'Should return null when no avatars available');
        });

        it('should handle null vpCtx gracefully', async () => {
            mockGameService.getGame.resolves(testGame);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sinon.stub(handler, 'createVpContext' as any).returns(null);

            const addVpCallback = sinon.stub();
            (mockSocket.on as sinon.SinonStub).withArgs('add-virtual-player').callsFake((event, cb) => {
                addVpCallback.callsFake(cb);
                return mockSocket;
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            handler.register(mockSocket as any);

            await addVpCallback({ gameId: 'test-game', profile: VirtualPlayerProfile.Agressive });

            sinon.assert.notCalled(mockGameService.addPlayer);
        });
    });

    describe('canAddVp', () => {
        it('should return game and manager when conditions are met', async () => {
            mockGameService.getGame.resolves(testGame);
            const result = await handler['canAddVp']('test-game');
            expect(result).to.deep.equal({
                game: testGame,
                vpManager: mockVpManager,
            });
        });

        it('should return null when game does not exist', async () => {
            mockGameService.getGame.resolves(null);
            const result = await handler['canAddVp']('non-existent-game');
            assert.isNull(result);
        });

        it('should return null when vpManager is not found for gameId', async () => {
            mockGameService.getGame.resolves(testGame);

            handler['vpManagers'] = new Map();

            const result = await handler['canAddVp']('non-existent-game');

            assert.isNull(result);
        });
    });

    describe('createVpContext', () => {
        it('should create virtual player context successfully', () => {
            mockVpManager.createVirtualPlayer.returns(testVirtualPlayer);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mockVpManager as any).availableAvatars = ['avatar1'];
            const result = handler['createVpContext'](VirtualPlayerProfile.Agressive, 'test-game', testGame, mockVpManager);
            assert.isNotNull(result);
            assert.containsAllKeys(result, ['virtualPlayer', 'vpSocketManager', 'vpState', 'vpGameSessionManager']);
        });

        it('should return null when virtualPlayer cannot be created', () => {
            const profile = VirtualPlayerProfile.Agressive;
            const gameId = 'test-game';

            mockVpManager.createVirtualPlayer.returns(null);

            const result = handler['createVpContext'](profile, gameId, testGame, mockVpManager);

            assert.isNull(result, 'Should return null when virtualPlayer cannot be created');

            assert.isTrue(mockVpManager.createVirtualPlayer.calledWith(profile));
        });
    });

    describe('notifyVpAdded', () => {
        it('should notify players and lock game when max players reached', async () => {
            const maxPlayers = PlayerLimits[BoardGameSize.Small].maxPlayers;
            const almostFullGame = {
                ...testGame,
                players: Array(maxPlayers).fill(testPlayer),
            };

            mockGameService.getGame.onFirstCall().resolves(almostFullGame);
            mockGameService.getGame.onSecondCall().resolves({
                ...almostFullGame,
                players: Array(maxPlayers).fill(testPlayer),
                locked: false,
            });

            mockGameService.updateGame.resolves();

            handler['games']['test-game'] = new Set(['assets/avatars/avatar1']);

            await handler['notifyVpAdded']('test-game', testVirtualPlayer, maxPlayers);

            assert.isTrue(mockGameService.updateGame.called);
        });
    });

    describe('wireVpSocket', () => {
        let mockVpSocketManager2: VpSocketManager;
        let mockClientSocket: sinon.SinonStubbedInstance<Socket>;

        beforeEach(() => {
            mockClientSocket = {
                id: 'test-socket-id',
                on: sinon.stub(),
                once: sinon.stub().returnsThis(),
                emit: sinon.stub(),
                connect: sinon.stub(),
                disconnect: sinon.stub(),
            } as unknown as sinon.SinonStubbedInstance<Socket>;

            mockVpSocketManager2 = {
                clientSocket: mockClientSocket as unknown as Socket,
            } as VpSocketManager;
        });

        it('should configure game and fight events on socket connect', () => {
            const vpSocketId = 'test-socket-id';
            const vpBehaviorInGame = new VpBehaviorInGame();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const vpBehaviorInFight = new VpBehaviorInFight(new VpGameSessionManager(mockVpSocketManager2, new VpState(), {} as any));
            const cfg = {
                gameId: 'test-game',
                virtualPlayer: testVirtualPlayer,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                vpGameSessionManager: new VpGameSessionManager(mockVpSocketManager2, new VpState(), {} as any),
                vpState: new VpState(),
            };

            const gameEventSpy = sinon.spy(GameVpSocketEvent.prototype, 'configure');
            const fightEventSpy = sinon.spy(FightVpSocketEvent.prototype, 'configure');

            handler['wireVpSocket'](vpSocketId, vpBehaviorInGame, vpBehaviorInFight, mockVpSocketManager2, cfg);

            sinon.assert.calledOnce(mockClientSocket.once);
            sinon.assert.calledWith(mockClientSocket.once, 'connect');

            const connectCallback = mockClientSocket.once.firstCall.args[1];
            connectCallback();

            sinon.assert.calledOnce(gameEventSpy);
            sinon.assert.calledWith(gameEventSpy, mockVpSocketManager2);
            sinon.assert.calledOnce(fightEventSpy);
            sinon.assert.calledWith(fightEventSpy, mockVpSocketManager2);

            gameEventSpy.restore();
            fightEventSpy.restore();
        });

        it('should add events to maps even if not connected yet', () => {
            const vpSocketId = 'test-socket-id';
            const vpBehaviorInGame = new VpBehaviorInGame();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const vpBehaviorInFight = new VpBehaviorInFight(new VpGameSessionManager(mockVpSocketManager2, new VpState(), {} as any));
            const cfg = {
                gameId: 'test-game',
                virtualPlayer: testVirtualPlayer,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                vpGameSessionManager: new VpGameSessionManager(mockVpSocketManager2, new VpState(), {} as any),
                vpState: new VpState(),
            };

            handler['wireVpSocket'](vpSocketId, vpBehaviorInGame, vpBehaviorInFight, mockVpSocketManager2, cfg);

            assert.isTrue(handler['gameVpSocketEvents'].has(vpSocketId));
            assert.isTrue(handler['fightVpSocketEvents'].has(vpSocketId));
        });
    });
});
