import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { HttpBoardGameService } from '@app/services/http-manager/http-board-game.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { BoardGame } from '@common/board-game';
import { CurrentGame } from '@common/current-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { of, throwError } from 'rxjs';
import { CreationPageComponent } from './creation-page.component';

const mockBoardGame1: BoardGame = {
    id: 'bg1',
    name: 'Test Game 1',
    description: 'A test game',
    size: BoardGameSize.Small,
    gameMode: GameMode.Normal,
    tiles: [[]],
    previewImage: 'asset1',
    visibility: true,
    lastModified: new Date(),
};

const mockBoardGame2: BoardGame = {
    id: 'bg2',
    name: 'Test Game 2',
    description: 'Another test game',
    size: BoardGameSize.Large,
    gameMode: GameMode.Normal,
    tiles: [[]],
    previewImage: 'asset2',
    visibility: true,
    lastModified: new Date(),
    itemInfos: [],
};

const mockCurrentGame: CurrentGame = {
    id: '1234',
    locked: false,
    players: [],
    boardGame: mockBoardGame1,
};

describe('CreationPageComponent', () => {
    let component: CreationPageComponent;
    let fixture: ComponentFixture<CreationPageComponent>;
    let mockCurrentGameManager: jasmine.SpyObj<CurrentGameManagerService>;
    let mockGameSessionManager: jasmine.SpyObj<GameSessionManagerService>;
    let mockHttpBoardGameService: jasmine.SpyObj<HttpBoardGameService>;
    let mockPlayerSocketService: jasmine.SpyObj<PlayerSocketService>;

    beforeEach(async () => {
        mockCurrentGameManager = jasmine.createSpyObj('CurrentGameManagerService', [
            'reset',
            'updatePickedBoardGame',
            'displayedCurrentGame',
            'updateCurrentGame',
        ]);
        mockGameSessionManager = jasmine.createSpyObj('GameSessionManagerService', ['dummyMethod']);
        mockHttpBoardGameService = jasmine.createSpyObj('HttpBoardGameService', ['getAllBoards', 'getBoard']);
        mockPlayerSocketService = jasmine.createSpyObj('PlayerSocketService', ['connect', 'emitCreateGame', 'emitJoinAvatarRoom']);
        mockHttpBoardGameService.getAllBoards.and.returnValue(of([]));

        await TestBed.configureTestingModule({
            imports: [CreationPageComponent],
            providers: [
                { provide: CurrentGameManagerService, useValue: mockCurrentGameManager },
                { provide: GameSessionManagerService, useValue: mockGameSessionManager },
                { provide: HttpBoardGameService, useValue: mockHttpBoardGameService },
                { provide: PlayerSocketService, useValue: mockPlayerSocketService },
                provideRouter([]),
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(CreationPageComponent);
        component = fixture.componentInstance;
        // mockRouter = TestBed.inject(Router);
        spyOn(component['router'], 'navigate').and.returnValue(Promise.resolve(true));
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load games on init', fakeAsync(() => {
        mockHttpBoardGameService.getAllBoards.and.returnValue(of([mockBoardGame1, mockBoardGame2]));

        component.ngOnInit();
        tick();

        expect(mockHttpBoardGameService.getAllBoards).toHaveBeenCalled();
        expect(component.gamesList).toEqual([mockBoardGame1, mockBoardGame2]);
        expect(component.displayedObject).toEqual(mockBoardGame1);
    }));

    it('should set displayed object', () => {
        component.gamesList = [mockBoardGame1, mockBoardGame2];
        component.setDisplayedObject(mockBoardGame2);

        expect(component.displayedObject).toEqual(mockBoardGame2);
    });

    it('should hide alerts', () => {
        component.showAlertConfirmation = true;
        component.showVisibilityAlert = true;

        component.hideAlert();

        expect(component.showAlertConfirmation).toBeFalse();
        expect(component.showVisibilityAlert).toBeFalse();
    });

    it('should create new game successfully', fakeAsync(() => {
        component.displayedObject = mockBoardGame1;
        mockHttpBoardGameService.getBoard.and.returnValue(of(mockBoardGame1));
        mockCurrentGameManager.displayedCurrentGame.and.returnValue(mockCurrentGame);
        mockPlayerSocketService.emitCreateGame.and.callFake((game, callback) => callback(mockCurrentGame));

        component.createNewGame();
        tick();

        expect(mockHttpBoardGameService.getBoard).toHaveBeenCalledWith(mockBoardGame1.id);
        expect(mockCurrentGameManager.updatePickedBoardGame).toHaveBeenCalledWith(mockBoardGame1);
        expect(mockPlayerSocketService.emitCreateGame).toHaveBeenCalledWith(mockCurrentGame, jasmine.any(Function));
    }));

    it('should show alert if board game is not found', fakeAsync(() => {
        component.displayedObject = mockBoardGame1;
        mockHttpBoardGameService.getBoard.and.returnValue(of(null as unknown as BoardGame));

        component.createNewGame();
        tick();

        expect(component.showAlertConfirmation).toBeTrue();
    }));

    it('should show visibility alert if visibility has changed', fakeAsync(() => {
        const hiddenBoardGame: BoardGame = { ...mockBoardGame1, visibility: false };
        component.displayedObject = mockBoardGame1;
        mockHttpBoardGameService.getBoard.and.returnValue(of(hiddenBoardGame));

        component.createNewGame();
        tick();

        expect(component.showVisibilityAlert).toBeTrue();
    }));

    it('should handle error when creating new game', fakeAsync(() => {
        component.displayedObject = mockBoardGame1;
        mockHttpBoardGameService.getBoard.and.returnValue(throwError(() => new Error('Failed to load board')));
        component.createNewGame();
        tick();
        expect(component.showAlertConfirmation).toBeTrue();
    }));

    it('should create a new object if game is not found in gamesList', () => {
        component.gamesList = [mockBoardGame1];
        component.setDisplayedObject(mockBoardGame2);

        expect(component.displayedObject).toEqual(jasmine.objectContaining(mockBoardGame2));
        expect(component.displayedObject).not.toBe(mockBoardGame2);
    });

    it('should not create a game if displayedObject is null', () => {
        component.displayedObject = null;

        component.createNewGame();

        expect(mockHttpBoardGameService.getBoard).not.toHaveBeenCalled();
    });
});
