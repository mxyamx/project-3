import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { HttpBoardGameService } from '@app/services/http-manager/http-board-game.service';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { of, throwError } from 'rxjs';
import { take } from 'rxjs/operators';

import { AdminPageManagerService } from './admin-page-manager.service';
import { UrlPage } from '@common/enums/url-page';

const mockBoardGame1: BoardGame = {
    id: '1',
    name: 'Chess',
    description: 'A classic game of strategy.',
    size: BoardGameSize.Medium,
    gameMode: GameMode.Normal,
    tiles: [[]],
    previewImage: 'assets/chess.png',
    visibility: true,
    lastModified: new Date(),
    itemInfos: [],
};

const mockBoardGame2: BoardGame = {
    id: '2',
    name: 'Monopoly',
    description: 'A game of finance and real estate.',
    size: BoardGameSize.Large,
    gameMode: GameMode.Normal,
    tiles: [[]],
    previewImage: 'assets/monopoly.png',
    visibility: false,
    lastModified: new Date(),
    itemInfos: [],
};

describe('AdminPageManagerService', () => {
    let service: AdminPageManagerService;
    let httpBoardGameService: jasmine.SpyObj<HttpBoardGameService>;
    let boardGameManagerService: jasmine.SpyObj<BoardGameManagerService>;
    let router: jasmine.SpyObj<Router>;

    beforeEach(() => {
        const httpSpy = jasmine.createSpyObj('HttpBoardGameService', ['getAllBoards', 'getBoard', 'updateBoard', 'deleteBoard']);
        const boardGameManagerSpy = jasmine.createSpyObj('BoardGameManagerService', ['updateDisplayedBoardGame', 'updateLoadedBoardGame']);
        const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.configureTestingModule({
            providers: [
                AdminPageManagerService,
                { provide: HttpBoardGameService, useValue: httpSpy },
                { provide: BoardGameManagerService, useValue: boardGameManagerSpy },
                { provide: Router, useValue: routerSpy },
            ],
        });

        service = TestBed.inject(AdminPageManagerService);
        httpBoardGameService = TestBed.inject(HttpBoardGameService) as jasmine.SpyObj<HttpBoardGameService>;
        boardGameManagerService = TestBed.inject(BoardGameManagerService) as jasmine.SpyObj<BoardGameManagerService>;
        router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('loadGames', () => {
        it('should load games and update subjects', () => {
            const games = [mockBoardGame1, mockBoardGame2];
            httpBoardGameService.getAllBoards.and.returnValue(of(games));

            expect(service.gamesList.length).toBe(0);
            expect(service.displayedObject).toBeNull();

            service.loadGames().subscribe();

            expect(service.gamesList).toEqual(games);
            expect(service.displayedObject).toEqual(mockBoardGame1);
            expect(httpBoardGameService.getAllBoards).toHaveBeenCalled();
        });

        it('should set displayedObject to null if no games are loaded', () => {
            httpBoardGameService.getAllBoards.and.returnValue(of([]));

            service.loadGames().subscribe();

            expect(service.gamesList).toEqual([]);
            expect(service.displayedObject).toBeNull();
        });
    });

    describe('setDisplayedObject', () => {
        it('should find and set the displayed object from gamesList', () => {
            httpBoardGameService.getAllBoards.and.returnValue(of([mockBoardGame1, mockBoardGame2]));
            service.loadGames().subscribe();

            service.setDisplayedObject(mockBoardGame2);

            expect(service.displayedObject).toEqual(mockBoardGame2);
        });

        it('should set a copy of the game if not found in gamesList', () => {
            const newGame: BoardGame = { ...mockBoardGame1, id: '999' };

            httpBoardGameService.getAllBoards.and.returnValue(of([mockBoardGame1, mockBoardGame2]));
            service.loadGames().subscribe();

            service.setDisplayedObject(newGame);

            expect(service.displayedObject).toEqual(newGame);
        });
    });

    describe('confirmation methods', () => {
        it('should update showDeleteConfirmation status', () => {
            service.showDeleteConfirmation$.pipe(take(1)).subscribe((initialValue) => {
                expect(initialValue).toBeFalse();

                service.confirmDelete();

                service.showDeleteConfirmation$.pipe(take(1)).subscribe((updatedValue) => {
                    expect(updatedValue).toBeTrue();
                });
            });
        });

        it('should cancel delete confirmation', () => {
            service.confirmDelete();
            service.cancelDelete();

            service.showDeleteConfirmation$.pipe(take(1)).subscribe((value) => {
                expect(value).toBeFalse();
            });
        });

        it('should hide alert', () => {
            service['showAlertConfirmationSubject'].next(true);
            service.hideAlert();

            service.showAlertConfirmation$.pipe(take(1)).subscribe((value) => {
                expect(value).toBeFalse();
            });
        });
    });

    describe('updateObjectVisibility', () => {
        it('should return of(null) if displayedObject is null', () => {
            let result: BoardGame | null = mockBoardGame1;

            service.updateObjectVisibility().subscribe((res) => {
                result = res;
            });

            expect(result).toBeNull();
            expect(httpBoardGameService.updateBoard).not.toHaveBeenCalled();
        });

        it('should update game visibility', () => {
            httpBoardGameService.getAllBoards.and.returnValue(of([mockBoardGame1]));
            service.loadGames().subscribe();

            httpBoardGameService.updateBoard.and.returnValue(of({ ...mockBoardGame1, visibility: false }));

            service.updateObjectVisibility().subscribe();

            expect(httpBoardGameService.updateBoard).toHaveBeenCalled();
        });
    });

    describe('deleteGame', () => {
        it('should not delete if no game is selected', () => {
            service.deleteGame().subscribe((result) => {
                expect(result).toBeFalse();
            });

            expect(httpBoardGameService.getBoard).not.toHaveBeenCalled();
            expect(httpBoardGameService.deleteBoard).not.toHaveBeenCalled();
        });

        it('should delete selected game and update state', () => {
            httpBoardGameService.getAllBoards.and.returnValue(of([mockBoardGame1, mockBoardGame2]));
            service.loadGames().subscribe();

            httpBoardGameService.getBoard.and.returnValue(of(mockBoardGame1));
            httpBoardGameService.deleteBoard.and.returnValue(of(true));

            service.deleteGame().subscribe();

            expect(httpBoardGameService.getBoard).toHaveBeenCalledWith(mockBoardGame1.id);
            expect(httpBoardGameService.deleteBoard).toHaveBeenCalledWith(mockBoardGame1.id);
        });

        it('should show alert if game not found', () => {
            httpBoardGameService.getAllBoards.and.returnValue(of([mockBoardGame1]));
            service.loadGames().subscribe();

            httpBoardGameService.getBoard.and.returnValue(throwError(() => new Error('Not found')));

            service.deleteGame().subscribe();

            service.showAlertConfirmation$.pipe(take(1)).subscribe((value) => {
                expect(value).toBeTrue();
            });

            expect(httpBoardGameService.deleteBoard).not.toHaveBeenCalled();
        });

        it('should set displayedObject to null if all games are deleted', () => {
            httpBoardGameService.getAllBoards.and.returnValue(of([mockBoardGame1]));
            service.loadGames().subscribe();

            httpBoardGameService.getBoard.and.returnValue(of(mockBoardGame1));
            httpBoardGameService.deleteBoard.and.returnValue(of(true));

            service.deleteGame().subscribe();

            expect(service.gamesList.length).toBe(0);
            expect(service.displayedObject).toBeNull();
        });
    });

    describe('editGame', () => {
        it('should return false if no game is selected', () => {
            const result = service.editGame();

            expect(result).toBeFalse();
            expect(boardGameManagerService.updateDisplayedBoardGame).not.toHaveBeenCalled();
            expect(router.navigate).not.toHaveBeenCalled();
        });

        it('should navigate to editor with game id', () => {
            httpBoardGameService.getAllBoards.and.returnValue(of([mockBoardGame1]));
            service.loadGames().subscribe();

            const result = service.editGame();

            expect(result).toBeTrue();
            expect(boardGameManagerService.updateDisplayedBoardGame).toHaveBeenCalledWith(mockBoardGame1);
            expect(boardGameManagerService.updateLoadedBoardGame).toHaveBeenCalled();
            expect(router.navigate).toHaveBeenCalledWith([UrlPage.Editor], { queryParams: { id: mockBoardGame1.id } });
        });
    });
});
