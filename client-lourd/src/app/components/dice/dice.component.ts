import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { DiceFace, DiceService } from '@app/services/dice/dice.service';
import { Observable } from 'rxjs';

const diceMapping = {
    one: [DiceFace.Four],
    two: [DiceFace.Three, DiceFace.Eight],
    three: [DiceFace.Three, DiceFace.Four, DiceFace.Eight],
    four: [DiceFace.Three, DiceFace.Five, DiceFace.Six, DiceFace.Eight],
    five: [DiceFace.Three, DiceFace.Five, DiceFace.Four, DiceFace.Six, DiceFace.Eight],
    six: [DiceFace.Three, DiceFace.Four, DiceFace.Five, DiceFace.Six, DiceFace.Seven, DiceFace.Eight],
} as const;

@Component({
    selector: 'app-dice',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './dice.component.html',
    styleUrls: ['./dice.component.scss'],
})
export class DiceComponent implements OnInit {
    @Input() isAttackDice: boolean = true;
    currentValue$: Observable<number>;
    isRolling = false;
    private readonly rollingDuration = 500;
    private diceService = inject(DiceService);

    ngOnInit() {
        if (this.isAttackDice) {
            this.currentValue$ = this.diceService.attackDiceValue$;
        } else {
            this.currentValue$ = this.diceService.defenseDiceValue$;
        }

        this.diceService.roll$.subscribe(() => {
            this.isRolling = true;
            setTimeout(() => {
                this.isRolling = false;
            }, this.rollingDuration);
        });
    }

    getDots(diceValue: number): readonly DiceFace[] | undefined {
        const mappingKeys = ['one', 'two', 'three', 'four', 'five', 'six'];
        const key = mappingKeys[diceValue - 1] as keyof typeof diceMapping;
        return diceMapping[key];
    }
}
