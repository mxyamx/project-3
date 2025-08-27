import { ComponentFixture, TestBed } from '@angular/core/testing';
import { STANDARD_PLAYERS } from '@app/constants/development-constants';
import { DiceService } from '@app/services/dice/dice.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { OpponentService } from '@app/services/opponent/opponent.service';
import { DiceBonus } from '@common/enums/dice-bonus';
import { Player } from '@common/player';
import { of } from 'rxjs';
import { PlayerComponent } from './player.component';

describe('PlayerComponent', () => {
    let component: PlayerComponent;
    let fixture: ComponentFixture<PlayerComponent>;
    let mockDiceService: jasmine.SpyObj<DiceService>;
    let mockGameSessionManager: jasmine.SpyObj<GameSessionManagerService>;
    let mockOpponentService: jasmine.SpyObj<OpponentService>;

    const mockPlayer: Player = STANDARD_PLAYERS[0];
    const mockOpponent: Player = STANDARD_PLAYERS[1];

    beforeEach(async () => {
        mockDiceService = jasmine.createSpyObj('DiceService', [], {
            diceValue$: of(1),
        });

        mockGameSessionManager = jasmine.createSpyObj('GameSessionManagerService', ['chosenPlayer', 'defendingPlayer']);
        mockGameSessionManager.chosenPlayer.and.returnValue(mockPlayer);

        mockOpponentService = jasmine.createSpyObj('OpponentService', ['getOpponent']);
        mockOpponentService.getOpponent.and.returnValue(mockOpponent);

        await TestBed.configureTestingModule({
            imports: [PlayerComponent],
            providers: [
                { provide: DiceService, useValue: mockDiceService },
                { provide: GameSessionManagerService, useValue: mockGameSessionManager },
                { provide: OpponentService, useValue: mockOpponentService },
            ],
        }).compileComponents();
    });

    it('should create', () => {
        fixture = TestBed.createComponent(PlayerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should call opponentService.getOpponent when isCurrentPlayer is false and player is not defined', () => {
        fixture = TestBed.createComponent(PlayerComponent);
        component = fixture.componentInstance;
        component.isCurrentPlayer = false;
        component.player = undefined;

        component.ngOnInit();

        expect(mockOpponentService.getOpponent).toHaveBeenCalled();
        expect(component.player).not.toBeUndefined();
    });

    it('should return false when player is undefined', () => {
        fixture = TestBed.createComponent(PlayerComponent);
        component = fixture.componentInstance;
        expect(component.isAggressive(undefined)).toBeFalse();
    });

    it('should return false when player has no attributes', () => {
        fixture = TestBed.createComponent(PlayerComponent);
        component = fixture.componentInstance;
        const playerWithoutAttributes = { name: 'Test' } as Player;
        expect(component.isAggressive(playerWithoutAttributes)).toBeFalse();
    });

    it('should return true when attack value is greater than defense value', () => {
        fixture = TestBed.createComponent(PlayerComponent);
        component = fixture.componentInstance;
        const aggressivePlayer: Player = {
            name: 'Aggressive',
            attributes: {
                attackValue: 5,
                defenseValue: 3,
                speedValue: 4,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
        } as Player;
        expect(component.isAggressive(aggressivePlayer)).toBeTrue();
    });

    it('should return false when attack value is less than or equal to defense value', () => {
        fixture = TestBed.createComponent(PlayerComponent);
        component = fixture.componentInstance;
        const defensivePlayer: Player = {
            name: 'Defensive',
            attributes: {
                attackValue: 3,
                defenseValue: 5,
                speedValue: 4,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
        } as Player;
        expect(component.isAggressive(defensivePlayer)).toBeFalse();
    });
});
