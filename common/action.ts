import { ActionType } from './enums/action-type';
import { Position } from './position';

export interface Action {
    type: ActionType;
    target: Position;
    description: string;
}
