import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

export enum DiceFace {
    Three = 3,
    Four = 4,
    Five = 5,
    Six = 6,
    Seven = 7,
    Eight = 8,
}

export enum DiceType {
    SixFaces = 6,
    FourFaces = 4,
}

@Injectable({
    providedIn: 'root',
})
export class DiceService {
    readonly rollSubject = new Subject<void>();
    readonly roll$ = this.rollSubject.asObservable();
    readonly attackDiceValue$: Observable<number>;
    readonly defenseDiceValue$: Observable<number>;
    readonly diceValue$: Observable<number>;
    private readonly attackDiceValueSubject: BehaviorSubject<number>;
    private readonly defenseDiceValueSubject: BehaviorSubject<number>;
    private readonly diceValueSubject: BehaviorSubject<number>;

    constructor() {
        this.attackDiceValueSubject = new BehaviorSubject<number>(1);
        this.attackDiceValue$ = this.attackDiceValueSubject.asObservable();

        this.defenseDiceValueSubject = new BehaviorSubject<number>(1);
        this.defenseDiceValue$ = this.defenseDiceValueSubject.asObservable();

        this.diceValueSubject = new BehaviorSubject<number>(1);
        this.diceValue$ = this.diceValueSubject.asObservable();
    }

    setAttackDiceValue(value: number): void {
        this.attackDiceValueSubject.next(value);
        this.rollSubject.next();
    }

    setDefenseDiceValue(value: number): void {
        this.defenseDiceValueSubject.next(value);
        this.rollSubject.next();
    }
}
