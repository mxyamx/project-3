export interface GlobalStatistics {
    startTime: number;
    endTime: number;
    gameDuration: string;
    numberTurns: number;
    tilePercentage: number;
    doorPercentage: number;
    flagsDetained?: number;
}

export interface PlayerStatistics {
    combatAmount: number;
    escapeAmount: number;
    victoryAmount: number;
    defeatAmount: number;
    lifePointsLost: number;
    lifePointsOpponentLost: number;
    itemsCollected: number;
    tilePercentage: number;
    totalGameDuration?: number;
    gamesPlayed?: number;
    gamesPlayedNormal?: number;
    gamesPlayedCTF?: number;
    victoriesNormal?: number;
    victoriesCTF?: number;
}
