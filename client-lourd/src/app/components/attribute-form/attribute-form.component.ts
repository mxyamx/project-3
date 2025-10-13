import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { DEFAULT_ATTRIBUTES_POINT } from '@app/constants/objects-constants';
import { AdminModule } from '@app/modules/admin/admin.module';
import { CharacterAttributes } from '@common/character-attributes';
import { DiceBonus } from '@common/enums/dice-bonus';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-attribute-form',
    imports: [AdminModule, TranslatePipe],
    templateUrl: './attribute-form.component.html',
    styleUrl: './attribute-form.component.scss',
})
export class AttributeFormComponent {
    @Input() formGroup!: FormGroup;

    attackValue: number = DEFAULT_ATTRIBUTES_POINT;
    defenseValue: number = DEFAULT_ATTRIBUTES_POINT;
    speedValue: number = DEFAULT_ATTRIBUTES_POINT;
    lifeValue: number = DEFAULT_ATTRIBUTES_POINT;

    diceBonus = DiceBonus;

    attackDice: DiceBonus.SixSideBonus | DiceBonus.FourSideBonus = DiceBonus.SixSideBonus;
    defenseDice: DiceBonus.SixSideBonus | DiceBonus.FourSideBonus = DiceBonus.FourSideBonus;

    assignDice(attribute: 'attack' | 'defense', dice: DiceBonus.SixSideBonus | DiceBonus.FourSideBonus) {
        if (attribute === 'attack') {
            this.attackDice = dice;
            this.defenseDice = dice === DiceBonus.SixSideBonus ? DiceBonus.FourSideBonus : DiceBonus.SixSideBonus;
        } else {
            this.defenseDice = dice;
            this.attackDice = dice === DiceBonus.SixSideBonus ? DiceBonus.FourSideBonus : DiceBonus.SixSideBonus;
        }
        this.updateFormGroup();
    }

    applyBonus(type: string) {
        this.formGroup.get('bonus')?.setValue(type);
        this.formGroup.get('bonus')?.markAsTouched();
        if (type === 'life') {
            this.lifeValue += 2;
            this.speedValue = DEFAULT_ATTRIBUTES_POINT;
        } else if (type === 'speed') {
            this.speedValue += 2;
            this.lifeValue = DEFAULT_ATTRIBUTES_POINT;
        }

        this.updateFormGroup();
    }

    private updateFormGroup() {
        const attributes: CharacterAttributes = {
            attackValue: this.attackValue,
            defenseValue: this.defenseValue,
            speedValue: this.speedValue,
            healthValue: this.lifeValue,
            bonusAttack: this.attackDice,
            bonusDefense: this.defenseDice,
        };

        this.formGroup.patchValue({ attributes });
    }
}
