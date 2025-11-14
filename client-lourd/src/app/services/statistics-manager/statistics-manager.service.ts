import { Injectable, signal, WritableSignal } from '@angular/core';
import { GlobalStatistics, PlayerStatistics } from '@common/statistics';

@Injectable({
    providedIn: 'root',
})
export class StatisticsManagerService {
    displayedGlobalStatistics: WritableSignal<GlobalStatistics> = signal({
        startTime: 0,
        endTime: 0,
        gameDuration: '00:00',
        numberTurns: 0,
        tilePercentage: 0,
        doorPercentage: 0,
        flagsDetained: 0,
    });

    playerStatisticsMap = new Map<string, WritableSignal<PlayerStatistics>>();

    reset(): void {
        this.displayedGlobalStatistics.set({
            startTime: 0,
            endTime: 0,
            gameDuration: '00:00',
            numberTurns: 0,
            tilePercentage: 0,
            doorPercentage: 0,
            flagsDetained: 0,
        });
        this.playerStatisticsMap.clear();
    }
}
