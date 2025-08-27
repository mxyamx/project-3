import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DEFAULT_ATTRIBUTES_POINT } from '@app/constants/objects-constants';
import { DiceBonus } from '@common/enums/dice-bonus';
import { of } from 'rxjs';
import { AttributeFormComponent } from './attribute-form.component';

describe('AttributeFormComponent', () => {
    let component: AttributeFormComponent;
    let fixture: ComponentFixture<AttributeFormComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AttributeFormComponent, RouterLink],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: { params: of({ id: '123' }) },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AttributeFormComponent);
        component = fixture.componentInstance;

        component.formGroup = new FormGroup({});
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should assign the opposite dice for defense when the user chooses the dice for attack', () => {
        component.assignDice('attack', DiceBonus.SixSideBonus);
        expect(component.attackDice).toBe(DiceBonus.SixSideBonus);
        expect(component.defenseDice).toBe(DiceBonus.FourSideBonus);

        component.assignDice('attack', DiceBonus.FourSideBonus);
        expect(component.attackDice).toBe(DiceBonus.FourSideBonus);
        expect(component.defenseDice).toBe(DiceBonus.SixSideBonus);
    });

    it('should assign the opposite dice for attack when the user chooses the dice for defense', () => {
        component.assignDice('defense', DiceBonus.FourSideBonus);
        expect(component.attackDice).toBe(DiceBonus.SixSideBonus);
        expect(component.defenseDice).toBe(DiceBonus.FourSideBonus);

        component.assignDice('defense', DiceBonus.SixSideBonus);
        expect(component.attackDice).toBe(DiceBonus.FourSideBonus);
        expect(component.defenseDice).toBe(DiceBonus.SixSideBonus);
    });

    it('should assign speed value to 4 points and life value to 6 points', () => {
        component.applyBonus('life');
        const bonus = DEFAULT_ATTRIBUTES_POINT + 2;
        expect(component.lifeValue).toEqual(bonus);
        expect(component.speedValue).toEqual(DEFAULT_ATTRIBUTES_POINT);
    });

    it('should assign speed value to 6 points and life value to 4 points', () => {
        component.applyBonus('speed');
        const bonus = DEFAULT_ATTRIBUTES_POINT + 2;
        expect(component.speedValue).toEqual(bonus);
        expect(component.lifeValue).toEqual(DEFAULT_ATTRIBUTES_POINT);
    });
});
