/* eslint-disable @typescript-eslint/no-magic-numbers */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SORTABLE_STATISTICS_COLUMNS, SORT_DIRECTION } from '@app/constants/objects-constants';
import { StatisticsManagerService } from '@app/services/statistics-manager/statistics-manager.service';
import { PlayerStatisticsComponent } from './player-statistics.component';

describe('PlayerStatisticsComponent', () => {
    let component: PlayerStatisticsComponent;
    let fixture: ComponentFixture<PlayerStatisticsComponent>;
    let statisticsManagerSpy: jasmine.SpyObj<StatisticsManagerService>;

    beforeEach(async () => {
        statisticsManagerSpy = jasmine.createSpyObj('StatisticsManagerService', [], {
            playerStatisticsMap: new Map([
                ['Player1', signal({ combatAmount: 5, victoryAmount: 3 })],
                ['Player2', signal({ combatAmount: 3, victoryAmount: 5 })],
            ]),
        });

        await TestBed.configureTestingModule({
            imports: [PlayerStatisticsComponent],
            providers: [{ provide: StatisticsManagerService, useValue: statisticsManagerSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerStatisticsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should sort by name in ascending order by default', () => {
        const players = component.getPlayersStats();
        expect(players[0].name).toBe('Player1');
        expect(players[1].name).toBe('Player2');
    });

    it('should sort by name in descending order when direction changed', () => {
        component.currentSort = { column: SORTABLE_STATISTICS_COLUMNS.name, direction: SORT_DIRECTION.desc };
        const players = component.getPlayersStats();
        expect(players[0].name).toBe('Player2');
        expect(players[1].name).toBe('Player1');
    });

    it('should sort by numeric value in ascending order', () => {
        component.currentSort = { column: 'combatAmount', direction: SORT_DIRECTION.asc };
        const players = component.getPlayersStats();
        expect(players[0].combatAmount).toBe(3);
        expect(players[1].combatAmount).toBe(5);
    });

    it('should sort by numeric fields in descending order', () => {
        component.currentSort = { column: 'victoryAmount', direction: SORT_DIRECTION.desc };
        const players = component.getPlayersStats();
        expect(players[0].victoryAmount).toBe(5);
        expect(players[1].victoryAmount).toBe(3);
    });

    it('should toggle direction when sorting on the same column', () => {
        const initialSort = { ...component.currentSort };

        component.sortBy(SORTABLE_STATISTICS_COLUMNS.name);
        expect(component.currentSort.column).toBe(initialSort.column);
        expect(component.currentSort.direction).not.toBe(initialSort.direction);

        component.sortBy(SORTABLE_STATISTICS_COLUMNS.name);
        expect(component.currentSort.column).toBe(initialSort.column);
        expect(component.currentSort.direction).toBe(initialSort.direction);
    });

    it('should change the column and reset to asc order when sorting on a new column', () => {
        component.currentSort = {
            column: SORTABLE_STATISTICS_COLUMNS.name,
            direction: SORT_DIRECTION.desc,
        };
        const combatColumn = 'combatAmount';
        component.sortBy(combatColumn);
        expect(component.currentSort.column).toBe(combatColumn);
        expect(component.currentSort.direction).toBe(SORT_DIRECTION.asc);
    });
});
