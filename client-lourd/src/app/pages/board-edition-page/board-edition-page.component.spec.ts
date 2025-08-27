import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BoardgameContainerComponent } from '@app/components/boardgame-container/boardgame-container.component';
import { FROM_ITEM_NAME_TO_DESCRIPTION, ITEM_NAMES } from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { HttpBoardGameService } from '@app/services/http-manager/http-board-game.service';
import { ItemApplicatorService } from '@app/services/item-applicator/item-applicator.service';
import { PreviewImageGenerationService } from '@app/services/preview-image-generation/preview-image-generation.service';
import { TileApplicatorService } from '@app/services/tile-applicator/tile-applicator.service';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';
import { Tile } from '@common/tile';
import { of, throwError } from 'rxjs';
import { BoardEditionPageComponent } from './board-edition-page.component';

import SpyObj = jasmine.SpyObj;

@Component({
    selector: 'app-boardgame-container',
    standalone: true,
    template: '',
})
class MockBoardGameComponent {}
describe('BoardEditionPageComponent', () => {
    let component: BoardEditionPageComponent;
    let fixture: ComponentFixture<BoardEditionPageComponent>;
    let tileApplicatorServiceSpy: SpyObj<TileApplicatorService>;
    let boardGameManagerServiceSpy: SpyObj<BoardGameManagerService>;
    let httpServiceSpy: SpyObj<HttpBoardGameService>;
    let itemApplicatorServiceSpy: SpyObj<ItemApplicatorService>;
    let standardBoardGame: BoardGame;
    let standardTile: Tile;
    let standardItem: Item;
    let previewImageGenerationServiceSpy: PreviewImageGenerationService;
    let router: Router;

    beforeEach(async () => {
        TestBed.overrideComponent(BoardEditionPageComponent, {
            add: { imports: [MockBoardGameComponent] },
            remove: { imports: [BoardgameContainerComponent] },
        });

        await TestBed.configureTestingModule({
            imports: [BoardEditionPageComponent, MockBoardGameComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        boardGameManagerServiceSpy = jasmine.createSpyObj('BoardGameManagerService', [
            'getBoardGame',
            'updateDescription',
            'updateName',
            'updateItemAvailability',
            'updateDisplayedBoardGame',
        ]);
        tileApplicatorServiceSpy = jasmine.createSpyObj('TileApplicatorService', [
            'activate',
            'changeTile',
            'toggleDoorState',
            'resetTile',
            'deactivate',
        ]);
        previewImageGenerationServiceSpy = jasmine.createSpyObj('PreviewImageGenerationService', ['generatePreviewImage']);
        httpServiceSpy = jasmine.createSpyObj('HttpBoardGameService', ['getAllBoards', 'createBoard', 'getBoard', 'updateBoard']);
        itemApplicatorServiceSpy = jasmine.createSpyObj('ItemApplicatorService', ['activate', 'deactivate', 'positionItem']);
        standardBoardGame = {
            id: '1',
            name: 'Default Board Game',
            description: 'This is a default description for the board game.',
            size: BoardGameSize.Medium,
            gameMode: GameMode.Normal,
            tiles: [],
            previewImage: 'assets/preview.png',
            visibility: true,
            lastModified: new Date(),
            itemInfos: [],
        };

        standardTile = { type: TileType.Grass };
        standardItem = {
            type: ItemType.AttributeEditor,
            name: ITEM_NAMES.attributeEditor2,
            description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.attributeEditor2],
        };

        TestBed.overrideProvider(BoardGameManagerService, { useValue: boardGameManagerServiceSpy });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (boardGameManagerServiceSpy as any).getBoardGame = () => {
            return standardBoardGame;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (boardGameManagerServiceSpy as any).editedBoardGame = () => {
            return standardBoardGame;
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (boardGameManagerServiceSpy as any).loadedBoardGame = () => {
            return standardBoardGame;
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (boardGameManagerServiceSpy as any).fetchBoardById = () => {
            return {
                subscribe: () => {
                    return;
                },
            };
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (boardGameManagerServiceSpy as any).createNewBoard = () => {
            return {
                subscribe: () => {
                    return;
                },
            };
        };

        TestBed.overrideProvider(BoardGameManagerService, { useValue: boardGameManagerServiceSpy });

        TestBed.overrideProvider(TileApplicatorService, { useValue: tileApplicatorServiceSpy });
        TestBed.overrideProvider(HttpBoardGameService, { useValue: httpServiceSpy });
        TestBed.overrideProvider(ItemApplicatorService, { useValue: itemApplicatorServiceSpy });
        TestBed.overrideProvider(PreviewImageGenerationService, { useValue: previewImageGenerationServiceSpy });
        itemApplicatorServiceSpy.currentItemSelected = standardItem;

        fixture = TestBed.createComponent(BoardEditionPageComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should pass the right tile to hovered tile when you enter a tile section', () => {
        component.tileOnMouseEnter(standardTile);
        expect(component.hoveredTile).toEqual(standardTile);
    });

    it('should pass the right Item to hoveredItem when you enter an Item section', () => {
        component.itemOnMouseEnter(standardItem);
        expect(component.hoveredItem).toEqual(standardItem);
    });

    it('should set hovered tile to null when leaving tile section', () => {
        component.tileOnMouseLeave();
        expect(component.hoveredTile).toEqual(null);
    });

    it('should set hovered Item to null when leaving item section', () => {
        component.itemOnMouseLeave();
        expect(component.hoveredItem).toEqual(null);
    });

    it('should behave like the left button has been released if the cursor leaves the place', () => {
        spyOn(component, 'mouseUpOnMainDiv').and.callFake(() => {
            return;
        });
        component.onMouseLeavePage();
        expect(component.mouseUpOnMainDiv).toHaveBeenCalled();
    });

    it('should behave like the right button has been released if the cursor leaves the page', () => {
        tileApplicatorServiceSpy.rightButtonPressed = true;
        spyOn(component, 'mouseUpOnMainDiv').and.callFake(() => {
            return;
        });
        component.onMouseLeavePage();
        expect(component.mouseUpOnMainDiv).toHaveBeenCalledWith(jasmine.objectContaining({ button: 2 }));
    });

    it('should update mouse coordinate on mouse move', () => {
        const mouseMove = new MouseEvent('mousemove', {
            clientX: 100,
            clientY: 100,
        });

        component.onMouseMove(mouseMove);

        const mouseXExpected = 75;
        const mouseYExpected = 75;

        expect(component.mouseX).toEqual(mouseXExpected);
        expect(component.mouseY).toEqual(mouseYExpected);
    });

    it('should call updateDescription on boardGameManager when onInputDescription is called', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const event = { target: { value: 'New Description' } } as any;
        component.onInputDescription(event);
        expect(boardGameManagerServiceSpy.updateDescription).toHaveBeenCalledWith('New Description');
    });

    it('should call updateName on boardGameManager when onInputName is called', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const event = { target: { value: 'New Name' } } as any;
        component.onInputName(event);
        expect(boardGameManagerServiceSpy.updateName).toHaveBeenCalledWith('New Name');
    });

    it('should activate tileApplicator and deactivate itemApplicator when manageTileApplicator is called and the service is deactivated', () => {
        const event = new Event('click');
        component.manageTileApplicator(event, TileType.Wall);
        expect(itemApplicatorServiceSpy.deactivate).toHaveBeenCalled();
        expect(tileApplicatorServiceSpy.activate).toHaveBeenCalledWith(TileType.Wall);
    });
    it('should deactivate tileApplicator when manageTileApplicator on the same tile is called and the service is activated', () => {
        const event = new Event('click');
        tileApplicatorServiceSpy.isActivated = true;
        tileApplicatorServiceSpy.currentTileType = TileType.Wall;
        component.manageTileApplicator(event, TileType.Wall);
        expect(tileApplicatorServiceSpy.deactivate).toHaveBeenCalled();
    });

    it('should call save a new board correctly and update the board', async () => {
        httpServiceSpy.getBoard.and.returnValue(of(standardBoardGame));
        httpServiceSpy.updateBoard.and.returnValue(of(standardBoardGame));

        spyOn(component, 'openDialog');

        await component.saveBoard();

        expect(httpServiceSpy.getBoard).toHaveBeenCalledWith('1');
        expect(httpServiceSpy.updateBoard).toHaveBeenCalled();
        expect(component.openDialog).toHaveBeenCalledWith('Enregistrement reussit!', true);
    });

    it('should call save a new board correctly and create the board', async () => {
        const newBoard: BoardGame = {
            id: '2',
            name: 'test name',
            description: 'test description',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: [],
            previewImage: 'assets/preview.png',
            visibility: true,
            lastModified: new Date(),
            itemInfos: [],
        };
        httpServiceSpy.getBoard.and.returnValue(throwError(() => new Error()));
        httpServiceSpy.createBoard.and.returnValue(of(newBoard));

        spyOn(component, 'openDialog');

        await component.saveBoard();

        expect(httpServiceSpy.getBoard).toHaveBeenCalledWith('1');
        expect(httpServiceSpy.createBoard).toHaveBeenCalled();
        expect(component.openDialog).toHaveBeenCalledWith('Enregistrement reussit!', true);
    });

    it('should throw an error if saving an existing board fails', async () => {
        httpServiceSpy.getBoard.and.returnValue(of(standardBoardGame));
        httpServiceSpy.updateBoard.and.returnValue(throwError(() => new Error()));

        await component.saveBoard();

        expect(httpServiceSpy.getBoard).toHaveBeenCalledWith('1');
        expect(httpServiceSpy.updateBoard).toHaveBeenCalled();
    });

    it('should throw an error if saving a new board fails', async () => {
        httpServiceSpy.getBoard.and.returnValue(throwError(() => new Error()));
        httpServiceSpy.createBoard.and.returnValue(throwError(() => new Error()));

        await component.saveBoard();

        expect(httpServiceSpy.getBoard).toHaveBeenCalledWith('1');
        expect(httpServiceSpy.createBoard).toHaveBeenCalled();
    });

    it('should navigate correctly to admin if the dialog is closed', async () => {
        const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
        dialogRefSpy.afterClosed.and.returnValue(of(null));

        spyOn(component['dialog'], 'open').and.returnValue(dialogRefSpy);

        const routerSpy = spyOn(router, 'navigate');
        component.openDialog('test message', true);

        expect(dialogRefSpy.afterClosed).toHaveBeenCalled();
        expect(routerSpy).toHaveBeenCalledWith(['/admin']);
    });

    it('should activate the itemApplicator and deactivate the tileApplicator when you click on itemTool ', () => {
        const mousedown = new MouseEvent('mousedown', {
            button: 0,
        });
        component.activateItemApplicator(mousedown, standardItem);
        expect(tileApplicatorServiceSpy.deactivate).toHaveBeenCalled();
        expect(itemApplicatorServiceSpy.activate).toHaveBeenCalledWith(standardItem);
    });
    it('should not activate the itemApplicator and deactivate the tileApplicator when you click on itemTool with right button', () => {
        const mousedown = new MouseEvent('mousedown', {
            button: 2,
        });
        component.activateItemApplicator(mousedown, standardItem);
        expect(tileApplicatorServiceSpy.deactivate).not.toHaveBeenCalled();
        expect(itemApplicatorServiceSpy.activate).not.toHaveBeenCalled();
    });

    it('should notify the tileApplicator service if a button is realeased', () => {
        const leftButtonUp: MouseEvent = new MouseEvent('mouseup', {
            button: 0,
        });
        component.mouseUpOnMainDiv(leftButtonUp);
        expect(tileApplicatorServiceSpy.mouseClicked).toEqual(false);

        const righButtonUp: MouseEvent = new MouseEvent('mouseup', {
            button: 2,
        });
        component.mouseUpOnMainDiv(righButtonUp);
        expect(tileApplicatorServiceSpy.rightButtonPressed).toEqual(false);
    });

    it('should reset the itemApplicator if any button is released', () => {
        itemApplicatorServiceSpy.currentItemSelected = standardItem;
        itemApplicatorServiceSpy.positionedItemSelected = true;
        itemApplicatorServiceSpy.isActivated = true;

        const expectedXPosition = 10;
        const expectedYPosition = 10;

        itemApplicatorServiceSpy.xPositionLastItem = expectedXPosition;
        itemApplicatorServiceSpy.yPositionLastItem = expectedYPosition;
        const mouseUp: MouseEvent = new MouseEvent('mouseup');
        component.mouseUpOnMainDiv(mouseUp);
        expect(itemApplicatorServiceSpy.positionItem).toHaveBeenCalledWith(expectedXPosition, expectedYPosition, standardItem, false);
        expect(itemApplicatorServiceSpy.deactivate).toHaveBeenCalled();

        itemApplicatorServiceSpy.positionedItemSelected = false;
        component.mouseUpOnMainDiv(mouseUp);
        expect(boardGameManagerServiceSpy.updateItemAvailability).toHaveBeenCalledWith(standardItem.name, true);
        expect(itemApplicatorServiceSpy.deactivate).toHaveBeenCalled();
    });

    it('should replace the item if the button is released on its section', () => {
        itemApplicatorServiceSpy.currentItemSelected = standardItem;
        itemApplicatorServiceSpy.positionedItemSelected = true;
        itemApplicatorServiceSpy.isActivated = true;

        component.mouseUpOnItemSection(standardItem);
        expect(itemApplicatorServiceSpy.positionedItemSelected).toEqual(false);
    });

    it('should not replace the item if the button is released on another section', () => {
        itemApplicatorServiceSpy.currentItemSelected = standardItem;
        itemApplicatorServiceSpy.positionedItemSelected = true;
        itemApplicatorServiceSpy.isActivated = true;

        component.mouseUpOnItemSection({ type: ItemType.AttributeEditor, name: ITEM_NAMES.attributeEditor1 } as Item);
        expect(itemApplicatorServiceSpy.positionedItemSelected).toEqual(true);
    });
    it('should not do anything if the itemApplicator is not activated when the button is realesed on item section', () => {
        itemApplicatorServiceSpy.currentItemSelected = standardItem;
        itemApplicatorServiceSpy.positionedItemSelected = true;
        itemApplicatorServiceSpy.isActivated = false;
        component.mouseUpOnItemSection(standardItem);
        expect(itemApplicatorServiceSpy.positionedItemSelected).toEqual(true);
    });

    it('should execute the right sequence while reinitialising', () => {
        component.reinitialize();
        expect(boardGameManagerServiceSpy.updateDisplayedBoardGame).toHaveBeenCalledWith(structuredClone(standardBoardGame));
        expect(itemApplicatorServiceSpy.deactivate).toHaveBeenCalled();
        expect(tileApplicatorServiceSpy.deactivate).toHaveBeenCalled();
    });
    it('should return itemDescriptionCorrespondance', () => {
        const result = component.itemDescription;
        expect(result).toBe(FROM_ITEM_NAME_TO_DESCRIPTION);
    });
});
