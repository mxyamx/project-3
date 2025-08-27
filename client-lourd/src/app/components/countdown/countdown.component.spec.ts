import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ATTACK_LARGE_TIME_LIMIT_SEC, ATTACK_SMALL_TIME_LIMIT_SEC, STANDARD_PLAYERS } from '@app/constants/development-constants';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { Player } from '@common/player';
import { CountdownComponent } from './countdown.component';

describe('CountdownComponent', () => {
    let component: CountdownComponent;
    let fixture: ComponentFixture<CountdownComponent>;
    let mockGameSessionManagerService: jasmine.SpyObj<GameSessionManagerService>;
    let mockPlayer: Player;

    beforeEach(async () => {
        mockPlayer = STANDARD_PLAYERS[0];
        mockGameSessionManagerService = jasmine.createSpyObj('GameSessionManagerService', ['changeDisplayAttackClock'], {
            turnClockValue: signal(0),
            fightClockValue: signal(0),
            nbOfEvasions: signal(2),
            chosenPlayer: signal(mockPlayer),
        });

        await TestBed.configureTestingModule({
            imports: [CountdownComponent],
            providers: [{ provide: GameSessionManagerService, useValue: mockGameSessionManagerService }],
        }).compileComponents();

        fixture = TestBed.createComponent(CountdownComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display turn time countdown when not in combat', () => {
        component.isInCombat = false;
        mockGameSessionManagerService.turnClockValue.set(ATTACK_LARGE_TIME_LIMIT_SEC);
        fixture.detectChanges();
        expect(component.countdown).toBe(ATTACK_LARGE_TIME_LIMIT_SEC);
    });

    it('should display combat time countdown when in combat', () => {
        component.isInCombat = true;
        mockGameSessionManagerService.fightClockValue.set(2);
        fixture.detectChanges();
        expect(component.countdown).toBe(2);
    });

    it('should display shorter combat time when no evasion attempts left', () => {
        component.isInCombat = true;
        mockGameSessionManagerService.nbOfEvasions.set(0);
        mockGameSessionManagerService.fightClockValue.set(1);
        fixture.detectChanges();
        expect(component.countdown).toBe(1);
    });

    it('should use display 0 when turnClockValue is 0', () => {
        component.isInCombat = false;
        mockGameSessionManagerService.turnClockValue.set(0);
        fixture.detectChanges();
        expect(component.countdown).toBe(0);
    });

    it('should return small attack time limit if changeDisplayAttackClock is true', () => {
        mockGameSessionManagerService.changeDisplayAttackClock.and.returnValue(true);
        fixture.detectChanges();
        expect(component.attackCLockMax()).toBe(ATTACK_SMALL_TIME_LIMIT_SEC);
    });

    it('should return large attack time limit if changeDisplayAttackClock is false', () => {
        mockGameSessionManagerService.changeDisplayAttackClock.and.returnValue(false);
        fixture.detectChanges();
        expect(component.attackCLockMax()).toBe(ATTACK_LARGE_TIME_LIMIT_SEC);
    });
});
