import { GameEventType } from "./enums/game-event-type";

export interface GameEvent {
    message: string;
    timestamp: Date;
    type: GameEventType;
    player: string[];
}

