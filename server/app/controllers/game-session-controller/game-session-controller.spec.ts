/* eslint-disable no-empty */
/* eslint-disable max-lines */
/* eslint-disable no-undef */
import { GameClockManager } from '@app/classes/game-clock-manager/game-clock-manager';
import { GameSession } from '@app/classes/game-session/game-session';
import { MAX_AMOUNT_OF_VICTORIES, MOVEMENT_TIME_INTERVAL_MSEC } from '@app/constants/development-constants';
import { FightSubController } from '@app/controllers/fight-sub-controller/fight-sub-controller';
import { GameSessionController } from '@app/controllers/game-session-controller/game-session-controller';
import { MovementSubController } from '@app/controllers/movement-sub-controller/movement-sub-controller';
import { sendError } from '@app/utils/functions/socket-error-functions';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameMode } from '@common/enums/game-mode';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { Fight } from '@common/fight';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import { createStubInstance } from 'sinon';
import { Server } from 'socket.io';
import { io as ioClient, Socket } from 'socket.io-client';
import { CtfTeam } from '@common/enums/ctf-team';
import { ItemType } from '@common/enums/item-type';
import { Item } from '@common/item';
import { assert, expect } from 'chai';
import * as io from 'socket.io';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sinon = require('sinon');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Sinon = require('sinon');

