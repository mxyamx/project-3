import { Component, inject } from '@angular/core';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { StatisticsManagerService } from '@app/services/statistics-manager/statistics-manager.service';
import { GameMode } from '@common/enums/game-mode';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-statistics',
    standalone: true,
    imports: [TranslatePipe],
    templateUrl: './global-statistics.component.html',
    styleUrl: './global-statistics.component.scss',
})
export class GlobalStatisticsComponent {
    statisticsManager: StatisticsManagerService = inject(StatisticsManagerService);
    boardGameManager: BoardGameManagerService = inject(BoardGameManagerService);

    gameMode = GameMode;

    globalStats = this.statisticsManager.displayedGlobalStatistics();
    currentBoardGame = this.boardGameManager.playingBoardGame();
}
