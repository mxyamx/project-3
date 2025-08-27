import { ComponentFixture, TestBed } from '@angular/core/testing';

import { STANDARD_PLAYER } from '@app/constants/development-constants';
import { PlayerElementComponent } from './player-element.component';

describe('PlayerElementComponent', () => {
    let component: PlayerElementComponent;
    let fixture: ComponentFixture<PlayerElementComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PlayerElementComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerElementComponent);
        component = fixture.componentInstance;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any).player = STANDARD_PLAYER;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
