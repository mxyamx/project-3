import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalStatisticsComponent } from './global-statistics.component';

describe('StatisticsComponent', () => {
    let component: GlobalStatisticsComponent;
    let fixture: ComponentFixture<GlobalStatisticsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GlobalStatisticsComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GlobalStatisticsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
