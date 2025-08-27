import { combatPositionNotification } from "./enums/combat-position-notification";
import { CombatType } from "./enums/combat-type";

export interface CombatNotification {
    id: string;
    message: string;
    icon: string;
    type: CombatType;
    isVisible: boolean;
    position?: combatPositionNotification;
}