import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CountdownComponent } from '@app/components/countdown/countdown.component';
import { DiceComponent } from '@app/components/dice/dice.component';
import { PlayerComponent } from '@app/components/player/player.component';
import { DiceService } from '@app/services/dice/dice.service';
import { GameInterfaceService } from '@app/services/game-interface/game-interface.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerState } from '@common/enums/player-state';
import { Player } from '@common/player';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-interface',
    standalone: true,
    imports: [CommonModule, PlayerComponent, DiceComponent, CountdownComponent, TranslatePipe],
    templateUrl: './game-interface.component.html',
    styleUrls: ['./game-interface.component.scss'],
})
export class GameInterfaceComponent implements OnInit, OnDestroy {
    isPlayerTurn: boolean = false;
    currentDiceValue: number = 0;
    currentPlayerEscapeAttempts = 0;
    opponentEscapeAttempts = 0;

    showAbandonConfirmation = false;
    showEscapeConfirmation = false;

    currentPlayer: Player;
    opponent: Player;
    attackingPlayer: Player;
    subscriptions: Subscription[] = [];
    private gameSessionManager = inject(GameSessionManagerService);
    private diceService = inject(DiceService);
    private gameInterfaceService = inject(GameInterfaceService);
    private changeDetectorRef: ChangeDetectorRef;

    constructor(changeDetectorRef: ChangeDetectorRef) {
        this.changeDetectorRef = changeDetectorRef;
        this.gameSessionManager.playerState();
    }

    get isPlayerTurnGetter(): boolean {
        return this.gameSessionManager.playerState() === PlayerState.Attacking;
    }

    ngOnInit() {
        this.subscriptions.push(
            this.diceService.diceValue$.subscribe((value) => {
                this.currentDiceValue = value;
            }),

            this.gameInterfaceService.isEscapeConfirmationVisible$.subscribe((visible) => {
                this.showEscapeConfirmation = visible;
                this.changeDetectorRef.detectChanges();
            }),
        );

        this.initPlayers();

        this.currentPlayerEscapeAttempts = this.gameSessionManager.nbOfEvasions();
        this.opponentEscapeAttempts = this.gameSessionManager.nbOfEvasions();

        this.attackingPlayer = this.gameSessionManager.attackingPlayer();

        this.attackingPlayer = this.gameSessionManager.attackingPlayer();
        this.currentPlayerEscapeAttempts = this.gameSessionManager.nbOfEvasions();
    }

    ngOnDestroy() {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    onAttack() {
        if (this.gameSessionManager.playerState() === PlayerState.Attacking) {
            this.gameSessionManager.attackPlayer();
            this.changeDetectorRef.detectChanges();
        }
    }

    onEscape() {
        if (this.gameSessionManager.playerState() !== PlayerState.Attacking) return;
        if (this.currentPlayerEscapeAttempts <= 0) return;

        this.gameInterfaceService.showEscapeConfirmation();
    }

    confirmEscape() {
        this.gameInterfaceService.hideEscapeConfirmation();

        this.currentPlayerEscapeAttempts--;

        this.gameSessionManager.decrementAmountOfEvasion();

        this.gameSessionManager.attemptEscape();

        this.changeDetectorRef.detectChanges();
    }

    cancelEscape() {
        this.gameInterfaceService.hideEscapeConfirmation();
    }

    getAttackButtonText(): string {
        return this.gameSessionManager.playerState() !== PlayerState.Attacking ? 'game-page.combat.opponent-attacking' : 'game-page.combat.attack';
    }

    isAttackButtonDisabled(): boolean {
        return this.gameSessionManager.playerState() !== PlayerState.Attacking;
    }

    isEscapeButtonDisabled(): boolean {
        return this.gameSessionManager.playerState() !== PlayerState.Attacking || this.currentPlayerEscapeAttempts <= 0;
    }

    private initPlayers() {
        const localPlayer = this.gameSessionManager.chosenPlayer();
        const attackingPlayer = this.gameSessionManager.attackingPlayer();
        const defendingPlayer = this.gameSessionManager.defendingPlayer();

        this.currentPlayer = localPlayer;

        if (localPlayer.name === attackingPlayer.name) {
            this.opponent = defendingPlayer;
        } else {
            this.opponent = attackingPlayer;
        }
    }
}
