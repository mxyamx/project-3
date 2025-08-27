import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiceFace, DiceService } from '@app/services/dice/dice.service';
import { BehaviorSubject, Subject } from 'rxjs';
import { DiceComponent } from './dice.component';

const DICE_VALUE_ONE = 1;
const DICE_VALUE_TWO = 2;
const DICE_VALUE_THREE = 3;
const DICE_VALUE_FOUR = 4;
const DICE_VALUE_FIVE = 5;
const DICE_VALUE_SIX = 6;
const INVALID_DICE_VALUE = 7;
const EXPECTED_DOTS_FOR_THREE = 3;
const ADDITIONAL_TIMEOUT_DELAY = 50;

describe('DiceComponent', () => {
    let component: DiceComponent;
    let fixture: ComponentFixture<DiceComponent>;
    let diceServiceSpy: jasmine.SpyObj<DiceService>;
    let attackDiceValueSubject: BehaviorSubject<number>;
    let defenseDiceValueSubject: BehaviorSubject<number>;

    beforeEach(async () => {
        attackDiceValueSubject = new BehaviorSubject<number>(DICE_VALUE_ONE);
        defenseDiceValueSubject = new BehaviorSubject<number>(DICE_VALUE_ONE);

        diceServiceSpy = jasmine.createSpyObj('DiceService', [], {
            attackDiceValue$: attackDiceValueSubject.asObservable(),
            defenseDiceValue$: defenseDiceValueSubject.asObservable(),
            roll$: new Subject<void>().asObservable(),
        });

        await TestBed.configureTestingModule({
            imports: [DiceComponent],
            providers: [{ provide: DiceService, useValue: diceServiceSpy }],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(DiceComponent);
        component = fixture.componentInstance;
        component.ngOnInit();
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should get attackDiceValue$ from DiceService when isAttackDice is true', (done) => {
        component.isAttackDice = true;
        component.ngOnInit();

        const testValue = DICE_VALUE_THREE;
        attackDiceValueSubject.next(testValue);

        component.currentValue$.subscribe((value) => {
            expect(value).toBe(testValue);
            done();
        });
    });

    it('should get defenseDiceValue$ from DiceService when isAttackDice is false', (done) => {
        component.isAttackDice = false;
        component.ngOnInit();

        const testValue = DICE_VALUE_TWO;
        defenseDiceValueSubject.next(testValue);

        component.currentValue$.subscribe((value) => {
            expect(value).toBe(testValue);
            done();
        });
    });

    it('should return correct dots for dice value 1', () => {
        const dots = component.getDots(DICE_VALUE_ONE);
        expect(dots).toEqual([DiceFace.Four]);
    });

    it('should return correct dots for dice value 2', () => {
        const dots = component.getDots(DICE_VALUE_TWO);
        expect(dots).toEqual([DiceFace.Three, DiceFace.Eight]);
    });

    it('should return correct dots for dice value 3', () => {
        const dots = component.getDots(DICE_VALUE_THREE);
        expect(dots).toEqual([DiceFace.Three, DiceFace.Four, DiceFace.Eight]);
    });

    it('should return correct dots for dice value 4', () => {
        const dots = component.getDots(DICE_VALUE_FOUR);
        expect(dots).toEqual([DiceFace.Three, DiceFace.Five, DiceFace.Six, DiceFace.Eight]);
    });

    it('should return correct dots for dice value 5', () => {
        const dots = component.getDots(DICE_VALUE_FIVE);
        expect(dots).toEqual([DiceFace.Three, DiceFace.Five, DiceFace.Four, DiceFace.Six, DiceFace.Eight]);
    });

    it('should return correct dots for dice value 6', () => {
        const dots = component.getDots(DICE_VALUE_SIX);
        expect(dots).toEqual([DiceFace.Three, DiceFace.Four, DiceFace.Five, DiceFace.Six, DiceFace.Seven, DiceFace.Eight]);
    });

    it('should return undefined for invalid dice value', () => {
        const dots = component.getDots(INVALID_DICE_VALUE);
        expect(dots).toBeUndefined();
    });

    it('should render dots based on current dice value', () => {
        component.isAttackDice = true;
        component.ngOnInit();
        attackDiceValueSubject.next(DICE_VALUE_THREE);
        fixture.detectChanges();

        const dots = component.getDots(DICE_VALUE_THREE);
        expect(dots?.length).toBe(EXPECTED_DOTS_FOR_THREE);
    });

    it('should handle rolling state correctly', (done) => {
        const rollSubject = new Subject<void>();
        Object.defineProperty(diceServiceSpy, 'roll$', { value: rollSubject.asObservable() });
        component.ngOnInit();

        expect(component.isRolling).toBeFalse();

        rollSubject.next();
        expect(component.isRolling).toBeTrue();

        setTimeout(() => {
            expect(component.isRolling).toBeFalse();
            done();
        }, component['rollingDuration'] + ADDITIONAL_TIMEOUT_DELAY);
    });
});
