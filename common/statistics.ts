export interface GlobalStatistics {
    startTime: number,
    endTime: number,
    gameDuration: string,
    numberTurns: number,
    tilePercentage: number,
    doorPercentage: number,
    flagsDetained?: number,
}

export interface PlayerStatistics {
    combatAmount: number,
    escapeAmount: number,
    victoryAmount: number,
    defeatAmount: number,
    lifePointsLost: number,
    lifePointsOpponentLost: number,
    itemsCollected: number,
    tilePercentage: number,
}