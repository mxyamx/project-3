import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { STANDARD_PLAYERS } from '@app/constants/development-constants';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { DiceBonus } from '@common/enums/dice-bonus';
import { Player } from '@common/player';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-player-info',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './player-info.component.html',
    styleUrl: './player-info.component.scss',
})
export class PlayerInfoComponent implements OnInit {
    currentPlayer: Player = {
        ...STANDARD_PLAYERS[0],
    } as Player;

    protected attack = computed(() => {
        const chosenPlayer = this.gameSessionManager.chosenPlayer();
        return chosenPlayer.attributes?.attackValue;
    });

    protected defense = computed(() => {
        const chosenPlayer = this.gameSessionManager.chosenPlayer();
        return chosenPlayer.attributes?.defenseValue;
    });

    protected health = computed(() => {
        const chosenPlayer = this.gameSessionManager.chosenPlayer();
        return chosenPlayer.attributes?.healthValue;
    });

    private gameSessionManager = inject(GameSessionManagerService);
    private _remainingActions = computed(() => this.gameSessionManager.nbOfActions());
    private _remainingMovements = computed(() => {
        const chosenPlayer = this.gameSessionManager.chosenPlayer();
        return chosenPlayer.attributes.speedValue;
    });

    get remainingActions(): number {
        return this._remainingActions();
    }

    get remainingMovements(): number {
        return this._remainingMovements();
    }

    ngOnInit() {
        const chosenPlayer = this.gameSessionManager.chosenPlayer();
        if (chosenPlayer) {
            this.currentPlayer = chosenPlayer;
        }
    }

    getDiceBonusLabel(bonus: DiceBonus): string {
        return bonus === DiceBonus.FourSideBonus ? 'D4' : 'D6';
    }
}
