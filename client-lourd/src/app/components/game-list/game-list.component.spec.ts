import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { GameListComponent } from './game-list.component';

describe('GameListComponent', () => {
    let component: GameListComponent;
    let fixture: ComponentFixture<GameListComponent>;

    const mockGamesList: BoardGame[] = [
        {
            id: '1',
            name: 'Game 1',
            previewImage: 'image1.png',
            description: 'Description 1',
            size: BoardGameSize.Small,
            gameMode: GameMode.CTF,
            visibility: true,
            lastModified: new Date(),
            tiles: [],
        },
        {
            id: '2',
            name: 'Game 2',
            previewImage: 'image2.png',
            description: 'Description 2',
            size: BoardGameSize.Medium,
            gameMode: GameMode.Normal,
            visibility: false,
            lastModified: new Date(),
            tiles: [],
        },
        {
            id: '3',
            name: 'Game 3',
            previewImage: 'image3.png',
            description: 'Description 3',
            size: BoardGameSize.Large,
            gameMode: GameMode.Normal,
            visibility: true,
            lastModified: new Date(),
            tiles: [],
        },
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameListComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameListComponent);
        component = fixture.componentInstance;
        component.gamesList = mockGamesList;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display all games when showOnlyVisible is false', () => {
        component.showOnlyVisible = false;
        fixture.detectChanges();

        const gameElements = fixture.debugElement.queryAll(By.css('.game-card-list-1'));
        expect(gameElements.length).toBe(mockGamesList.length);
    });

    it('should display only visible games when showOnlyVisible is true', () => {
        component.showOnlyVisible = true;
        fixture.detectChanges();

        const visibleGames = mockGamesList.filter((game) => game.visibility);
        const gameElements = fixture.debugElement.queryAll(By.css('.game-card-list-1'));

        expect(gameElements.length).toBe(visibleGames.length);
    });

    it('should emit gameSelected event when a game is clicked', () => {
        spyOn(component.gameSelected, 'emit');

        const gameElement = fixture.debugElement.query(By.css('.game-card-list-1'));
        gameElement.triggerEventHandler('click', null);

        expect(component.gameSelected.emit).toHaveBeenCalledWith(mockGamesList[0]);
    });

    it('should update hoveredObject when hovering over a game', () => {
        const gameElement = fixture.debugElement.query(By.css('.game-card-list-1'));

        gameElement.triggerEventHandler('mouseenter', null);
        fixture.detectChanges();

        expect(component.hoveredObject).toBe(mockGamesList[0]);

        gameElement.triggerEventHandler('mouseleave', null);
        fixture.detectChanges();

        expect(component.hoveredObject).toBeNull();
    });

    it('should display correct game mode icons', () => {
        fixture.detectChanges();

        const gameElements = fixture.debugElement.queryAll(By.css('.game-card-list-1'));

        const ctfGameIcon = gameElements[0].query(By.css('img[alt="Mode Icon"]'));
        expect(ctfGameIcon).toBeTruthy();

        const normalGameIcon = gameElements[1].query(By.css('img[alt="Mode Icon"]'));
        expect(normalGameIcon).toBeFalsy();
    });
});
