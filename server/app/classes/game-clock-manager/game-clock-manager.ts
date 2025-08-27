import { GameSession } from '@app/classes/game-session/game-session';

import {
    CLOCK_TICK_INTERVAL_MSEC,
    MAX_FIGHT_CLOCK_SEC,
    MAX_TURN_CLOCK_SEC,
    TRANSITION_TIME_INTERVAL_SEC,
} from '@app/constants/development-constants';

import { SocketClientEventNames } from '@common/enums/socket-events-names';
import * as dataForm from '@common/socket-data-forms';
import * as io from 'socket.io';

export class GameClockManager {
    private turnClock: number;
    private attackClock: number;
    private clockEventInterval: NodeJS.Timeout;
    private transitioning: boolean;
    private transitionClock: number;

    constructor(
        private gameSession: GameSession,
        private sio: io.Server,
        private roomCode: string,
    ) {
        this.attackClock = 0;
        this.turnClock = 0;
        this.transitionClock = 0;
    }

    setTransitioning(transitioning: boolean): void {
        this.transitioning = transitioning;
    }

    setAttackClock(attackClock: number): void {
        this.attackClock = attackClock;
    }

    setTransitioningClock(transitionClock: number): void {
        this.transitionClock = transitionClock;
    }

    setTurnClock(turnClock: number): void {
        this.turnClock = turnClock;
    }

    startClock(): void {
        this.clockEventInterval = setInterval(() => {
            if (this.gameSession.fight) {
                this.attackClock = Math.min(MAX_FIGHT_CLOCK_SEC, ++this.attackClock);
            } else if (this.transitioning) {
                if (++this.transitionClock === TRANSITION_TIME_INTERVAL_SEC) {
                    this.transitioning = false;
                    this.transitionClock = 0;
                    this.startTurn();
                }
            } else {
                this.turnClock = Math.min(MAX_TURN_CLOCK_SEC, ++this.turnClock);
            }
            const ans: dataForm.ClockRes = {
                successful: true,
                message: 'clock',
                fightClockValue: this.attackClock,
                turnClockValue: this.turnClock,
            };
            this.sio.to(this.roomCode).emit(SocketClientEventNames.Clock, ans);
        }, CLOCK_TICK_INTERVAL_MSEC);
    }

    restart(): void {
        clearInterval(this.clockEventInterval);
        this.startClock();
    }

    stopClock(): void {
        clearInterval(this.clockEventInterval);
    }

    private startTurn(): void {
        const ans: dataForm.StartTurnRes = {
            successful: true,
            message: 'transition started',
        };

        this.sio.to(this.roomCode).emit(SocketClientEventNames.StartTurn, ans);
    }
}
