// server/app/services/prize-pool/prize-pool.service.ts
import { Player } from '@common/player';
import { Service } from 'typedi';

export interface PrizeDistribution {
    winners: Map<string, number>; // userId -> amount
    losers: Map<string, number>; // userId -> amount
}

@Service()
export class PrizePoolService {
    /**
     * Calculate prize distribution based on game results
     * @param entryPrice - Entry fee per player
     * @param initialPlayerCount - Number of players at game start
     * @param winners - Array of winning players
     * @param losers - Array of losing players (excluding those who abandoned)
     * @returns Prize distribution map
     */
    calculatePrizeDistribution(entryPrice: number, initialPlayerCount: number, winners: Player[], losers: Player[]): PrizeDistribution {
        const totalPrizePool = entryPrice * initialPlayerCount;
        const winnerPool = Math.round((totalPrizePool * 2) / 3);
        const consolationPool = totalPrizePool - winnerPool;

        const distribution: PrizeDistribution = {
            winners: new Map(),
            losers: new Map(),
        };

        // Distribute winner pool
        if (winners.length > 0) {
            const amountPerWinner = Math.floor(winnerPool / winners.length);
            winners.forEach((winner) => {
                if (!winner.virtualPlayer) {
                    distribution.winners.set(winner.userId, amountPerWinner);
                }
            });
        }

        // Distribute consolation pool
        if (losers.length > 0) {
            const amountPerLoser = Math.floor(consolationPool / losers.length);
            losers.forEach((loser) => {
                if (!loser.virtualPlayer) {
                    distribution.losers.set(loser.userId, amountPerLoser);
                }
            });
        }

        return distribution;
    }

    /**
     * Special case: Only one player remains (all others abandoned)
     * Winner gets 2/3, consolation pool is "lost"
     */
    calculateSoleWinnerPrize(entryPrice: number, initialPlayerCount: number): number {
        const totalPrizePool = entryPrice * initialPlayerCount;
        return Math.round((totalPrizePool * 2) / 3);
    }

    /**
     * Refund entry price (for leaving waiting room)
     */
    getRefundAmount(entryPrice: number): number {
        return entryPrice;
    }
}
