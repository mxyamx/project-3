import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, effect, inject } from '@angular/core';
import { MAX_ESCAPE_ATTEMPTS } from '@app/constants/development-constants';
import { DiceService } from '@app/services/dice/dice.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { OpponentService } from '@app/services/opponent/opponent.service';
import { DiceBonus } from '@common/enums/dice-bonus';
import { Player } from '@common/player';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-player',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './player.component.html',
    styleUrl: './player.component.scss',
})
export class PlayerComponent implements OnInit, OnDestroy {
    @Input() player: Player | undefined;
    @Input() isAttacking: boolean = false;
    @Input() diceValue: number = 0;
    @Input() remainingEscapeAttempts: number = MAX_ESCAPE_ATTEMPTS;
    @Input() isCurrentPlayer: boolean = true;
    playerMaxHealth: number = 0;
    diceBonus = DiceBonus;
    private subscriptions: Subscription[] = [];

    private diceService: DiceService = inject(DiceService);
    private gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    private opponentService: OpponentService = inject(OpponentService);

    constructor() {
        effect(() => {
            const updatedPlayer = this.isCurrentPlayer ? this.gameSessionManager.chosenPlayer() : this.gameSessionManager.defendingPlayer();

            if (this.player && updatedPlayer && this.player.name === updatedPlayer.name) {
                this.player = { ...updatedPlayer, attributes: { ...updatedPlayer.attributes } };
            }
        });
    }

    isAggressive(player: Player | undefined): boolean {
        if (!player?.attributes) return false;
        return player.attributes.attackValue > player.attributes.defenseValue;
    }

    ngOnInit() {
        if (!this.player) {
            this.player = this.isCurrentPlayer ? this.getCurrentPlayer() : this.opponentService.getOpponent();
        }

        if (this.player && this.player.attributes) {
            this.playerMaxHealth = this.player.attributes.healthValue;
        }

        this.subscriptions.push(
            this.diceService.diceValue$.subscribe((value) => {
                this.diceValue = value;
            }),
        );
    }

    ngOnDestroy() {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    private getCurrentPlayer(): Player | undefined {
        return this.gameSessionManager.chosenPlayer();
    }
}
