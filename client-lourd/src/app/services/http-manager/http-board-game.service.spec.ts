import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorMessages } from '@app/constants/http-status-constants';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { HttpBoardGameService } from './http-board-game.service';

describe('HttpBoardGameService', () => {
    let service: HttpBoardGameService;
    let httpMock: HttpTestingController;
    let apiUrl: string;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [],
            providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
        });
        service = TestBed.inject(HttpBoardGameService);
        httpMock = TestBed.inject(HttpTestingController);
        // eslint-disable-next-line dot-notation
        apiUrl = service['apiUrl'];
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should fetch all board games (GET)', () => {
        const mockBoardGames: BoardGame[] = [
            {
                id: '1',
                name: 'Game 1',
                description: 'Description 1',
                size: BoardGameSize.Small,
                gameMode: GameMode.Normal,
                tiles: [[]],
                previewImage: '',
                visibility: true,
                lastModified: new Date(),
            },
            {
                id: '2',
                name: 'Game 2',
                description: 'Description 2',
                size: BoardGameSize.Medium,
                gameMode: GameMode.CTF,
                tiles: [[]],
                previewImage: '',
                visibility: false,
                lastModified: new Date(),
            },
        ];

        service.getAllBoards().subscribe((games) => {
            expect(games.length).toBe(2);
            expect(games).toEqual(mockBoardGames);
        });

        const req = httpMock.expectOne(`${apiUrl}/board-game/`);
        expect(req.request.method).toBe('GET');
        req.flush(mockBoardGames);
    });

    it('should throw error if fetching all board games fails (GET)', () => {
        service.getAllBoards().subscribe({
            next: () => fail('Expected an error, but got a response'),
            error: (error) => {
                expect(error.message).toBe(ErrorMessages.NotFoundError);
            },
        });

        const req = httpMock.expectOne(`${apiUrl}/board-game/`);
        req.flush({}, { status: 404, statusText: 'Not Found' });
    });

    it('should fetch a single board game by ID (GET)', () => {
        const mockGame: BoardGame = {
            id: '1',
            name: 'Game 1',
            description: 'Description 1',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: [[]],
            previewImage: '',
            visibility: true,
            lastModified: new Date(),
        };

        service.getBoard('1').subscribe((game) => {
            expect(game).toEqual(mockGame);
        });

        const req = httpMock.expectOne(`${apiUrl}/board-game/1`);
        expect(req.request.method).toBe('GET');
        req.flush(mockGame);
    });

    it('should throw error if fetching board game by ID fails (GET)', () => {
        service.getBoard('test').subscribe({
            next: () => fail('Expected an error, but got a response'),
            error: (error) => {
                expect(error.message).toBe(ErrorMessages.NotFoundError);
            },
        });

        const req = httpMock.expectOne(`${apiUrl}/board-game/test`);
        req.flush({}, { status: 404, statusText: 'Not Found' });
    });

    it('should create a board game (POST)', () => {
        const newGame: BoardGame = {
            id: '3',
            name: 'New Game',
            description: 'New Description',
            size: BoardGameSize.Large,
            gameMode: GameMode.Normal,
            tiles: [[]],
            previewImage: '',
            visibility: true,
            lastModified: new Date(),
        };

        service.createBoard(newGame).subscribe((game) => {
            expect(game).toEqual(newGame);
        });

        const req = httpMock.expectOne(`${apiUrl}/board-game/`);
        expect(req.request.method).toBe('POST');
        req.flush(newGame);
    });

    it('should throw an internal server error if creating board games fails (POST)', () => {
        const mockBoard = {} as BoardGame;
        service.createBoard(mockBoard).subscribe({
            next: () => fail('Expected an error, but got a response'),
            error: (error) => {
                expect(error.message).toBe(ErrorMessages.InternalServerError);
            },
        });

        const req = httpMock.expectOne(`${apiUrl}/board-game/`);
        req.flush({}, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should throw a message error if creating board games fails (POST)', () => {
        const mockBoard = {} as BoardGame;
        service.createBoard(mockBoard).subscribe({
            next: () => fail('Expected an error, but got a response'),
            error: (error) => {
                expect(error.message).toBe(ErrorMessages.BadRequestError);
            },
        });

        const req = httpMock.expectOne(`${apiUrl}/board-game/`);
        req.flush({ error: ErrorMessages.BadRequestError }, { status: 400, statusText: 'Bad Request' });
    });

    it('should use ErrorMessages.BadRequestError if error.error is not provided (POST)', () => {
        const mockBoard = {} as BoardGame;
        service.createBoard(mockBoard).subscribe({
            next: () => fail('Expected an error, but got a response'),
            error: (error) => {
                expect(error.message).toBe(ErrorMessages.BadRequestError);
            },
        });

        const req = httpMock.expectOne(`${apiUrl}/board-game/`);
        req.flush({}, { status: 400, statusText: 'Bad Request' });
    });

    it('should delete a board game (DELETE)', () => {
        service.deleteBoard('1').subscribe((response) => {
            expect(response).toBeTruthy();
        });

        const req = httpMock.expectOne(`${apiUrl}/board-game/1`);
        expect(req.request.method).toBe('DELETE');
        req.flush(true);
    });

    it('should throw an error if deleting board game fails (DELETE)', () => {
        service.deleteBoard('test').subscribe({
            next: () => fail('Expected an error, but got a response'),
            error: (error) => {
                expect(error.message).toBe(ErrorMessages.NotFoundError);
            },
        });

        const req = httpMock.expectOne(`${apiUrl}/board-game/test`);
        req.flush({}, { status: 404, statusText: 'Not found' });
    });

    it('should update a board game (PUT)', () => {
        const updatedGame: BoardGame = {
            id: '1',
            name: 'Updated Game',
            description: 'Updated Description',
            size: BoardGameSize.Medium,
            gameMode: GameMode.CTF,
            tiles: [[]],
            previewImage: '',
            visibility: false,
            lastModified: new Date(),
        };

        service.updateBoard(updatedGame).subscribe((game) => {
            expect(game).toEqual(updatedGame);
        });

        const req = httpMock.expectOne(`${apiUrl}/board-game/1`);
        expect(req.request.method).toBe('PUT');
        req.flush(updatedGame);
    });

    it('should throw an error if updating board game fails (PUT)', () => {
        const mockBoard = { id: 'test' } as BoardGame;
        service.updateBoard(mockBoard).subscribe({
            next: () => fail('Expected an error, but got a response'),
            error: (error) => {
                expect(error.message).toBe(ErrorMessages.InternalServerError);
            },
        });

        const req = httpMock.expectOne(`${apiUrl}/board-game/${mockBoard.id}`);
        req.flush({}, { status: 500, statusText: 'Internal Server Error' });
    });
});
