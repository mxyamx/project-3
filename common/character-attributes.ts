import { DiceBonus } from '@common/enums/dice-bonus';

export interface CharacterAttributes {
    attackValue: number;
    defenseValue: number;
    speedValue: number;
    healthValue: number;
    bonusAttack: DiceBonus;
    bonusDefense: DiceBonus;
    victories?: number;
}
