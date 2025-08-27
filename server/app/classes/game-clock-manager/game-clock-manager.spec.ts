import { GameSession } from '@app/classes/game-session/game-session';
import { CLOCK_TICK_INTERVAL_MSEC, TRANSITION_TIME_INTERVAL_SEC } from '@app/constants/development-constants';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Fight } from '@common/fight';
import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import { GameClockManager } from './game-clock-manager';

describe('GameClockManager', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockSocketServer: any;
    let gameSessionStub: GameSession;
    let boardGameStub: BoardGame;
    let clockManager: GameClockManager;
    const ATTACK_TIME = 5;
    const TURN_CLOCK = 3;
    const TRANSITION_CLOCK = 1;
    beforeEach(() => {
        const cols = 10;
        const rows = 10;
        boardGameStub = {
            id: 'validBoard',
            name: 'Valid Board',
            description: 'A test board',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: Array(rows)
                .fill(null)
                .map(() =>
                    Array(cols)
                        .fill(null)
                        .map(() => ({ type: TileType.Grass })),
                ),
            previewImage: 'valid-image-url',
            visibility: true,
            itemInfos: [
                {
                    item: {
                        name: 'Entry Point',
                        type: ItemType.StartingPoint,
                        description: 'Starting point for the game',
                    },
                    available: 0,
                },
            ],
            lastModified: new Date(),
        } as unknown as BoardGame;

        gameSessionStub = new GameSession(boardGameStub);
        const emitStub = sinon.stub();
        const toStub = sinon.stub().returns({ emit: emitStub });
        mockSocketServer = {
            to: toStub,
        };
        clockManager = new GameClockManager(gameSessionStub, mockSocketServer, 'ROOM123');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (clockManager as any)._emitStub = emitStub;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (clockManager as any)._toStub = toStub;
    });

    afterEach(() => {
        sinon.restore();
        clockManager.stopClock();
    });

    it('should set attackClock correctly', () => {
        clockManager.setAttackClock(ATTACK_TIME);
        assert.equal(clockManager['attackClock'], ATTACK_TIME);
    });

    it('should set turnClock correctly', () => {
        clockManager.setTurnClock(TURN_CLOCK);
        assert.equal(clockManager['turnClock'], TURN_CLOCK);
    });

    it('should set transitionClock correctly', () => {
        clockManager.setTransitioningClock(TRANSITION_CLOCK);
        assert.equal(clockManager['transitionClock'], TRANSITION_CLOCK);
    });

    it('should set transitioning flag correctly', () => {
        clockManager.setTransitioning(true);
        assert.strictEqual(clockManager['transitioning'], true);

        clockManager.setTransitioning(false);
        assert.strictEqual(clockManager['transitioning'], false);
    });

    it('should restart clock (stop and start)', () => {
        const startSpy = sinon.spy(clockManager, 'startClock');
        const clearSpy = sinon.spy(global, 'clearInterval');

        clockManager.restart();

        sinon.assert.calledOnce(clearSpy);
        sinon.assert.calledOnce(startSpy);
    });
    it('should call clearInterval and startClock on restart', () => {
        const clearSpy = sinon.spy(global, 'clearInterval');
        const startSpy = sinon.spy(clockManager, 'startClock');

        clockManager.restart();

        sinon.assert.calledOnce(clearSpy);
        sinon.assert.calledOnce(startSpy);
    });

    it('should call clearInterval on stopClock', () => {
        const clearSpy = sinon.spy(global, 'clearInterval');
        clockManager.stopClock();
        sinon.assert.calledOnce(clearSpy);
    });
    it('should increment turnClock if not in fight or transitioning', (done) => {
        clockManager.startClock();
        setTimeout(
            () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                expect((clockManager as any).turnClock).to.equal(1);
                done();
            },
            CLOCK_TICK_INTERVAL_MSEC + CLOCK_TICK_INTERVAL_MSEC / 2,
        );
    });

    it('should increment attackClock if in fight mode', (done) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((clockManager as any).gameSession as any).ongoingFight = {} as Fight;
        clockManager.startClock();
        setTimeout(
            () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                expect((clockManager as any).attackClock).to.equal(1);
                done();
            },
            CLOCK_TICK_INTERVAL_MSEC + CLOCK_TICK_INTERVAL_MSEC / 2,
        );
    });

    it('should handle transitioning correctly', (done) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (clockManager as any).transitioning = true;
        clockManager.startClock();
        setTimeout(
            () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                expect((clockManager as any).transitioning).to.equal(false);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                expect((clockManager as any).transitionClock).to.equal(0);
                done();
            },
            TRANSITION_TIME_INTERVAL_SEC * CLOCK_TICK_INTERVAL_MSEC + CLOCK_TICK_INTERVAL_MSEC / 2,
        );
    });
});
