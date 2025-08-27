import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FROM_ITEM_NAME_TO_DESCRIPTION, ITEM_NAMES } from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { ItemApplicatorService } from '@app/services/item-applicator/item-applicator.service';
import { TileApplicatorService } from '@app/services/tile-applicator/tile-applicator.service';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { BoardgameContainerComponent } from './boardgame-container.component';
import SpyObj = jasmine.SpyObj;

@Component({
    selector: 'app-tile-element',
    standalone: true,
    template: '',
})
class MockTileComponent {}

describe('BoardgameContainerComponent', () => {
    let component: BoardgameContainerComponent;
    let fixture: ComponentFixture<BoardgameContainerComponent>;
    let tileApplicatorServiceSpy: SpyObj<TileApplicatorService>;
    let boardGameManagerServiceSpy: SpyObj<BoardGameManagerService>;
    let xPosition: number;
    let yPosition: number;
    let tileTest: TileType;
    let mouseDownOnTile: MouseEvent;
    let itemApplicatorServiceSpy: SpyObj<ItemApplicatorService>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MockTileComponent],
        }).compileComponents();

        boardGameManagerServiceSpy = jasmine.createSpyObj('BoardGameManagerService', ['getBoardgame', 'updateTile', 'updateItemAvailability']);
        tileApplicatorServiceSpy = jasmine.createSpyObj('TileApplicatorService', ['changeTile', 'toggleDoorState', 'resetTile', 'deactivate']);
        itemApplicatorServiceSpy = jasmine.createSpyObj('ItemApplicatorService', ['removeItem']);

        tileTest = TileType.Wall;
        xPosition = 0;
        yPosition = 0;
        mouseDownOnTile = new MouseEvent('mousedown', {
            bubbles: false,
            cancelable: true,
            button: 1,
        });
        tileApplicatorServiceSpy.isActivated = true;
        tileApplicatorServiceSpy.currentTileType = tileTest;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spyBoardGame: any = signal<BoardGame>({
            id: '',
            name: 'Default Board',
            description: 'This is a default description for the board game.',
            size: BoardGameSize.Medium,
            gameMode: GameMode.Normal,
            tiles: [
                [
                    { type: TileType.Wall },
                    { type: TileType.Door },
                    {
                        type: TileType.Grass,
                        containedItem: {
                            type: ItemType.AttributeEditor,
                            name: ITEM_NAMES.attributeEditor2,
                            description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.attributeEditor2],
                        },
                    },
                ],
            ],
            previewImage: 'assets/preview.png',
            visibility: true,
            lastModified: new Date(),
            itemInfos: [],
        });

        boardGameManagerServiceSpy.editedBoardGame = spyBoardGame;
        TestBed.overrideProvider(BoardGameManagerService, { useValue: boardGameManagerServiceSpy });
        TestBed.overrideProvider(TileApplicatorService, { useValue: tileApplicatorServiceSpy });
        TestBed.overrideProvider(ItemApplicatorService, { useValue: itemApplicatorServiceSpy });

        fixture = TestBed.createComponent(BoardgameContainerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should not apply a new tile type if the tile applicator service is not activated', () => {
        tileApplicatorServiceSpy.isActivated = false;
        component.changeTile(mouseDownOnTile, xPosition, yPosition);

        expect(tileApplicatorServiceSpy.changeTile).not.toHaveBeenCalled();
    });

    it('should not call the tile applicator service if the same tile is being applied', () => {
        tileApplicatorServiceSpy.currentTileType = tileTest;
        component.changeTile(mouseDownOnTile, xPosition, yPosition);

        expect(tileApplicatorServiceSpy.changeTile).not.toHaveBeenCalled();
    });

    it('should remove tile if uncompatible tile type is placed', () => {
        yPosition = 2;
        tileTest = TileType.Door;
        tileApplicatorServiceSpy.currentTileType = tileTest;
        component.changeTile(mouseDownOnTile, xPosition, yPosition);

        expect(itemApplicatorServiceSpy.removeItem).toHaveBeenCalled();
    });

    it('should remove tile if uncompatible tile type is placed', () => {
        yPosition = 2;
        tileTest = TileType.Wall;
        tileApplicatorServiceSpy.currentTileType = tileTest;
        component.changeTile(mouseDownOnTile, xPosition, yPosition);

        expect(itemApplicatorServiceSpy.removeItem).toHaveBeenCalled();
    });

    it('clicking or passing over a door should change it state', () => {
        yPosition = 1;
        tileTest = TileType.Door;
        tileApplicatorServiceSpy.currentTileType = tileTest;
        component.changeTile(mouseDownOnTile, xPosition, yPosition);

        expect(tileApplicatorServiceSpy.toggleDoorState).toHaveBeenCalled();
    });

    it('clicking on or passing over a tile when the tile service is activated with a different tileType should change it', () => {
        yPosition = 1;
        component.changeTile(mouseDownOnTile, xPosition, yPosition);
        expect(tileApplicatorServiceSpy.changeTile).toHaveBeenCalled();
    });

    it('clicking the right button of the mouse on a tile should try to reset it', () => {
        mouseDownOnTile = new MouseEvent('mousedown', {
            button: 2,
        });

        spyOn(component, 'resetTile');
        component.changeTile(mouseDownOnTile, xPosition, yPosition);
        expect(tileApplicatorServiceSpy.changeTile).not.toHaveBeenCalled();
        expect(component.resetTile).toHaveBeenCalled();
    });

    it('keeping the left button pressed and entering on a tile with the tile applicator service should try to change its type', () => {
        const mouseEnterOnTile: MouseEvent = new MouseEvent('mouseenter');
        tileApplicatorServiceSpy.mouseClicked = true;

        spyOn(component, 'changeTile').and.callFake(() => {
            return;
        });

        component.onMouseEnterTile(mouseEnterOnTile, xPosition, yPosition);
        expect(component.changeTile).toHaveBeenCalled();
    });

    it('keeping the right button pressed and entering on a tile with the tile applicator service should try to reset its type', () => {
        const mouseEnterOnTile: MouseEvent = new MouseEvent('mouseenter');
        tileApplicatorServiceSpy.rightButtonPressed = true;

        spyOn(component, 'resetTile').and.callFake(() => {
            return;
        });

        component.onMouseEnterTile(mouseEnterOnTile, xPosition, yPosition);
        expect(component.resetTile).toHaveBeenCalled();
    });

    it('entering on a tile with the tile applicator service but the the mouse left button not pressed should not try to change its type', () => {
        const mouseEnterOnTile: MouseEvent = new MouseEvent('mouseenter');
        tileApplicatorServiceSpy.mouseClicked = false;

        spyOn(component, 'changeTile').and.callFake(() => {
            return;
        });

        component.onMouseEnterTile(mouseEnterOnTile, xPosition, yPosition);
        expect(component.changeTile).not.toHaveBeenCalled();
    });

    it('right clicking on a tile that is not a grass tile should turn it into one', () => {
        const rightClickOnTile: MouseEvent = new MouseEvent('contextmenu');

        component.resetTile(rightClickOnTile, xPosition, yPosition);
        expect(tileApplicatorServiceSpy.resetTile).toHaveBeenCalled();
    });

    it('right clicking on a grass tile should not call the tile service', () => {
        const rightClickOnTile: MouseEvent = new MouseEvent('contextmenu');

        component.resetTile(rightClickOnTile, xPosition, 2);
        expect(tileApplicatorServiceSpy.resetTile).not.toHaveBeenCalled();
    });

    it('should call the right function when you click on a tile', () => {
        mouseDownOnTile = new MouseEvent('mousedown', {
            button: 1,
        });
        spyOn(component, 'changeTile').and.callFake(() => {
            return;
        });
        spyOn(component, 'resetTile').and.callFake(() => {
            return;
        });
        component.mouseDownOnTile(mouseDownOnTile, xPosition, yPosition);
        expect(component.changeTile).toHaveBeenCalled();
        expect(component.resetTile).not.toHaveBeenCalled();
    });
    it('should call the right function when you right click on a tile', () => {
        mouseDownOnTile = new MouseEvent('mousedown', {
            button: 2,
        });
        spyOn(component, 'changeTile').and.callFake(() => {
            return;
        });
        spyOn(component, 'resetTile').and.callFake(() => {
            return;
        });
        component.mouseDownOnTile(mouseDownOnTile, xPosition, yPosition);
        expect(component.changeTile).not.toHaveBeenCalled();
        expect(component.resetTile).toHaveBeenCalled();
    });
    it('should not call any service if you enter a tile when an item has been recently removed', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any).itemRecentlyRemoved = true;
        component.onMouseEnterTile(mouseDownOnTile, xPosition, yPosition);
        spyOn(component, 'changeTile');
        spyOn(component, 'resetTile');
        expect(component.changeTile).not.toHaveBeenCalled();
        expect(component.resetTile).not.toHaveBeenCalled();
    });
});
