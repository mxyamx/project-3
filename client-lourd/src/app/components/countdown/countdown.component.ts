import { CommonModule } from '@angular/common';
import { Component, Input, Signal, computed, inject } from '@angular/core';
import { ATTACK_LARGE_TIME_LIMIT_SEC, ATTACK_SMALL_TIME_LIMIT_SEC } from '@app/constants/development-constants';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';

@Component({
    selector: 'app-countdown',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './countdown.component.html',
    styleUrl: './countdown.component.scss',
})
export class CountdownComponent {
    @Input() isInCombat: boolean = false;

    attackCLockMax: Signal<number> = computed(() => {
        if (this.gameSessionManager.changeDisplayAttackClock()) {
            return ATTACK_SMALL_TIME_LIMIT_SEC;
        }
        return ATTACK_LARGE_TIME_LIMIT_SEC;
    });

    private gameSessionManager = inject(GameSessionManagerService);

    get countdown(): number {
        if (this.isInCombat) {
            return this.gameSessionManager.fightClockValue();
        }

        return this.gameSessionManager.turnClockValue();
    }
}
