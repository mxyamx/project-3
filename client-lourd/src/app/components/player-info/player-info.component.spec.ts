import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { DiceBonus } from '@common/enums/dice-bonus';
import { Player } from '@common/player';
import { PlayerInfoComponent } from './player-info.component';

describe('PlayerInfoComponent', () => {
    let component: PlayerInfoComponent;
    let fixture: ComponentFixture<PlayerInfoComponent>;
    let gameSessionManagerService: jasmine.SpyObj<GameSessionManagerService>;
    let mockNbOfActions: WritableSignal<number>;

    const MOCK_SPEED_VALUE = 5;

    beforeEach(async () => {
        mockNbOfActions = signal(1);
        const mockPlayer: Player = {
            name: 'Test Player',
            character: 'bear',
            attributes: {
                attackValue: 2,
                defenseValue: 3,
                speedValue: MOCK_SPEED_VALUE,
                healthValue: 4,
                bonusAttack: DiceBonus.SixSideBonus,
                bonusDefense: DiceBonus.FourSideBonus,
            },
            organizer: false,
            color: 'blue',
            victories: 0,
        };
        const spy = jasmine.createSpyObj('GameSessionManagerService', ['chosenPlayer'], {
            nbOfActions: mockNbOfActions,
        });
        spy.chosenPlayer.and.returnValue(mockPlayer);

        await TestBed.configureTestingModule({
            imports: [PlayerInfoComponent],
            providers: [{ provide: GameSessionManagerService, useValue: spy }],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerInfoComponent);
        component = fixture.componentInstance;
        gameSessionManagerService = TestBed.inject(GameSessionManagerService) as jasmine.SpyObj<GameSessionManagerService>;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize currentPlayer and remainingMovements on ngOnInit with chosen player', () => {
        const mockPlayer: Player = {
            name: 'Test Player',
            character: 'bear',
            attributes: {
                attackValue: 2,
                defenseValue: 3,
                speedValue: MOCK_SPEED_VALUE,
                healthValue: 4,
                bonusAttack: DiceBonus.SixSideBonus,
                bonusDefense: DiceBonus.FourSideBonus,
            },
            organizer: false,
            color: 'blue',
            victories: 0,
        };
        gameSessionManagerService.chosenPlayer.and.returnValue(mockPlayer);

        component.ngOnInit();

        expect(component.currentPlayer).toEqual(mockPlayer);
        expect(component.remainingMovements).toBe(MOCK_SPEED_VALUE);
    });

    it('should return correct dice bonus label', () => {
        expect(component.getDiceBonusLabel(DiceBonus.FourSideBonus)).toBe('D4');
        expect(component.getDiceBonusLabel(DiceBonus.SixSideBonus)).toBe('D6');
    });
});
