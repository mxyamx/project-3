/* eslint-disable no-empty */
import { GameClockManager } from '@app/classes/game-clock-manager/game-clock-manager';
import { GameSession } from '@app/classes/game-session/game-session';
import { WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC } from '@app/constants/development-constants';
import { FightSubController } from '@app/controllers/fight-sub-controller/fight-sub-controller';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { Player } from '@common/player';
import { assert } from 'chai';
import { createStubInstance } from 'sinon';
import { Server } from 'socket.io';
import { setTimeout as delay } from 'timers/promises';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sinon = require('sinon');

describe('FightSubController', () => {
    let controller: FightSubController;
    let mockClock: GameClockManager;
    let boardGame: BoardGame;
    let gameSession: GameSession;
    let mockServer: Server;
    let emitSpy: sinon.SinonSpy;
    let player1: Player;
    let player2: Player;

    beforeEach(() => {
        mockClock = createStubInstance(GameClockManager);
        emitSpy = sinon.spy();
        mockServer = {
            to: sinon.stub().returns({ emit: emitSpy }),
        } as unknown as Server;
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
            character: 'C1',
            attributes: {
                attackValue: 4,
                defenseValue: 4,
                speedValue: 4,
                healthValue: 4,
                bonusAttack: DiceBonus.SixSideBonus,
                bonusDefense: DiceBonus.FourSideBonus,
            },
            organizer: false,
            position: { x: 0, y: 0 },
            inventory: [],
        };

        player2 = {
            name: 'Player2',
            character: 'C2',
            attributes: {
                attackValue: 4,
                defenseValue: 4,
                speedValue: 4,
                healthValue: 4,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: false,
            position: { x: 0, y: 1 },
            inventory: [],
        };
        boardGame.tiles[0][1].containedPlayer = player2;
        gameSession = new GameSession(boardGame);
        gameSession.listOfPlayers.add(player1);
        gameSession.listOfPlayers.add(player2);
        gameSession['activePlayer'] = player1;
        gameSession['staticPlayerMap'].set(player1.name, structuredClone(player1));
        gameSession['staticPlayerMap'].set(player2.name, structuredClone(player2));

        controller = new FightSubController(mockClock, gameSession, 'room1', mockServer);
    });
    it('should start fight and emit StartFight with correct data', () => {
        controller.startFight({ x: 0, y: 1 });
        const emittedArgs = emitSpy.getCalls().find((call) => call.args[0] === SocketClientEventNames.StartFight)?.args[1];
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.StartFight, sinon.match.object));
        assert.strictEqual(emittedArgs?.successful, true);
        assert.strictEqual(emittedArgs?.message, 'success');
        assert.deepEqual(emittedArgs?.activePlayer, player1);
        assert.deepEqual(emittedArgs?.attackingPlayer, player1);
        assert.deepEqual(emittedArgs?.defendingPlayer.name, player2.name);
    });

    it('should execute attack and emit ProcessAttack then EndFight if defender dies', async () => {
        gameSession.startFight(player1, player2);
        player2.attributes.healthValue = 1;
        player2.inventory = [];
        player1.inventory = [];
        sinon.stub(gameSession, 'executeAttack').callsFake(() => {
            player2.attributes.healthValue = 0;
        });
        sinon.stub(gameSession, 'getPlayerAmountOfVic').returns(1);
        await controller.executeAttack();
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.ProcessAttack, sinon.match.object));
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.EndFight, sinon.match.object));
    });

    it('should not execute attack if defender is dead', async () => {
        gameSession.startFight(player1, player2);
        player2.attributes.healthValue = 0;
        sinon.stub(gameSession, 'executeAttack').callsFake(() => {
            player2.attributes.healthValue = 0;
        });
        sinon.stub(gameSession, 'getPlayerAmountOfVic').returns(1);
        await controller.executeAttack();

        assert.isFalse(emitSpy.calledWith(SocketClientEventNames.ProcessAttack, sinon.match.object));
        assert.isFalse(emitSpy.calledWith(SocketClientEventNames.EndFight, sinon.match.object));
    });

    it('should emit EndGame if attacker reaches 3 victories', async () => {
        const VICTORIES_AMOUNT = 3;
        gameSession.startFight(player1, player2);
        sinon.stub(gameSession, 'executeAttack').callsFake(() => {
            player2.attributes.healthValue = 0;
        });
        sinon.stub(gameSession, 'getPlayerAmountOfVic').returns(VICTORIES_AMOUNT);
        sinon.stub(gameSession, 'registerVictory');
        await controller.executeAttack();

        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.EndGame, sinon.match.object));
    });

    it('should switch turn if defender survives', async () => {
        gameSession.startFight(player1, player2);
        sinon.stub(gameSession, 'executeAttack');
        player2.attributes.healthValue = 5;
        await controller.executeAttack();

        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.SwitchTurn, sinon.match.object));
    });
    it('should handle errors and emit a StandardRes error message', () => {
        sinon.stub(gameSession, 'switchTurn').throws(new Error('Test Error'));

        controller['switchTurn']();

        assert.isTrue(
            emitSpy.calledWith(
                SocketClientEventNames.SwitchTurn,
                sinon.match({
                    successful: false,
                    message: sinon.match.string,
                }),
            ),
        );
    });

    it('should emit escape success and call endFight', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).ongoingFight = { attackingPlayer: player1 };
        sinon.stub(gameSession, 'attemptEscape').returns(true);
        try {
            controller.attemptEscape();
            const deuxMilleMs = 2000;
            await delay(deuxMilleMs);
        } catch (e) {}
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.ProcessEscapeAttempt, sinon.match.object));
    });

    it('should emit escape failure and switch turn', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).ongoingFight = { attackingPlayer: player1, defendingPlayer: player2 };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSession as any).findLargestAmountOfEscapeAttempts = () => {
            return;
        };
        sinon.stub(gameSession, 'attemptEscape').returns(false);

        try {
            controller.attemptEscape();
            const deuxMilleMs = 2000;
            await delay(deuxMilleMs);
        } catch (e) {}
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.SwitchTurn, sinon.match.object));
    });

    it('should emit EndFight with correct data', () => {
        gameSession.startFight(player1, player2);
        controller['fightWinnerName'] = player1.name;
        controller['fightLoserName'] = player2.name;
        controller.endFight();
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.EndFight, sinon.match.has('winnerName', player1.name)));
    });

    it('should handle error and emit ServerError if exception in startFight', () => {
        sinon.stub(gameSession, 'startFight').throws();
        try {
            controller.startFight({ x: 0, y: 0 });
        } catch (e) {}
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.ServerError, sinon.match.has('message')));
    });

    it('should handle error and emit ServerError if exception in executeAttack', () => {
        sinon.stub(gameSession, 'executeAttack').throws();
        gameSession.startFight(player1, player2);
        try {
            controller.executeAttack();
        } catch (e) {}
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.ServerError, sinon.match.has('message')));
    });

    it('should handle error and emit ServerError if exception in attemptEscape', () => {
        sinon.stub(gameSession, 'attemptEscape').throws();
        try {
            controller.attemptEscape();
        } catch (e) {}
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.ServerError, sinon.match.has('message')));
    });

    it('should handle error and emit ServerError if exception in endFight', () => {
        sinon.stub(gameSession, 'endFight').throws();
        try {
            controller.endFight();
        } catch (e) {}
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.ServerError, sinon.match.has('message')));
    });
    it('should emit EndFight with empty names if no winner or loser is set', () => {
        gameSession.startFight(player1, player2);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any)['fightLoserName'] = undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any)['fightWinnerName'] = undefined;
        controller.endFight();
        const call = emitSpy.getCalls().find((c) => c.args[0] === SocketClientEventNames.EndFight);
        const emittedArgs = call?.args[1];
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.EndFight, sinon.match.object));
        assert.strictEqual(emittedArgs?.loserName, '');
        assert.strictEqual(emittedArgs?.winnerName, '');
    });
    it('should emit ShowEndFightNotification with correct data', () => {
        controller['fightWinnerName'] = player1.name;
        controller['fightLoserName'] = player2.name;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).showEndFightNotification();

        const emitStub = mockServer.to('room1').emit as sinon.SinonStub;
        sinon.assert.calledOnce(emitStub);
        sinon.assert.calledWith(emitStub, SocketClientEventNames.ShowEndFightNotification, {
            successful: true,
            message: '',
            loserName: player2.name,
            winnerName: player1.name,
        });
    });

    it('should emit ShowEndFightNotification with empty names if no winner or loser is set', () => {
        controller['fightWinnerName'] = undefined;
        controller['fightLoserName'] = undefined;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (controller as any).showEndFightNotification();

        const emitStub = mockServer.to('room1').emit as sinon.SinonStub;
        sinon.assert.calledOnce(emitStub);
        sinon.assert.calledWith(emitStub, SocketClientEventNames.ShowEndFightNotification, {
            successful: true,
            message: '',
            loserName: '',
            winnerName: '',
        });
    });

    it('should emit escape success and call endFight when escape is successful', async () => {
        gameSession.startFight(player1, player2);
        sinon.stub(gameSession, 'attemptEscape').returns(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endFightSpy = sinon.spy(controller, 'endFight' as any);

        controller.attemptEscape();
        await delay(WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC);

        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.ProcessEscapeAttempt, sinon.match.object));
        assert.isTrue(endFightSpy.called);
    });

    it('should find largest escape attempts through attemptEscape where largest is second', () => {
        gameSession.startFight(player1, player2);
        gameSession['escapeMap'].set(player1.name, 2);
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        gameSession['escapeMap'].set(player2.name, 3);

        sinon.stub(gameSession, 'attemptEscape').returns(false);
        controller.attemptEscape();

        const escapeCall = emitSpy.getCalls().find((call) => call.args[0] === SocketClientEventNames.ProcessEscapeAttempt);
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        assert.strictEqual(escapeCall?.args[1].largestAmountOfEScapeAttempts, 3);
    });

    it('should find largest escape attempts through attemptEscape where largest is first', () => {
        gameSession.startFight(player1, player2);
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        gameSession['escapeMap'].set(player1.name, 3);
        gameSession['escapeMap'].set(player2.name, 2);

        sinon.stub(gameSession, 'attemptEscape').returns(false);
        controller.attemptEscape();

        const escapeCall = emitSpy.getCalls().find((call) => call.args[0] === SocketClientEventNames.ProcessEscapeAttempt);
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        assert.strictEqual(escapeCall?.args[1].largestAmountOfEScapeAttempts, 3);
    });

    it('should handle undefined fight in findLargestAmountOfEscapeAttempts', () => {
        gameSession['ongoingFight'] = undefined;

        const result = controller['findLargestAmountOfEscapeAttempts']();
        assert.isUndefined(result);
    });

    it('should handle undefined fight in changeDisplayAttackClock', () => {
        gameSession['ongoingFight'] = undefined;

        const result = controller['changeDisplayAttackClock']();
        assert.isFalse(result);
    });
});
