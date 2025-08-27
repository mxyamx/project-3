import { TestBed } from '@angular/core/testing';

import { DiceService } from './dice.service';
import { first } from 'rxjs';

describe('DiceService', () => {
    let service: DiceService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [DiceService],
        });
        service = TestBed.inject(DiceService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should have initial diceValue of 1', (done) => {
        service.diceValue$.pipe(first()).subscribe((value) => {
            expect(value).toBe(1);
            done();
        });
    });
});
