import { BoardGameSize } from './board-game-size';

export const PlayerLimits = {
    [BoardGameSize.Small]: { minPlayers: 2, maxPlayers: 2 },
    [BoardGameSize.Medium]: { minPlayers: 2, maxPlayers: 4 },
    [BoardGameSize.Large]: { minPlayers: 2, maxPlayers: 6 },
};
