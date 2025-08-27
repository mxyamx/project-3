/* eslint-disable max-lines */
import { GameScheduler } from '@app/classes/game-scheduler/game-scheduler';
import { GameSessionController } from '@app/controllers/game-session-controller/game-session-controller';
import { CurrentGamesService } from '@app/services/current-games/current-games.service';
import { CurrentGame } from '@common/current-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { SocketServerEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { assert } from 'chai';
import { Server, Socket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { setTimeout as delay } from 'timers/promises';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sinon = require('sinon');

interface VpSocketManager {
    clientSocket: ClientSocket;
    connect: () => void;
    emit: (event: string, data?: unknown, callback?: (response: unknown) => void) => void;
    joinRoom: (roomId: string) => void;
}

describe('GameScheduler', () => {
    let scheduler: GameScheduler;
    let mockSocketServer: Server;
    let mockSocket: Socket;
    let emitStub: sinon.SinonStub;
    let currentGame: CurrentGame;
    let player1: Player;
    let player2: Player;
    let stubbedCurrentGamesService: sinon.SinonStubbedInstance<CurrentGamesService>;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        emitStub = sinon.stub();
        mockSocketServer = {
            send: sinon.stub(),
            to: sinon.stub().returns({ emit: emitStub }),
            on: sinon.stub(),
        } as unknown as Server;

        mockSocket = {
            id: 'socket123',
            on: sinon.stub(),
        } as unknown as Socket;
        sandbox = sinon.createSandbox();

        stubbedCurrentGamesService = sandbox.createStubInstance(CurrentGamesService);

        scheduler = new GameScheduler(mockSocketServer, stubbedCurrentGamesService);

        const rows = 10;
        const cols = 10;

        player1 = {
            name: 'Player1',
            character: 'Char1',
            attributes: {
                attackValue: 4,
                defenseValue: 4,
                speedValue: 4,
                healthValue: 4,
                bonusAttack: DiceBonus.SixSideBonus,
                bonusDefense: DiceBonus.FourSideBonus,
            },
            organizer: false,
        };
        player2 = {
            name: 'Player2',
            character: 'Char2',
            attributes: {
                attackValue: 4,
                defenseValue: 4,
                speedValue: 4,
                healthValue: 4,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: false,
        };

        currentGame = {
            id: 'game123',
            players: [player1, player2],
            boardGame: {
                id: 'test',
                name: 'TestBoard',
                description: 'desc',
                size: BoardGameSize.Small,
                gameMode: GameMode.Normal,
                tiles: Array(rows)
                    .fill(null)
                    .map(() =>
                        Array(cols)
                            .fill(null)
                            .map(() => ({
                                type: TileType.Grass,
                            })),
                    ),
                previewImage: '',
                visibility: true,
                itemInfos: [],
                lastModified: new Date(),
            },
            locked: false,
        };

        currentGame.boardGame.tiles[0][0].containedItem = {
            name: 'start1',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
    });

    it('should create a game and store controller', () => {
        scheduler.createGame(currentGame);
        assert.doesNotThrow(() => scheduler.startGame(currentGame.id));
    });

    it('should join a game and store player mapping', () => {
        scheduler.createGame(currentGame);
        scheduler.joinGame(player1, currentGame, mockSocket as unknown as Socket);
        assert.doesNotThrow(async () => scheduler.disconnectPlayer(mockSocket.id));
    });
    it('should  not join a game and store player mapping', () => {
        const mockController = {
            addPlayer: sinon.spy(),
        };
        scheduler.createGame(currentGame);
        scheduler['gameMap'].set(currentGame.id, mockController as unknown as GameSessionController);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set(currentGame.id, null);
        scheduler.joinGame(player1, currentGame, mockSocket as unknown as Socket);
        assert.doesNotThrow(async () => scheduler.disconnectPlayer(mockSocket.id));
        sinon.assert.notCalled(mockController.addPlayer);
    });

    it('should add a player to the game and store the player mapping', () => {
        const mockController = {
            addPlayer: sinon.spy(),
        };
        scheduler['gameMap'].set(currentGame.id, mockController as unknown as GameSessionController);

        scheduler.joinGame(player1, currentGame, mockSocket);

        sinon.assert.calledOnce(mockController.addPlayer);
        sinon.assert.calledWith(mockController.addPlayer, player1);

        const playerMapping = scheduler['playerMap'].get(mockSocket.id);
        assert.deepStrictEqual(playerMapping, { firsElement: player1, secondElement: currentGame.id });
    });

    it('should not throw when disconnecting unregistered player', () => {
        assert.doesNotThrow(async () => scheduler.disconnectPlayer('unknownId'));
    });
    it('should call movePlayer on Move event', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const moveSpy = sinon.stub<any, any>(scheduler as any, 'movePlayer');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkSpy = sinon.stub<any, any>(scheduler as any, 'checkController');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let moveHandler: ((data: any) => void) | undefined;
        (mockSocket.on as sinon.SinonStub).callsFake((event: string, handler: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (event === 'move') moveHandler = handler as (data: any) => void;
        });
        scheduler.handleCommand(mockSocket);
        const dummyData = {
            gameCode: currentGame.id,
            path: [
                { x: 0, y: 0 },
                { x: 0, y: 1 },
            ],
        };
        moveHandler?.(dummyData);
        assert.isTrue(checkSpy.calledWith(currentGame.id, mockSocket as unknown as Socket));
        assert.isTrue(moveSpy.calledWith(currentGame.id, dummyData.path, mockSocket as unknown as Socket));
    });
    it('should emit error if controller is missing in checkController', () => {
        const emitSpy = sinon.spy();
        const socketStub = {
            emit: emitSpy,
        } as unknown as Socket;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).checkController('unknownGameId', socketStub);
        assert.isTrue(emitSpy.calledWith('serverError', sinon.match.has('message', 'partie introuvable')));
    });
    it('should not throw if controller does not exist in helper methods', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.doesNotThrow(() => (scheduler as any).endTurn('invalid'));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.doesNotThrow(() => (scheduler as any).startFight('invalid', { x: 0, y: 0 }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.doesNotThrow(() => (scheduler as any).attemptEscape('invalid'));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.doesNotThrow(() => (scheduler as any).toggleDoorState('invalid', { x: 1, y: 1 }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.doesNotThrow(() => (scheduler as any).executeAttack('invalid'));
    });
    it('should call toggleDoorState on ToggleDoorState event', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toggleSpy = sinon.stub<any, any>(scheduler as any, 'toggleDoorState');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkSpy = sinon.stub<any, any>(scheduler as any, 'checkController');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let handler: ((data: any) => void) | undefined;
        (mockSocket.on as sinon.SinonStub).callsFake((event: string, cb: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (event === 'toggleDoorState') handler = cb as (data: any) => void;
        });
        scheduler.handleCommand(mockSocket);
        const dummyData = { gameCode: currentGame.id, doorPosition: { x: 2, y: 3 } };
        handler?.(dummyData);
        assert.isTrue(checkSpy.calledWith(currentGame.id, mockSocket));
        assert.isTrue(toggleSpy.calledWith(currentGame.id, dummyData.doorPosition));
    });

    it('should call startFight on StartFight event', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const startFightSpy = sinon.stub<any, any>(scheduler as any, 'startFight');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkSpy = sinon.stub<any, any>(scheduler as any, 'checkController');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let handler: ((data: any) => void) | undefined;
        (mockSocket.on as sinon.SinonStub).callsFake((event: string, cb: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (event === 'startFight') handler = cb as (data: any) => void;
        });
        scheduler.handleCommand(mockSocket);
        const dummyData = { gameCode: currentGame.id, targetPlayerPosition: { x: 1, y: 1 } };
        handler?.(dummyData);
        assert.isTrue(checkSpy.calledWith(currentGame.id, mockSocket));
        assert.isTrue(startFightSpy.calledWith(currentGame.id, dummyData.targetPlayerPosition));
    });
    it('should call executeAttack on ExecuteAttack event', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const executeAttackSpy = sinon.stub<any, any>(scheduler as any, 'executeAttack');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkSpy = sinon.stub<any, any>(scheduler as any, 'checkController');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let handler: ((data: any) => void) | undefined;
        (mockSocket.on as sinon.SinonStub).callsFake((event: string, cb: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (event === 'executeAttack') handler = cb as (data: any) => void;
        });
        scheduler.handleCommand(mockSocket);
        const dummyData = { gameCode: currentGame.id };
        handler?.(dummyData);
        assert.isTrue(checkSpy.calledWith(currentGame.id, mockSocket));
        assert.isTrue(executeAttackSpy.calledWith(currentGame.id));
    });
    it('should call endTurn on EndTurn event', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endTurnSpy = sinon.stub<any, any>(scheduler as any, 'endTurn');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkSpy = sinon.stub<any, any>(scheduler as any, 'checkController');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let handler: ((data: any) => void) | undefined;
        (mockSocket.on as sinon.SinonStub).callsFake((event: string, cb: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (event === 'endTurn') handler = cb as (data: any) => void;
        });
        scheduler.handleCommand(mockSocket);
        const dummyData = { gameCode: currentGame.id };
        handler?.(dummyData);
        assert.isTrue(checkSpy.calledWith(currentGame.id, mockSocket));
        assert.isTrue(endTurnSpy.calledWith(currentGame.id));
    });

    it('should emit ServerError with message in sendError', () => {
        const emitSpy = sinon.spy();
        const fakeSocket = {
            emit: emitSpy,
        } as unknown as Socket;
        const errorMessage = 'custom error';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).sendError(fakeSocket, errorMessage);
        assert.isTrue(emitSpy.calledOnce);
        assert.isTrue(emitSpy.calledWith('serverError', { message: errorMessage }));
    });
    it('should call toggleDoorState on controller if it exists', () => {
        const controller = {
            toggleDoorState: sinon.spy(),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set(currentGame.id, controller);
        const dummyPosition = { x: 1, y: 2 };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).toggleDoorState(currentGame.id, dummyPosition);
        assert.isTrue(controller.toggleDoorState.calledOnceWithExactly(dummyPosition));
    });
    it('should call startFight on controller if it exists', () => {
        const controller = {
            startFight: sinon.spy(),
        };
        const targetPosition = { x: 3, y: 4 };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set(currentGame.id, controller);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).startFight(currentGame.id, targetPosition);
        assert.isTrue(controller.startFight.calledOnceWithExactly(targetPosition));
    });
    it('should call executeAttack on controller if it exists', () => {
        const controller = {
            executeAttack: sinon.spy(),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set(currentGame.id, controller);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).executeAttack(currentGame.id);
        assert.isTrue(controller.executeAttack.calledOnce);
    });
    it('should call attemptEscape on controller if it exists', () => {
        const controller = {
            attemptEscape: sinon.spy(),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set(currentGame.id, controller);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).attemptEscape(currentGame.id);
        assert.isTrue(controller.attemptEscape.calledOnce);
    });
    it('should call endTurn on controller if it exists', () => {
        const controller = {
            endTurn: sinon.spy(),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set(currentGame.id, controller);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).endTurn(currentGame.id);
        assert.isTrue(controller.endTurn.calledOnce);
    });
    it('should call movePlayer when socket is connected and path has multiple positions', () => {
        scheduler.createGame(currentGame);
        const controller = {
            movePlayer: sinon.spy(),
            endMovement: sinon.spy(),
            isPlayerMoving: false,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set(currentGame.id, controller);
        const fakeSocket = {
            connected: true,
        } as unknown as Socket;
        const path = [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: 2 },
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).movePlayer(currentGame.id, path, fakeSocket);

        assert.isTrue(controller.movePlayer.calledOnce);
    });
    it('should call attemptEscape on AttemptEscape event', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const attemptSpy = sinon.stub<any, any>(scheduler as any, 'attemptEscape');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkSpy = sinon.stub<any, any>(scheduler as any, 'checkController');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let handler: ((data: any) => void) | undefined;
        (mockSocket.on as sinon.SinonStub).callsFake((event: string, cb: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (event === SocketServerEventNames.AttemptEscape) handler = cb as (data: any) => void;
        });
        scheduler.handleCommand(mockSocket);
        const dummyData = { gameCode: currentGame.id, doorPosition: { x: 2, y: 3 } };
        handler?.(dummyData);
        assert.isTrue(checkSpy.calledWith(currentGame.id, mockSocket));
        assert.isTrue(attemptSpy.calledWith(currentGame.id));
    });
    it('should call telePort on TelePort event', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const teleportSpy = sinon.stub<any, any>(scheduler as any, 'teleportPlayer');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkSpy = sinon.stub<any, any>(scheduler as any, 'checkController');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let handler: ((data: any) => void) | undefined;
        (mockSocket.on as sinon.SinonStub).callsFake((event: string, cb: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (event === SocketServerEventNames.Teleport) handler = cb as (data: any) => void;
        });
        scheduler.handleCommand(mockSocket);
        const dummyData = { gameCode: currentGame.id, oldPosition: { x: 2, y: 3 }, newPosition: { x: 0, y: 0 } };
        handler?.(dummyData);
        assert.isTrue(checkSpy.calledWith(currentGame.id, mockSocket));
        assert.isTrue(teleportSpy.calledWith({ x: 2, y: 3 }, { x: 0, y: 0 }, currentGame.id));
    });
    it('should call dropItem on DropItem event', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dropItemSpy = sinon.stub<any, any>(scheduler as any, 'dropItem');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkSpy = sinon.stub<any, any>(scheduler as any, 'checkController');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let handler: ((data: any) => void) | undefined;

        (mockSocket.on as sinon.SinonStub).callsFake((event: string, cb: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (event === SocketServerEventNames.DropItem) {
                handler = cb as (data: unknown) => void;
            }
        });

        scheduler.handleCommand(mockSocket);

        const dummyData = {
            gameCode: currentGame.id,
            item: { type: ItemType.AttributeEditor } as Item,
            player: player1,
        };

        handler?.(dummyData);

        assert.isTrue(checkSpy.calledWith(currentGame.id, mockSocket));
        assert.isTrue(dropItemSpy.calledWith(player1, { type: ItemType.AttributeEditor }, currentGame.id));
    });

    it('should call pickUpItem on dropItem event', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pickUpItemSpy = sinon.stub<any, any>(scheduler as any, 'pickUpItem');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkSpy = sinon.stub<any, any>(scheduler as any, 'checkController');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let handler: ((data: any) => void) | undefined;
        (mockSocket.on as sinon.SinonStub).callsFake((event: string, cb: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (event === SocketServerEventNames.PickUpItem) handler = cb as (data: any) => void;
        });
        scheduler.handleCommand(mockSocket);
        const dummyData = { gameCode: currentGame.id, player: player1 };
        handler?.(dummyData);
        assert.isTrue(checkSpy.calledWith(currentGame.id, mockSocket));
        assert.isTrue(pickUpItemSpy.calledWith(player1, currentGame.id));
    });
    it('should call toggleDebugMode on Toggle event event', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const teleportSpy = sinon.stub<any, any>(scheduler as any, 'toggleDebugMode');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkSpy = sinon.stub<any, any>(scheduler as any, 'checkController');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let handler: ((data: any) => void) | undefined;
        (mockSocket.on as sinon.SinonStub).callsFake((event: string, cb: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (event === SocketServerEventNames.ToggleDebugMode) handler = cb as (data: any) => void;
        });
        scheduler.handleCommand(mockSocket);
        const dummyData = { gameCode: currentGame.id, oldPosition: { x: 2, y: 3 }, newPosition: { x: 0, y: 0 } };
        handler?.(dummyData);
        assert.isTrue(checkSpy.calledWith(currentGame.id, mockSocket));
        assert.isTrue(teleportSpy.calledWith(currentGame.id));
    });
    it('should call teleport on controller if it exists', () => {
        const controller = {
            teleportPlayer: sinon.spy(),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set(currentGame.id, controller);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).teleportPlayer({ x: 2, y: 3 }, { x: 0, y: 0 }, currentGame.id);
        assert.isTrue(controller.teleportPlayer.calledOnce);
    });
    it('should call toggleDebugMode on controller if it exists', () => {
        const controller = {
            toggleDebugMode: sinon.spy(),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set(currentGame.id, controller);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).toggleDebugMode(currentGame.id);
        assert.isTrue(controller.toggleDebugMode.calledOnce);
    });
    it('should call pickUpItem on controller if it exists', () => {
        const controller = {
            pickUpItem: sinon.spy(),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set(currentGame.id, controller);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).pickUpItem(player1, currentGame.id);
        assert.isTrue(controller.pickUpItem.calledOnce);
    });
    it('should call DropItem on controller if it exists', () => {
        const controller = {
            dropItem: sinon.spy(),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set(currentGame.id, controller);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).dropItem(player1, {} as Item, currentGame.id);
        assert.isTrue(controller.dropItem.calledOnce);
    });
    it('should delete the game if no players are left and game has started', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasGameStartedStub = sinon.stub<any, any>().returns(true);
        const clearIntervalSpy = sinon.spy(global, 'clearInterval');

        const controller = {
            hasGameStarted: hasGameStartedStub,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set('gameId', controller);

        currentGame.players = [];

        stubbedCurrentGamesService.getGame.onCall(0).resolves(currentGame);
        stubbedCurrentGamesService.getGame.onCall(1).resolves(null);
        stubbedCurrentGamesService.deleteGame.resolves();

        await scheduler['deleteGame']('gameId');

        const DELETE_GAME_DELAY_MS = 500;
        await new Promise((resolve) => setTimeout(resolve, DELETE_GAME_DELAY_MS));

        sinon.assert.calledOnce(hasGameStartedStub);
        sinon.assert.calledWith(stubbedCurrentGamesService.getGame, 'gameId');
        sinon.assert.calledOnce(stubbedCurrentGamesService.deleteGame);
        sinon.assert.calledWith(stubbedCurrentGamesService.deleteGame, 'gameId');
        sinon.assert.calledOnce(clearIntervalSpy);

        clearIntervalSpy.restore();
    });
    it('should do nothing if the game does not exist in gameMap', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasGameStartedStub = sinon.stub<any, any>().returns(true);
        const clearIntervalSpy = sinon.spy(global, 'clearInterval');

        await scheduler['deleteGame']('nonExistentGameId');
        sinon.assert.notCalled(hasGameStartedStub);
        sinon.assert.notCalled(stubbedCurrentGamesService.getGame);
        sinon.assert.notCalled(stubbedCurrentGamesService.deleteGame);
        sinon.assert.notCalled(clearIntervalSpy);
        clearIntervalSpy.restore();
    });

    it('should do nothing if the game has not started', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasGameStartedStub = sinon.stub<any, any>().returns(true);
        const clearIntervalSpy = sinon.spy(global, 'clearInterval');
        hasGameStartedStub.returns(false);
        const controller = { hasGameStarted: hasGameStartedStub };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set('gameId', controller);

        await scheduler['deleteGame']('gameId');

        sinon.assert.calledOnce(hasGameStartedStub);
        sinon.assert.notCalled(stubbedCurrentGamesService.getGame);
        sinon.assert.notCalled(stubbedCurrentGamesService.deleteGame);
        sinon.assert.notCalled(clearIntervalSpy);
        clearIntervalSpy.restore();
    });
    it('should stop retrying if the maximum retry count is reached', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasGameStartedStub = sinon.stub<any, any>().returns(true);
        const clearIntervalSpy = sinon.spy(global, 'clearInterval');
        hasGameStartedStub.returns(true);
        const controller = { hasGameStarted: hasGameStartedStub };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set('gameId', controller);

        stubbedCurrentGamesService.getGame.resolves({ players: [player1] } as CurrentGame);

        await scheduler['deleteGame']('gameId');
        const RETRY_WAIT_TIME_MS = 3500;
        await new Promise((resolve) => setTimeout(resolve, RETRY_WAIT_TIME_MS));

        sinon.assert.calledOnce(hasGameStartedStub);
        const numCalls = 20;
        sinon.assert.callCount(stubbedCurrentGamesService.getGame, numCalls);
        sinon.assert.notCalled(stubbedCurrentGamesService.deleteGame);
        sinon.assert.calledOnce(clearIntervalSpy);
        clearIntervalSpy.restore();
    });

    it('should handle errors during game deletion gracefully', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasGameStartedStub = sinon.stub<any, any>().returns(true);
        const clearIntervalSpy = sinon.spy(global, 'clearInterval');
        const controller = { hasGameStarted: hasGameStartedStub };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set('gameId', controller);

        stubbedCurrentGamesService.getGame.onCall(0).resolves({ players: [] } as CurrentGame);
        stubbedCurrentGamesService.getGame.onCall(1).resolves(null);
        stubbedCurrentGamesService.deleteGame.rejects(new Error('Deletion failed'));

        await scheduler['deleteGame']('gameId');
        const WAIT_FOR_INTERVAL_EXECUTION_MS = 500;
        await new Promise((resolve) => setTimeout(resolve, WAIT_FOR_INTERVAL_EXECUTION_MS));

        sinon.assert.calledOnce(hasGameStartedStub);
        sinon.assert.calledWith(stubbedCurrentGamesService.getGame, 'gameId');
        sinon.assert.calledOnce(stubbedCurrentGamesService.deleteGame);
        sinon.assert.calledWith(stubbedCurrentGamesService.getGame, 'gameId');
        sinon.assert.calledOnce(clearIntervalSpy);
        clearIntervalSpy.restore();
    });

    it('should handle errors from getGame gracefully', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasGameStartedStub = sinon.stub<any, any>().returns(true);
        const clearIntervalSpy = sinon.spy(global, 'clearInterval');
        hasGameStartedStub.returns(true);
        const controller = { hasGameStarted: hasGameStartedStub };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scheduler as any).gameMap.set('gameId', controller);

        stubbedCurrentGamesService.getGame.rejects(new Error('getGame failed'));
        await scheduler['deleteGame']('gameId');
        const WAIT_FOR_INTERVAL_EXECUTION_MS = 500;
        await new Promise((resolve) => setTimeout(resolve, WAIT_FOR_INTERVAL_EXECUTION_MS));

        sinon.assert.calledOnce(hasGameStartedStub);
        sinon.assert.calledOnce(stubbedCurrentGamesService.getGame);
        sinon.assert.notCalled(stubbedCurrentGamesService.deleteGame);
        sinon.assert.calledOnce(clearIntervalSpy);
        clearIntervalSpy.restore();
    });
    it('should remove the player from the playerMap and call removePlayer on the controller', async () => {
        const mockController = {
            removePlayer: sinon.spy(),
            gameOver: sinon.stub().returns(false),
            playerIsMoving: sinon.stub().returns(false),
        };
        scheduler['gameMap'].set(currentGame.id, mockController as unknown as GameSessionController);
        scheduler['playerMap'].set(mockSocket.id, { firsElement: player1, secondElement: currentGame.id });

        scheduler.disconnectPlayer(mockSocket.id);

        const milleMs = 1000;
        await delay(milleMs);
        assert.isUndefined(scheduler['playerMap'].get(mockSocket.id));
        sinon.assert.calledOnce(mockController.removePlayer);
        sinon.assert.calledWith(mockController.removePlayer, player1);
        sinon.assert.calledOnce(mockController.gameOver);
    });
    it('should not remove the player from the playerMap and call removePlayer on the controller if player is moving', async () => {
        const mockController = {
            removePlayer: sinon.spy(),
            gameOver: sinon.stub().returns(false),
            playerIsMoving: sinon.stub().returns(true),
        };
        scheduler['gameMap'].set(currentGame.id, mockController as unknown as GameSessionController);
        scheduler['playerMap'].set(mockSocket.id, { firsElement: player1, secondElement: currentGame.id });

        scheduler.disconnectPlayer(mockSocket.id);

        const milleMs = 1000;
        await delay(milleMs);
        assert.isUndefined(scheduler['playerMap'].get(mockSocket.id));
        sinon.assert.notCalled(mockController.removePlayer);
    });

    it('should not remove the player if the pair is empty', () => {
        const mockController = {
            removePlayer: sinon.spy(),
            gameOver: sinon.stub().returns(false),
        };
        scheduler['gameMap'].set(currentGame.id, mockController as unknown as GameSessionController);
        scheduler['playerMap'].set(mockSocket.id, { firsElement: null, secondElement: currentGame.id });

        scheduler.disconnectPlayer(mockSocket.id);

        sinon.assert.notCalled(mockController.removePlayer);
    });
    it('should not remove the player if the pair is empty', () => {
        const mockController = {
            removePlayer: sinon.spy(),
            gameOver: sinon.stub().returns(false),
        };
        scheduler['gameMap'].set(currentGame.id, mockController as unknown as GameSessionController);
        scheduler['playerMap'].set(mockSocket.id, { firsElement: player1, secondElement: null });

        scheduler.disconnectPlayer(mockSocket.id);

        sinon.assert.notCalled(mockController.removePlayer);
    });

    it('should delete the game if gameOver returns true', async () => {
        const mockController = {
            gameOver: sinon.stub().returns(true),
            removePlayer: sinon.spy(),
            playerIsMoving: sinon.stub().returns(false),
        };
        scheduler['gameMap'].set(currentGame.id, mockController as unknown as GameSessionController);
        scheduler['playerMap'].set(mockSocket.id, { firsElement: player1, secondElement: currentGame.id });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const deleteGameSpy = sinon.spy(scheduler as any, 'deleteGame');

        scheduler.disconnectPlayer(mockSocket.id);

        const milleMs = 1000;
        await delay(milleMs);

        sinon.assert.calledOnce(deleteGameSpy);
        sinon.assert.calledWith(deleteGameSpy, currentGame.id);
    });

    it('should do nothing if the player is not in the playerMap', () => {
        const mockController = {
            removePlayer: sinon.spy(),
            gameOver: sinon.stub().returns(false),
        };
        scheduler['gameMap'].set(currentGame.id, mockController as unknown as GameSessionController);

        scheduler.disconnectPlayer('unknownSocketId');

        sinon.assert.notCalled(mockController.removePlayer);
        sinon.assert.notCalled(mockController.gameOver);
    });

    it('should do nothing if the controller does not exist', () => {
        scheduler['playerMap'].set(mockSocket.id, { firsElement: player1, secondElement: 'unknownGameId' });

        scheduler.disconnectPlayer(mockSocket.id);

        assert.isUndefined(scheduler['playerMap'].get(mockSocket.id));
    });

    it('should join a virtual player to the game and store the player mapping', () => {
        const mockController = {
            addPlayer: sinon.spy(),
        } as unknown as GameSessionController;
        const mockVpSocket = {
            clientSocket: {
                id: 'vpSocket123',
                connected: true,
                emit: sinon.stub(),
                on: sinon.stub(),
                disconnect: sinon.stub(),
            } as unknown as ClientSocket,
            connect: sinon.stub(),
            emit: sinon.stub(),
            joinRoom: sinon.stub(),
        } as unknown as VpSocketManager;

        scheduler['gameMap'].set(currentGame.id, mockController);
        scheduler.joinGameVp(player1, currentGame, mockVpSocket);

        sinon.assert.calledOnce(mockController.addPlayer as sinon.SinonSpy);
        sinon.assert.calledWith(mockController.addPlayer as sinon.SinonSpy, player1);

        const playerMapping = scheduler['playerMap'].get('vpSocket123');
        assert.deepStrictEqual(playerMapping, { firsElement: player1, secondElement: currentGame.id });
    });

    it('should not join a virtual player if the controller does not exist', () => {
        const mockVpSocket = {
            clientSocket: {
                id: 'vpSocket123',
                connected: true,
                emit: sinon.stub(),
                on: sinon.stub(),
                disconnect: sinon.stub(),
            } as unknown as ClientSocket,
            connect: sinon.stub(),
            emit: sinon.stub(),
            joinRoom: sinon.stub(),
        } as unknown as VpSocketManager;

        scheduler.joinGameVp(player1, currentGame, mockVpSocket);

        const playerMapping = scheduler['playerMap'].get('vpSocket123');
        assert.isUndefined(playerMapping);
    });

    it('should return the game controller if it exists', () => {
        const controller = {} as GameSessionController;
        scheduler['gameMap'].set('gameId', controller);
        const result = scheduler.getGameController('gameId');
        assert.strictEqual(result, controller);
    });

    it('should return undefined if the game controller does not exist', () => {
        const result = scheduler.getGameController('unknownGameId');
        assert.isUndefined(result);
    });

    it('should handle commands when a socket connects', () => {
        const handleCommandStub = sinon.stub(GameSessionController.prototype, 'handleCommand');
        const testSocket = { on: sinon.stub() } as unknown as Socket;

        (mockSocketServer.on as sinon.SinonStub).callsFake((event: string, callback: (socket: Socket) => void) => {
            if (event === 'connection') {
                callback(testSocket);
            }
        });

        scheduler.createGame(currentGame);

        sinon.assert.calledOnce(handleCommandStub);
        sinon.assert.calledWith(handleCommandStub, testSocket);

        handleCommandStub.restore();
    });

    it('should call getActivePlayer on the controller if it exists', () => {
        const mockController = {
            getActivePlayer: sinon.spy(),
        } as unknown as GameSessionController;
        scheduler['gameMap'].set(currentGame.id, mockController);

        scheduler['getActivePlayer'](currentGame.id);

        sinon.assert.calledOnce(mockController.getActivePlayer as sinon.SinonSpy);
    });

    it('should not call getActivePlayer if the controller does not exist', () => {
        const mockController = {
            getActivePlayer: sinon.spy(),
        } as unknown as GameSessionController;

        scheduler['getActivePlayer']('unknownGameId');

        sinon.assert.notCalled(mockController.getActivePlayer as sinon.SinonSpy);
    });

    it('should call getActivePlayer on GetActivePlayer event', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getActivePlayerSpy = sinon.stub<any, any>(scheduler as any, 'getActivePlayer');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkSpy = sinon.stub<any, any>(scheduler as any, 'checkController');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let handler: ((data: any) => void) | undefined;

        (mockSocket.on as sinon.SinonStub).callsFake((event: string, cb: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (event === SocketServerEventNames.GetActivePlayer) handler = cb as (data: any) => void;
        });

        scheduler.handleCommand(mockSocket);

        const dummyData = { gameCode: currentGame.id };
        handler?.(dummyData);

        assert.isTrue(checkSpy.calledWith(currentGame.id, mockSocket));
        assert.isTrue(getActivePlayerSpy.calledWith(currentGame.id));
    });
});
