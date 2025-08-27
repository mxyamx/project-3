import { Component, inject } from '@angular/core';
import { CURRENT_SORT, SORTABLE_STATISTICS_COLUMNS, SORT_DIRECTION } from '@app/constants/objects-constants';
import { StatisticsManagerService } from '@app/services/statistics-manager/statistics-manager.service';

@Component({
    selector: 'app-player-statistics',
    imports: [],
    templateUrl: './player-statistics.component.html',
    styleUrl: './player-statistics.component.scss',
})
export class PlayerStatisticsComponent {
    statisticsManager: StatisticsManagerService = inject(StatisticsManagerService);

    sortColumns = SORTABLE_STATISTICS_COLUMNS;
    sortDirection = SORT_DIRECTION;
    currentSort = CURRENT_SORT;

    getPlayersStats() {
        const players = Array.from(this.statisticsManager.playerStatisticsMap.entries()).map(([name, statsSignal]) => ({
            name,
            ...statsSignal(),
        }));

        return players.sort((a, b) => {
            const columnValue = this.currentSort.column as keyof typeof a;
            const direction = this.currentSort.direction;

            if (columnValue === this.sortColumns.name) {
                return direction === this.sortDirection.asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            }

            const valueA = a[columnValue as keyof typeof a];
            const valueB = b[columnValue as keyof typeof b];

            return direction === this.sortDirection.asc ? Number(valueA) - Number(valueB) : Number(valueB) - Number(valueA);
        });
    }

    sortBy(column: string) {
        if (this.currentSort.column === column) {
            if (this.currentSort.direction === this.sortDirection.asc) {
                this.currentSort.direction = this.sortDirection.desc;
            } else {
                this.currentSort.direction = this.sortDirection.asc;
            }
        } else {
            this.currentSort.column = column;
            this.currentSort.direction = this.sortDirection.asc;
        }
    }
}
