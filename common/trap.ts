import { BoardGame } from './board-game';
import { Player } from './player';
import { Position } from './position';

export interface TrapEncounteredData {
    successful: boolean;
    message: string;
    trapPosition: Position;
    playerMovementPoints: number;
}

export interface HandleTrapChoice {
    avoid: boolean; // true = avoid (costs 3), false = attempt (costs 1)
}

export interface TrapResolvedData {
    successful: boolean;
    message: string;
    trapActivated: boolean;
    turnEnded: boolean;
    boardGame: BoardGame;
    listOfPlayers: Player[];
    activePlayer: Player;
}
