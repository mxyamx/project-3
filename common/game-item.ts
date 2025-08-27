import { GameItemAppliesTo } from './enums/game-item-applies-to';
import { GameItemEffectType } from './enums/game-item-effect-type';
import { Position } from './position';

export interface GameItem {
    id: string;
    name: string;
    description: string;
    effectType: GameItemEffectType;
    appliesTo: GameItemAppliesTo;
    isRandom?: boolean;
    position?: Position;
    isFlag: boolean;
}