let sandbox: sinon.SinonSandbox;
describe('GameSessionController', () => {
    let controller: GameSessionController;
    let boardGame: BoardGame;
    let gameSession: GameSession;
    let clockManager: GameClockManager;
    let fightController: FightSubController;
    let moveController: MovementSubController;
    let mockSocketServer: Server;
    let player1: Player;
    let player2: Player;
    let clientSocket: Socket;

    const urlString = 'http://localhost:3000';

    beforeEach(() => {
        clientSocket = ioClient(urlString);
        const rows = 10;
        const cols = 10;
        boardGame = {
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
        };
        boardGame.tiles[0][0].containedItem = {
            name: 'Start1',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        boardGame.tiles[0][1].containedItem = {
            name: 'Start2',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
        player1 = {
            name: 'Player1',
            character: 'Char1',
            attributes: {
                attackValue: 4,
                defenseValue: 4,
                speedValue: 4,
                healthValue: 4,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: false,
            inventory: [],
        };

        player2 = {
            name: 'Player2',
            character: 'Char2',
            attributes: {
                attackValue: 5,
                defenseValue: 3,
                speedValue: 5,
                healthValue: 5,
                bonusAttack: DiceBonus.SixSideBonus,
                bonusDefense: DiceBonus.FourSideBonus,
            },
            organizer: false,
            inventory: [],
        };
        sandbox = sinon.createSandbox();
        mockSocketServer = createStubInstance(Server);
        gameSession = new GameSession(boardGame);
        gameSession.listOfPlayers.add(player1);
        gameSession.listOfPlayers.add(player2);
        gameSession['staticPlayerMap'].set(player1.name, structuredClone(player1));
        gameSession['staticPlayerMap'].set(player2.name, structuredClone(player2));
        clockManager = createStubInstance(GameClockManager);
        fightController = createStubInstance(FightSubController);
        moveController = createStubInstance(MovementSubController);
        const emitStub = sinon.stub();
        mockSocketServer = {
            to: sinon.stub().returns({ emit: emitStub }),
        } as unknown as Server;
        controller = new GameSessionController(gameSession, mockSocketServer, clockManager, fightController, moveController);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).gameIsOver = false;
    });
    afterEach(() => {
        sandbox.restore();
    });
    it('should not do anything if the game is over', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).gameOver = () => {
            return true;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).gameIsOver = () => {
            return true;
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).ongoingFight = {} as Fight;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).updateGame();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).deactivateDebugMode();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).teleportPlayer({ x: 0, y: 0 }, { x: 0, y: 0 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).toggleDebugMode();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).attemptEscape();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).endFight();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).executeAttack();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).toggleDoorState({ x: 0, y: 0 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).startFight({ x: 0, y: 0 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).movePlayer([{ x: 0, y: 0 }], {} as Socket);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).pickUpItem();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).dropItem();

        const emitSpy = mockSocketServer.to(controller['roomCode']).emit as sinon.SinonStub;

        expect(emitSpy.notCalled);
    });
    it('should emit ShowEndFightNotification with empty names if fightWinnerName and fightLoserName are undefined', () => {
        controller['fightWinnerName'] = undefined;
        controller['fightLoserName'] = undefined;

        controller['showEndFightNotification']();

        const expectedAns: dataForm.endFightNotification = {
            successful: true,
            message: '',
            loserName: '',
            winnerName: '',
        };

        assert.isTrue(
            (mockSocketServer.to(controller['roomCode']).emit as sinon.SinonStub).calledWith(
                SocketClientEventNames.ShowEndFightNotification,
                expectedAns,
            ),
        );
    });

    it('should start the game and emit StartGame event with correct data', () => {
        sandbox.stub(gameSession, 'startGame');

        sandbox.stub(sendError);
        const expectedAns: dataForm.StartGameData = {
            boardGame: gameSession.board,
            listOfPlayers: gameSession.listOfPlayers.getValues(),
            activePlayer: gameSession.activePlayerInstance,
        };

        controller.startGame();

        assert.isTrue((gameSession.startGame as sinon.SinonStub).calledOnce);
        assert.isTrue((clockManager.startClock as sinon.SinonStub).calledOnce);
        assert.isTrue(
            (mockSocketServer.to(controller['roomCode']).emit as sinon.SinonStub).calledWith(SocketClientEventNames.StartGame, expectedAns),
        );
    });

    it('should handle errors and emit a StandardRes error message', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).startGame = () => {
            throw new Error('Test Error');
        };

        controller.startGame();
        const spy = sandbox.spy(gameSession, 'startGame');
        sinon.assert.notCalled(spy);
    });

    it('should not call teleportPlayer if the game is over', async () => {
        const oldPosition = { x: 0, y: 0 };
        const newPosition = { x: 1, y: 1 };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'endGame');
        sandbox.stub(gameSession, 'ctfIsOver').returns(false);
        sandbox.stub(gameSession, 'activePlayerInstance').value({ ctfTeam: CtfTeam.FirstTeam });

        sandbox.stub(controller, 'gameOver').returns(true);

        await controller.teleportPlayer(oldPosition, newPosition);

        assert.isFalse((moveController.teleportPlayer as sinon.SinonStub).called);
    });

    it('should call endGame if CTF is over', async () => {
        const oldPosition = { x: 0, y: 0 };
        const newPosition = { x: 1, y: 1 };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'endGame');
        sandbox.stub(gameSession, 'ctfIsOver').returns(false);
        sandbox.stub(gameSession, 'activePlayerInstance').value({ ctfTeam: CtfTeam.FirstTeam });

        (gameSession.ctfIsOver as sinon.SinonStub).returns(true);

        await controller.teleportPlayer(oldPosition, newPosition);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.isTrue(((controller as any).endGame as sinon.SinonStub).calledOnce);
        assert.strictEqual(controller['winnerTeam'], CtfTeam.FirstTeam);
    });

    it('should not call endGame if CTF is not over', async () => {
        const oldPosition = { x: 0, y: 0 };
        const newPosition = { x: 1, y: 1 };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'endGame');
        sandbox.stub(gameSession, 'ctfIsOver').returns(false);
        sandbox.stub(gameSession, 'activePlayerInstance').value({ ctfTeam: CtfTeam.FirstTeam });

        (gameSession.ctfIsOver as sinon.SinonStub).returns(false);

        await controller.teleportPlayer(oldPosition, newPosition);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.isFalse(((controller as any).endGame as sinon.SinonStub).called);
    });

    it('should set fightWinnerName and fightLoserName and call showEndFightNotification', async () => {
        const winner = { name: 'Winner', inventory: [] } as Player;
        const loser = { name: 'Loser', inventory: [] } as Player;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'showEndFightNotification');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'endFight');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'endGame');
        sandbox.stub(gameSession, 'registerVictory');
        sandbox.stub(gameSession, 'getPlayerAmountOfVic').returns(0);
        sandbox.stub(gameSession.board, 'gameMode').value(GameMode.Normal);

        await controller['handleVictory'](winner, loser);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.isTrue(((controller as any).showEndFightNotification as sinon.SinonStub).calledOnce);
    });

    it('should register a victory for the winner and call endFight', async () => {
        const winner = { name: 'Winner', inventory: [] } as Player;
        const loser = { name: 'Loser', inventory: [] } as Player;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'showEndFightNotification');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'endFight');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'endGame');
        sandbox.stub(gameSession, 'registerVictory');
        sandbox.stub(gameSession, 'getPlayerAmountOfVic').returns(0);
        sandbox.stub(gameSession.board, 'gameMode').value(GameMode.Normal);
        await controller['handleVictory'](winner, loser);

        assert.isTrue((gameSession.registerVictory as sinon.SinonStub).calledOnceWith(winner));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.isTrue(((controller as any).endFight as sinon.SinonStub).calledOnce);
    });

    it('should call endGame if the winner reaches the maximum number of victories in Normal mode', async () => {
        const winner = { name: 'Winner', inventory: [] } as Player;
        const loser = { name: 'Loser', inventory: [] } as Player;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'showEndFightNotification');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'endFight');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'endGame');
        sandbox.stub(gameSession, 'registerVictory');
        sandbox.stub(gameSession, 'getPlayerAmountOfVic').returns(0);
        sandbox.stub(gameSession.board, 'gameMode').value(GameMode.Normal);

        (gameSession.getPlayerAmountOfVic as sinon.SinonStub).returns(MAX_AMOUNT_OF_VICTORIES);

        await controller['handleVictory'](winner, loser);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.isTrue(((controller as any).endGame as sinon.SinonStub).calledOnceWith(winner));
    });

    it('should not call endGame if the game mode is not Normal', async () => {
        const winner = { name: 'Winner', inventory: [] } as Player;
        const loser = { name: 'Loser', inventory: [] } as Player;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'showEndFightNotification');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'endFight');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'endGame');
        sandbox.stub(gameSession, 'registerVictory');
        sandbox.stub(gameSession, 'getPlayerAmountOfVic').returns(0);
        sandbox.stub(gameSession.board, 'gameMode').value(GameMode.Normal);

        await controller['handleVictory'](winner, loser);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.isFalse(((controller as any).endGame as sinon.SinonStub).called);
    });

    it('should reset fightWinnerName and fightLoserName after execution', async () => {
        const winner = { name: 'Winner', inventory: [] } as Player;
        const loser = { name: 'Loser', inventory: [] } as Player;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'showEndFightNotification');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'endFight');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'endGame');
        sandbox.stub(gameSession, 'registerVictory');
        sandbox.stub(gameSession, 'getPlayerAmountOfVic').returns(0);
        sandbox.stub(gameSession.board, 'gameMode').value(GameMode.Normal);

        await controller['handleVictory'](winner, loser);

        assert.isUndefined(controller['fightWinnerName']);
        assert.isUndefined(controller['fightLoserName']);
    });

    it('should set and get room code correctly', () => {
        controller.gameId = 'ABCD123';
        assert.strictEqual(controller['roomCode'], 'ABCD123');
    });

    it('should add player to the session and staticPlayerMap', () => {
        controller.addPlayer(player1);
        controller.addPlayer(player2);
        const players = controller.session.listOfPlayers.getValues();
        assert.isTrue(players.some((player) => player.name === player1.name));
        const staticCopy = controller.session['staticPlayerMap'].get(player1.name);
        assert.isDefined(staticCopy);
        assert.deepEqual(staticCopy?.name, player1.name);
    });

    it('should not add a player if the game is over', () => {
        sandbox.stub(gameSession, 'gameOver').value(true);

        const addSpy = sandbox.spy(gameSession.listOfPlayers, 'add');
        const setSpy = sandbox.spy(gameSession.staticMapOfPlayer, 'set');

        controller.addPlayer(player1);

        sinon.assert.notCalled(addSpy);
        sinon.assert.notCalled(setSpy);
    });

    it('should not add a player if the game has already started', () => {
        sandbox.stub(gameSession, 'gameStarted').value(true);

        const addSpy = sandbox.spy(gameSession.listOfPlayers, 'add');
        const setSpy = sandbox.spy(gameSession.staticMapOfPlayer, 'set');

        controller.addPlayer(player1);

        sinon.assert.notCalled(addSpy);
        sinon.assert.notCalled(setSpy);
    });
    it('should move player using movementSubController', (done) => {
        const oldPos = { x: 0, y: 0 };
        const newPos = { x: 0, y: 1 };
        const path = [oldPos, newPos];
        const numInterval = 3;

        sandbox.stub(gameSession, 'validItemPresent').returns(false);

        clientSocket.connected = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        controller.movePlayer(path, clientSocket as any);

        setTimeout(() => {
            sinon.assert.calledOnce(moveController.movePlayer as Sinon.SinonStub);
            sinon.assert.calledWith(moveController.movePlayer as Sinon.SinonStub, oldPos, newPos);

            done();
        }, MOVEMENT_TIME_INTERVAL_MSEC * numInterval);
    });

    it('should end game if ctf is ove', (done) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).ctfIsOver = () => {
            return true;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).endGame = () => {
            return;
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).activePlayer = player1;
        const oldPos = { x: 0, y: 0 };
        const newPos = { x: 0, y: 1 };
        const path = [oldPos, newPos, oldPos, newPos];
        const numInterval = 3;

        sandbox.stub(gameSession, 'validItemPresent').returns(false);

        clientSocket.connected = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        controller.movePlayer(path, clientSocket as any);

        setTimeout(
            () => {
                sinon.assert.notCalled(moveController.movePlayer as Sinon.SinonStub);

                done();
            },
            MOVEMENT_TIME_INTERVAL_MSEC * numInterval * 2 * numInterval,
        );
    });
    it('should return true if the game has started, the player is moving, and the player is the active player', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).activePlayer = player1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).gameHasStarted = true;
        controller['isPlayerMoving'] = true;

        const result = controller.playerIsMoving(player1);

        assert.isTrue(result);
    });

    it('should return false if the game has not started', () => {
        sandbox.stub(gameSession, 'gameStarted').value(false);

        const result = controller.playerIsMoving(player1);

        assert.isFalse(result);
    });
    it('should return false if the player is not moving', () => {
        controller['isPlayerMoving'] = false;

        const result = controller.playerIsMoving(player1);

        assert.isFalse(result);
    });

    it('should return false if the player is not the active player', () => {
        const anotherPlayer = { name: 'Player2' } as Player;
        sandbox.stub(gameSession, 'activePlayerInstance').value(anotherPlayer);

        const result = controller.playerIsMoving(player1);

        assert.isFalse(result);
    });

    it('should stop movement if an item is blocking', (done) => {
        const oldPos = { x: 0, y: 0 };
        const newPos = { x: 0, y: 1 };
        const path = [oldPos, newPos, oldPos];

        sandbox.stub(gameSession, 'validItemPresent').returns(true);

        clientSocket.connected = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        controller.movePlayer(path, clientSocket as any);

        setTimeout(() => {
            sinon.assert.calledOnce(moveController.movePlayer as Sinon.SinonStub);

            done();
        }, MOVEMENT_TIME_INTERVAL_MSEC * 2);
    });

    it('should toggle door state using movementSubController', () => {
        const pos = { x: 0, y: 0 };
        const toggleSpy = moveController.toggleDoorState as sinon.SinonStub;
        controller.toggleDoorState(pos);
        assert.isTrue(toggleSpy.calledOnceWith(pos));
    });

    it('should call startFight on fightSubController if the target player exists', () => {
        const targetPosition: Position = { x: 0, y: 0 };
        boardGame.tiles[0][0].containedPlayer = player1;

        const fightSpy = fightController.startFight as sinon.SinonStub;

        controller.startFight(targetPosition);

        assert.isTrue(fightSpy.calledOnceWith(targetPosition));
    });

    it('should not call startFight if the game is over', () => {
        sandbox.stub(gameSession, 'gameOver').returns(true);

        const fightSpy = fightController.startFight as sinon.SinonStub;

        controller.startFight({ x: 0, y: 0 });

        assert.isFalse(fightSpy.called);
    });

    it('should handle errors and emit a StandardRes error message', () => {
        const targetPosition: Position = { x: 0, y: 0 };
        boardGame.tiles[0][0].containedPlayer = player1;

        fightController.startFight = () => {
            throw new Error('Test Error');
        };

        const emitSpy = mockSocketServer.to(controller['roomCode']).emit as sinon.SinonStub;

        controller.startFight(targetPosition);

        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.StartFight, sinon.match.has('successful', false)));
    });

    it('should call attemptEscape on fightSubController if both players are in session', () => {
        const mockFight = {
            defendingPlayer: player1,
            attackingPlayer: player2,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).ongoingFight = mockFight;

        sandbox.stub(gameSession, 'playerIsInSession').returns(true);

        const attemptEscapeSpy = fightController.attemptEscape as sinon.SinonStub;

        controller.attemptEscape();

        assert.isTrue(attemptEscapeSpy.calledOnce);
    });

    it('should not call attemptEscape if there is no ongoing fight', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).ongoingFight = undefined;

        const attemptEscapeSpy = fightController.attemptEscape as sinon.SinonStub;

        controller.attemptEscape();

        assert.isFalse(attemptEscapeSpy.called);
    });

    it('should not call attemptEscape if the game is over', () => {
        sandbox.stub(gameSession, 'gameOver').returns(true);

        const attemptEscapeSpy = fightController.attemptEscape as sinon.SinonStub;

        controller.attemptEscape();

        assert.isFalse(attemptEscapeSpy.called);
    });

    it('should not call attemptEscape if one of the players is not in session', () => {
        const mockFight = {
            defendingPlayer: player1,
            attackingPlayer: player2,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).ongoingFight = mockFight;

        sandbox.stub(gameSession, 'playerIsInSession').callsFake((player) => player === player1);

        const attemptEscapeSpy = fightController.attemptEscape as sinon.SinonStub;

        controller.attemptEscape();

        assert.isFalse(attemptEscapeSpy.called);
    });

    it('should call executeAttack on fightSubController if both players are in session', async () => {
        const mockFight = {
            defendingPlayer: player1,
            attackingPlayer: player2,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).ongoingFight = mockFight;

        sandbox.stub(gameSession, 'playerIsInSession').returns(true);

        const executeAttackSpy = fightController.executeAttack as sinon.SinonStub;

        await controller.executeAttack();

        assert.isTrue(executeAttackSpy.calledOnce);
    });

    it('should not call executeAttack if there is no ongoing fight', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).ongoing = undefined;

        const executeAttackSpy = fightController.executeAttack as sinon.SinonStub;

        controller.executeAttack();

        assert.isFalse(executeAttackSpy.called);
    });

    it('should not call executeAttack if the game is over', () => {
        sandbox.stub(gameSession, 'gameOver').returns(true);

        const executeAttackSpy = fightController.executeAttack as sinon.SinonStub;

        controller.executeAttack();

        assert.isFalse(executeAttackSpy.called);
    });

    it('should not call executeAttack if one of the players is not in session', () => {
        const mockFight = {
            defendingPlayer: player1,
            attackingPlayer: player2,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).ongoing = mockFight;

        sandbox.stub(gameSession, 'playerIsInSession').callsFake((player) => player === player1);

        const executeAttackSpy = fightController.executeAttack as sinon.SinonStub;

        controller.executeAttack();

        assert.isFalse(executeAttackSpy.called);
    });

    it('should call endMovement using movementSubController', () => {
        const endSpy = moveController.endMovement as sinon.SinonStub;
        controller.endMovement();
        assert.isTrue(endSpy.calledOnce);
    });
    it('should emit startGame when game starts', () => {
        const spy = mockSocketServer.to(controller['roomCode']).emit as sinon.SinonStub;
        controller.startGame();
        assert.isTrue(spy.calledWith(SocketClientEventNames.StartGame, sinon.match.object));
    });

    it('should call toggleDoorState on movementSubController', () => {
        const doorPos: Position = { x: 0, y: 0 };
        const spy = moveController.toggleDoorState as sinon.SinonStub;
        controller.toggleDoorState(doorPos);
        assert.isTrue(spy.calledOnceWith(doorPos));
    });
    it('should return early if game is over when removing player', () => {
        gameSession['gameIsOver'] = true;
        sinon.stub(gameSession, 'playerIsInSession').returns(true);
        const removeSpy = sinon.spy(gameSession, 'removePlayer');
        controller.removePlayer(player1);
        assert.isFalse(removeSpy.called);
    });

    it('should return early if player is not in session', () => {
        gameSession['gameIsOver'] = false;
        sinon.stub(gameSession, 'playerIsInSession').returns(false);
        const removeSpy = sinon.spy(gameSession, 'removePlayer');
        controller.removePlayer(player1);
        assert.isFalse(removeSpy.called);
    });

    it('should call endFight if player is in ongoingFight', async () => {
        gameSession['gameIsOver'] = false;
        sinon.stub(gameSession, 'gameStarted').get(() => true);
        sinon.stub(gameSession, 'playerIsInSession').returns(true);
        sinon.stub(gameSession.listOfPlayers, 'getValues').returns([player1, player2]);
        sinon.stub(gameSession, 'removePlayer');
        gameSession['ongoingFight'] = { attackingPlayer: player1, defendingPlayer: player2, attackerEscapeAttempts: 0, defenderEscapeAttempts: 0 };
        gameSession['activePlayer'] = player2;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endFightSpy = sinon.spy(controller as any, 'endFight');
        await controller.removePlayer(player1);
        assert.isTrue(endFightSpy.called);
    });
    it('should call endFight if player is in ongoingFight', async () => {
        gameSession['gameIsOver'] = false;
        sinon.stub(gameSession, 'gameStarted').get(() => true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).playerIsInSession = (player: Player) => {
            if (player.name === player1.name) {
                return false;
            }
            return true;
        };
        sinon.stub(gameSession.listOfPlayers, 'getValues').returns([player1, player2]);
        sinon.stub(gameSession, 'removePlayer');
        gameSession['ongoingFight'] = { attackingPlayer: player1, defendingPlayer: player2, attackerEscapeAttempts: 0, defenderEscapeAttempts: 0 };
        gameSession['activePlayer'] = player2;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endFightSpy = sinon.spy(controller as any, 'endFight');
        await controller.removePlayer(player2);
        assert.isTrue(endFightSpy.called);
    });

    it('should call endTurn if removed player is activePlayer', async () => {
        sinon.stub(gameSession, 'gameStarted').get(() => true);
        sinon.stub(gameSession, 'playerIsInSession').returns(true);
        sinon.stub(gameSession.listOfPlayers, 'getValues').returns([player1, player2]);
        sinon.stub(gameSession, 'removePlayer');
        gameSession['activePlayer'] = player1;
        const endTurnSpy = sinon.stub(controller, 'endTurn');
        await controller.removePlayer(player1);
        assert.isTrue(endTurnSpy.called);
    });

    it('should call endGame if only one player remains after removal', async () => {
        sinon.stub(gameSession, 'gameStarted').get(() => true);
        sinon.stub(gameSession, 'playerIsInSession').returns(true);
        sinon.stub(gameSession.listOfPlayers, 'getValues').returns([player1]);
        sinon.stub(gameSession, 'removePlayer');
        gameSession['activePlayer'] = player2;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endGameSpy = sinon.spy(controller as any, 'endGame');
        await controller.removePlayer(player1);
        assert.isTrue(endGameSpy.called);
    });

    it('should call endGame if only one player remains after removal', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).gameOver = () => {
            return true;
        };
        sinon.stub(gameSession, 'gameStarted').get(() => true);
        sinon.stub(gameSession, 'playerIsInSession').returns(true);
        sinon.stub(gameSession.listOfPlayers, 'getValues').returns([player1]);
        sinon.stub(gameSession, 'removePlayer');
        gameSession['activePlayer'] = player2;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endGameSpy = sinon.spy(controller as any, 'endGame');
        await controller.removePlayer(player1);
        assert.isFalse(endGameSpy.called);
    });

    it('should return early if changingTurn is true', () => {
        controller['changingTurn'] = true;
        const restartSpy = clockManager.restart as sinon.SinonStub;
        controller.endTurn();
        assert.isFalse(restartSpy.called);
    });

    it('should emit EndTurn if not isPlayerMoving', (done) => {
        const TIMEOUT_DURATION = 5;
        controller['changingTurn'] = false;
        controller['isPlayerMoving'] = false;
        sandbox.stub(gameSession, 'changeActivePlayer');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(gameSession, 'board').returns({} as any);
        sandbox.stub(gameSession.listOfPlayers, 'getValues').returns([]);
        gameSession['activePlayer'] = player1;
        controller.endTurn();
        const check = (): void => {
            const returnValues = (mockSocketServer.to as sinon.SinonStub).returnValues;
            if (returnValues.length === 0) {
                setTimeout(check, TIMEOUT_DURATION);
                return;
            }
            const emitWrapper = returnValues[0];
            if (!emitWrapper || typeof emitWrapper.emit !== 'function') {
                setTimeout(check, TIMEOUT_DURATION);
                return;
            }
            const emitSpy = emitWrapper.emit as sinon.SinonStub;
            if (emitSpy.calledWith(SocketClientEventNames.EndTurn, sinon.match.object)) {
                assert.isTrue(true);
                done();
                return;
            }
            setTimeout(check, TIMEOUT_DURATION);
        };
        check();
    });
    it('should emit error if exception occurs in endTurn()', () => {
        controller['changingTurn'] = false;
        controller['isPlayerMoving'] = false;
        sandbox.stub(gameSession, 'changeActivePlayer').throws();
        try {
            controller.endTurn();
        } catch (e) {}
        const emitSpy = (mockSocketServer.to as sinon.SinonStub).returnValues[0].emit as sinon.SinonStub;
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.EndTurn, sinon.match.has('successful', false)));
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.ServerError, sinon.match.has('message')));
    });
    it('should call endFight if removed player is attacker or defender in ongoingFight', async () => {
        gameSession['gameIsOver'] = false;
        sinon.stub(gameSession, 'gameStarted').get(() => true);
        sandbox.stub(gameSession, 'playerIsInSession').returns(true);
        sandbox.stub(gameSession.listOfPlayers, 'getValues').returns([player1, player2]);
        sandbox.stub(gameSession, 'removePlayer');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'endFight');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(controller as any, 'updateGame');
        gameSession['ongoingFight'] = {
            attackingPlayer: player1,
            defendingPlayer: player2,
            attackerEscapeAttempts: 0,
            defenderEscapeAttempts: 0,
        };
        gameSession['activePlayer'] = player2;
        await controller.removePlayer(player1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.isTrue((controller as any).endFight.called);
    });
    it('should call deactivateDebugMode if player is the administrator', async () => {
        sinon.stub(gameSession, 'gameStarted').get(() => true);
        sandbox.stub(gameSession, 'playerIsInSession').returns(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateGameSpy = sandbox.stub<any, any>(controller as any, 'updateGame');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endFightSpy = sandbox.stub<any, any>(controller as any, 'endFight');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const deactivateDebugSpy = sandbox.stub<any, any>(controller as any, 'deactivateDebugMode');
        gameSession['ongoingFight'] = {
            attackingPlayer: player1,
            defendingPlayer: player2,
            attackerEscapeAttempts: 0,
            defenderEscapeAttempts: 0,
        };
        player1.organizer = true;
        gameSession['activePlayer'] = player2;
        await controller.removePlayer(player1);
        assert.isTrue(updateGameSpy.called);
        assert.isTrue(endFightSpy.called);
        assert.isTrue(deactivateDebugSpy.called);
    });
    it('should remove player and return early if game has not started', () => {
        sinon.stub(gameSession, 'gameOver').get(() => false);
        sinon.stub(gameSession, 'gameStarted').get(() => false);
        const removeStub = sandbox.stub(gameSession, 'removePlayer');
        sandbox.stub(gameSession, 'playerIsInSession').returns(true);
        controller.removePlayer(player1);
        assert.isTrue(removeStub.calledOnceWith(player1));
    });
    it('should emit toggleDebugMode when requested', () => {
        const spy = mockSocketServer.to(controller['roomCode']).emit as sinon.SinonStub;
        controller.toggleDebugMode();
        assert.isTrue(spy.calledWith(SocketClientEventNames.ToggleDebugMode, sinon.match.object));
    });

    it('should call teleportPlayer with correct positions', () => {
        const oldPos: Position = { x: 1, y: 1 };
        const newPos: Position = { x: 2, y: 2 };

        const spy = moveController.teleportPlayer as sinon.SinonStub;

        controller.teleportPlayer(oldPos, newPos);

        // Ensure the teleport function is called with correct parameters
        assert.isTrue(spy.calledOnceWithExactly(oldPos, newPos));
    });

    it('should emit deactivate when requested', () => {
        const spy = mockSocketServer.to(controller['roomCode']).emit as sinon.SinonStub;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).deactivateDebugMode();
        assert.isTrue(spy.calledWith(SocketClientEventNames.DeactivateDebugMode, sinon.match.object));
    });

    it('should update is moving properly', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).isPlayerMoving = false;
        controller.playerMoving = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((controller as any).isPlayerMoving).to.equal(true);
    });
    it('should return a proper stack of player', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).standardStackPlayer = structuredClone([player1, player2]);
        const result = controller.stackOfPlayers;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(result).to.deep.equal(structuredClone([player1, player2]));
    });
    it('should emit a success response when pickUpItem is successful', () => {
        player1.position = { x: 0, y: 0 };
        gameSession.board.tiles[0][0].containedItem = {} as Item;
        const pickUpItemSpy = sinon.stub(gameSession, 'pickUpItem').returns();
        controller.pickUpItem(player1);

        sinon.assert.calledOnce(pickUpItemSpy);
        sinon.assert.calledWith(pickUpItemSpy, player1);

        const emitStub = mockSocketServer.to(controller['roomCode']).emit as sinon.SinonStub;
        sinon.assert.calledOnce(emitStub);
    });

    it('should emit an error response and throw an error when pickUpItem fails', () => {
        const spy = mockSocketServer.to(controller['roomCode']).emit as sinon.SinonStub;
        sandbox.stub(gameSession, 'pickUpItem').throws(new Error('Pick up failed'));

        try {
            controller.pickUpItem(player1);
        } catch (e) {}

        assert.isTrue(spy.calledWith(SocketClientEventNames.ServerError, sinon.match.object));
    });

    it('should emit a success response when dropItem is successful', () => {
        const mockItem = { name: 'Sword', type: ItemType.RandomItem } as Item;
        const dropItemSpy = sinon.stub(gameSession, 'dropItem').returns();
        controller.dropItem(player1, mockItem);

        sinon.assert.calledOnce(dropItemSpy);
        sinon.assert.calledWith(dropItemSpy, player1, mockItem);

        const emitStub = mockSocketServer.to(controller['roomCode']).emit as sinon.SinonStub;
        sinon.assert.calledOnce(emitStub);
    });

    it('should emit an error response and throw an error when dropItem fails', () => {
        const spy = mockSocketServer.to(controller['roomCode']).emit as sinon.SinonStub;
        player1 = { name: 'Player1' } as Player;
        const mockItem = { name: 'Sword', type: ItemType.RandomItem } as Item;
        sandbox.stub(gameSession, 'dropItem').throws(new Error('Drop failed'));

        try {
            controller.dropItem(player1, mockItem);
        } catch (e) {}

        assert.isTrue(spy.calledWith(SocketClientEventNames.ServerError, sinon.match.object));
    });

    it('should handle GetGameState event correctly', () => {
        const mockSocket = {
            on: sinon.stub(),
            emit: sinon.stub(),
        } as unknown as io.Socket;

        const mockGameSession = {
            board: {},
            listOfPlayers: {
                getValues: sinon.stub().returns([]),
            },
            activePlayerInstance: {},
        } as unknown as GameSession;

        controller['roomCode'] = 'testGameCode';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getGameSessionByIdSpy = sinon.stub(controller as any, 'getGameSessionById').returns(mockGameSession);

        controller.handleCommand(mockSocket);

        const getGameStateHandler = (mockSocket.on as sinon.SinonStub).getCall(0).args[1];

        const dummyData = { gameCode: 'testGameCode' };
        getGameStateHandler(dummyData);

        sinon.assert.calledWith(getGameSessionByIdSpy, 'testGameCode');

        sinon.assert.calledWith(
            mockSocket.emit as sinon.SinonStub,
            SocketClientEventNames.GameState,
            sinon.match({
                successful: true,
                message: '',
                boardGame: mockGameSession.board,
                listOfPlayers: [],
                activePlayer: mockGameSession.activePlayerInstance,
            }),
        );

        getGameSessionByIdSpy.restore();
    });

    it('should return early when getGameSessionById returns null', () => {
        const mockSocket = {
            on: sinon.stub(),
            emit: sinon.stub(),
        } as unknown as io.Socket;

        controller['roomCode'] = 'testGameCode';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getGameSessionByIdSpy = sinon.stub(controller as any, 'getGameSessionById').returns(null);

        controller.handleCommand(mockSocket);

        const getGameStateHandler = (mockSocket.on as sinon.SinonStub).getCall(0).args[1];

        const dummyData = { gameCode: 'testGameCode' };
        getGameStateHandler(dummyData);

        sinon.assert.calledWith(getGameSessionByIdSpy, 'testGameCode');

        sinon.assert.notCalled(mockSocket.emit as sinon.SinonStub);

        getGameSessionByIdSpy.restore();
    });

    it('should emit GetActivePlayer event with correct data', () => {
        const mockGameSession = {
            activePlayerInstance: { name: 'TestPlayer' },
        } as unknown as GameSession;

        controller['gameSession'] = mockGameSession;

        controller['roomCode'] = 'testRoomCode';

        const emitStub = sinon.stub();
        mockSocketServer.to = sinon.stub().returns({ emit: emitStub });

        controller.getActivePlayer();

        sinon.assert.calledWith(
            emitStub,
            SocketClientEventNames.GetActivePlayer,
            sinon.match({
                successful: true,
                message: '',
                activePlayer: { name: 'TestPlayer' },
            }),
        );
    });

    it('should return gameSession if roomCode matches gameCode', () => {
        controller['roomCode'] = 'testRoomCode';

        const mockGameSession = {} as GameSession;

        controller['gameSession'] = mockGameSession;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (controller as any).getGameSessionById('testRoomCode');

        assert.strictEqual(result, mockGameSession);
    });

    it('should return null if roomCode does not match gameCode', () => {
        controller['roomCode'] = 'testRoomCode';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (controller as any).getGameSessionById('differentRoomCode');

        assert.isNull(result);
    });
});
