import { Player } from './player';

export interface Fight {
    attackingPlayer: Player;
    defendingPlayer: Player;
    attackerEscapeAttempts: number;
    defenderEscapeAttempts: number;
}
