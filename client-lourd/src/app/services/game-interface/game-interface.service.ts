import { effect, inject, Injectable } from '@angular/core';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { Player } from '@common/player';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class GameInterfaceService {
    readonly isInterfaceVisible$: Observable<boolean>;
    readonly isEscapeConfirmationVisible$: Observable<boolean>;

    private readonly isInterfaceVisibleSubject: BehaviorSubject<boolean>;
    private readonly isEscapeConfirmationVisibleSubject: BehaviorSubject<boolean>;

    private currentPlayer: Player | undefined;
    private opponent: Player | undefined;
    private playerId: string | undefined;
    private opponentId: string | undefined;
    private initiatorTurn: boolean = true;
    private gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);

    constructor() {
        this.isInterfaceVisibleSubject = new BehaviorSubject<boolean>(false);
        this.isInterfaceVisible$ = this.isInterfaceVisibleSubject.asObservable();

        this.isEscapeConfirmationVisibleSubject = new BehaviorSubject<boolean>(false);
        this.isEscapeConfirmationVisible$ = this.isEscapeConfirmationVisibleSubject.asObservable();

        effect(() => {
            if (this.gameSessionManager.leavingGame$()) {
                this.hideInterface();
            }
        });
    }

    showInterface() {
        this.isInterfaceVisibleSubject.next(true);
    }

    hideInterface() {
        this.isInterfaceVisibleSubject.next(false);
        this.initiatorTurn = true;
        this.hideEscapeConfirmation();
    }

    showEscapeConfirmation() {
        this.isEscapeConfirmationVisibleSubject.next(true);
    }

    hideEscapeConfirmation() {
        this.isEscapeConfirmationVisibleSubject.next(false);
    }

    getCurrentPlayer(): Player | undefined {
        return this.currentPlayer;
    }

    getOpponent(): Player | undefined {
        return this.opponent;
    }

    setPlayerIds(playerId: string, opponentId: string): void {
        this.playerId = playerId;
        this.opponentId = opponentId;
        this.initiatorTurn = true;
    }

    getPlayerId(): string | undefined {
        return this.playerId;
    }

    getOpponentId(): string | undefined {
        return this.opponentId;
    }

    isPlayerInCombat(currentPlayerId: string): boolean {
        return this.playerId === currentPlayerId || this.opponentId === currentPlayerId;
    }

    setInitiatorTurn(isInitiatorTurn: boolean): void {
        this.initiatorTurn = isInitiatorTurn;
    }

    isInitiatorTurn(): boolean {
        return this.initiatorTurn;
    }
}
