import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { BoardGame } from '@common/board-game';
import { CurrentGame } from '@common/current-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { PlayerLimits } from '@common/enums/players-limit';
import { CodeInputComponent } from './code-input-component';

describe('CodeInputComponent', () => {
    let component: CodeInputComponent;
    let fixture: ComponentFixture<CodeInputComponent>;
    let mockPlayerSocketService: jasmine.SpyObj<PlayerSocketService>;
    let mockCurrentGameManager: jasmine.SpyObj<CurrentGameManagerService>;

    beforeEach(async () => {
        mockPlayerSocketService = jasmine.createSpyObj('PlayerSocketService', ['emitGetGame', 'connect']);
        mockCurrentGameManager = jasmine.createSpyObj('CurrentGameManagerService', ['updateCurrentGame']);

        await TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule, CodeInputComponent],
            providers: [
                { provide: PlayerSocketService, useValue: mockPlayerSocketService },
                { provide: CurrentGameManagerService, useValue: mockCurrentGameManager },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CodeInputComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call connect on init', () => {
        expect(mockPlayerSocketService.connect).toHaveBeenCalled();
    });

    it('should update accessCode when codeArray changes', () => {
        spyOn(component.accessCode, 'emit');
        component.codeArray = ['1', '2', '3', '4'];
        component.updateCode();
        expect(component.accessCode.emit).toHaveBeenCalledWith('1234');
    });

    it('should determine when the code is complete', () => {
        component.codeArray = ['1', '2', '3', '4'];
        expect(component.isCodeComplete()).toBeTrue();
    });

    it('should detect when the code is incomplete', () => {
        component.codeArray = ['1', '2', '', '4'];
        expect(component.isCodeComplete()).toBeFalse();
    });

    it('should move to next input when a digit is entered', () => {
        spyOn(component.accessCode, 'emit');
        const nextInput = document.createElement('input');
        spyOn(nextInput, 'focus');

        component.codeArray = ['1', '', '', ''];
        component.moveToNext(nextInput, 0);

        expect(nextInput.focus).toHaveBeenCalled();
        expect(component.accessCode.emit).toHaveBeenCalledWith('1');
    });

    it('should move to previous input when current input is empty', () => {
        const prevInput = document.createElement('input');
        spyOn(prevInput, 'focus');

        component.codeArray = ['', '2', '', ''];
        component.moveToPrev(prevInput, 0);

        expect(prevInput.focus).toHaveBeenCalled();
    });

    it('should validate code and navigate if valid', () => {
        const boardGame: BoardGame = {
            id: 'bg1',
            name: 'Test Game',
            description: 'A test game',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: [],
            previewImage: '',
            visibility: true,
            lastModified: new Date(),
        };
        const game: CurrentGame = { id: '1234', locked: false, players: [], boardGame };
        mockPlayerSocketService.emitGetGame.and.callFake((code: string, callback: (response: CurrentGame) => void) => {
            callback(game);
        });
        spyOn(component.canEnterGame, 'emit');

        component.validateCode();

        expect(mockCurrentGameManager.updateCurrentGame).toHaveBeenCalledWith(game);
        expect(component.canEnterGame.emit).toHaveBeenCalledWith(true);
    });

    it('should set codeError if the game is not found', () => {
        mockPlayerSocketService.emitGetGame.and.callFake((code: string, callback: (response: CurrentGame) => void) => {
            callback(null as unknown as CurrentGame);
        });
        component.validateCode();
        expect(component.codeError).toBeTrue();
    });

    it('should set lockedError if the game is locked', () => {
        const boardGame: BoardGame = {
            id: 'bg1',
            name: 'Test Game',
            description: 'A test game',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: [],
            previewImage: '',
            visibility: true,
            lastModified: new Date(),
        };
        const game: CurrentGame = { id: '1234', locked: true, players: [], boardGame };
        mockPlayerSocketService.emitGetGame.and.callFake((code: string, callback: (response: CurrentGame) => void) => {
            callback(game);
        });

        component.validateCode();
        expect(component.lockedError).toBeTrue();
    });

    it('should set limitError if the game has too many players', () => {
        const boardGame: BoardGame = {
            id: 'bg1',
            name: 'Test Game',
            description: 'A test game',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: [],
            previewImage: '',
            visibility: true,
            lastModified: new Date(),
        };
        const game: CurrentGame = { id: '1234', locked: false, players: new Array(PlayerLimits[boardGame.size].maxPlayers), boardGame };
        mockPlayerSocketService.emitGetGame.and.callFake((code: string, callback: (response: CurrentGame) => void) => {
            callback(game);
        });

        component.validateCode();
        expect(component.limitError).toBeTrue();
    });

    it('should reset errors on retry', () => {
        component.codeError = true;
        component.limitError = true;
        component.lockedError = true;
        component.retry();
        expect(component.codeError).toBeFalse();
        expect(component.limitError).toBeFalse();
        expect(component.lockedError).toBeFalse();
    });
});
