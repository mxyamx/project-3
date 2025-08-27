import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    FROM_ITEM_NAME_TO_DESCRIPTION,
    FROM_ITEM_NAME_TO_TYPE,
    FROM_TILE_TYPE_TO_IMAGE,
    ITEM_NAMES,
    NB_ITEM_LARGE_MAP,
    NB_ITEM_MEDIUM_MAP,
    NB_ITEM_SMALL_MAP,
} from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { ItemApplicatorService } from '@app/services/item-applicator/item-applicator.service';
import { TileApplicatorService } from '@app/services/tile-applicator/tile-applicator.service';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';
import { Tile } from '@common/tile';
import { TileElementComponent } from './tile-element.component';
import SpyObj = jasmine.SpyObj;

@Component({
    selector: 'app-item-element',
    standalone: true,
    template: '',
})
class MockItemComponent {}

describe('TileElementComponent', () => {
    let component: TileElementComponent;
    let fixture: ComponentFixture<TileElementComponent>;
    let tileApplicatorServiceSpy: SpyObj<TileApplicatorService>;
    let boardGameManagerServiceSpy: SpyObj<BoardGameManagerService>;
    let itemApplicatorServiceSpy: SpyObj<ItemApplicatorService>;
    let containedItem: Item;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MockItemComponent],
        }).compileComponents();

        boardGameManagerServiceSpy = jasmine.createSpyObj('BoardGameManagerService', ['updateTile', 'editedBoardGame']);
        tileApplicatorServiceSpy = jasmine.createSpyObj('TileApplicatorService', ['changeTile', 'toggleDoorState', 'resetTile', 'deactivate']);
        itemApplicatorServiceSpy = jasmine.createSpyObj('ItemApplicatorService', ['activate', 'positionItem', 'deactivate', 'removeItem']);
        containedItem = {
            description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.attributeEditor1],
            name: ITEM_NAMES.attributeEditor1,
            type: FROM_ITEM_NAME_TO_TYPE[ITEM_NAMES.attributeEditor1],
        };

        TestBed.overrideProvider(ItemApplicatorService, { useValue: itemApplicatorServiceSpy });
        TestBed.overrideProvider(BoardGameManagerService, { useValue: boardGameManagerServiceSpy });
        TestBed.overrideProvider(TileApplicatorService, { useValue: tileApplicatorServiceSpy });

        fixture = TestBed.createComponent(TileElementComponent);
        component = fixture.componentInstance;
        component.xPosition = 0;
        component.yPosition = 0;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should find the right image for the right tile', () => {
        const tileTypes: Tile[] = [
            { type: TileType.Grass, doorState: undefined },
            { type: TileType.Water, doorState: undefined },
            { type: TileType.Ice, doorState: undefined },
            { type: TileType.Wall, doorState: undefined },
            { type: TileType.Door, doorState: true },
            { type: TileType.Door, doorState: false },
        ];

        const tileImages: { [key: string]: string } = {};

        tileTypes.forEach(({ type, doorState }) => {
            const key = doorState === undefined ? type : `${type}-${doorState}`;
            tileImages[key] = component.getTileImage({ type, doorState });
        });

        const tileTypesWithStates: TileType[] = [TileType.Grass, TileType.Water, TileType.Ice, TileType.Wall];

        tileTypesWithStates.forEach((tile) => {
            expect(tileImages[tile]).toEqual(FROM_TILE_TYPE_TO_IMAGE[tile]);
        });
        expect(tileImages[`${TileType.Door}-${true}`]).toEqual('assets/tiles/porteOuverte.jpg');
        expect(tileImages[`${TileType.Door}-${false}`]).toEqual('assets/tiles/porteFermee.jpg');
    });

    it('should not try to take another item when it is already containing one', () => {
        component.tile.containedItem = containedItem;

        component.mouseUpOnTile();

        expect(itemApplicatorServiceSpy.positionItem).not.toHaveBeenCalled();
    });

    it('should not try to take another item when the item applicator service is not activated', () => {
        itemApplicatorServiceSpy.isActivated = false;

        component.mouseUpOnTile();

        expect(itemApplicatorServiceSpy.positionItem).not.toHaveBeenCalled();
    });

    it('should not try to take another item when it is not a tile that cannot contain one', () => {
        itemApplicatorServiceSpy.isActivated = true;
        const nonCompatibleTileTypes: Tile[] = [{ type: TileType.Door }, { type: TileType.Wall }];
        for (const tile of nonCompatibleTileTypes) {
            component.tile = tile;
            component.mouseUpOnTile();
            expect(itemApplicatorServiceSpy.positionItem).not.toHaveBeenCalled();
        }
    });

    it('should try to take another item when all the consitions are met', () => {
        itemApplicatorServiceSpy.isActivated = true;
        component.tile.containedItem = undefined;
        itemApplicatorServiceSpy.currentItemSelected = { type: ItemType.AttributeEditor } as Item;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any).getItemLimit = () => {
            return Infinity;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any).findNumberOfItem = () => {
            return 0;
        };

        component.mouseUpOnTile();
        expect(itemApplicatorServiceSpy.positionItem).toHaveBeenCalled();
        expect(itemApplicatorServiceSpy.deactivate).toHaveBeenCalled();
    });

    it('should not try to remove the item when the wrong button is pressed or when the tile applicator is activated', () => {
        itemApplicatorServiceSpy.isActivated = true;
        tileApplicatorServiceSpy.isActivated = false;
        let mouseDownOnItem: MouseEvent = new MouseEvent('mousedown', {
            bubbles: false,
            cancelable: true,
            button: 2,
        });

        component.tile.containedItem = containedItem;

        component.mouseDownOnItem(mouseDownOnItem, component.tile.containedItem);
        expect(boardGameManagerServiceSpy.updateTile).not.toHaveBeenCalled();

        tileApplicatorServiceSpy.isActivated = true;
        mouseDownOnItem = new MouseEvent('mousedown', {
            bubbles: false,
            cancelable: true,
            button: 1,
        });
        component.mouseDownOnItem(mouseDownOnItem, component.tile.containedItem);
        expect(boardGameManagerServiceSpy.updateTile).not.toHaveBeenCalled();
    });

    it(' should remove an item when right button is clicked on one', () => {
        itemApplicatorServiceSpy.isActivated = true;
        tileApplicatorServiceSpy.isActivated = false;
        const mouseDownOnItem: MouseEvent = new MouseEvent('mousedown', {
            bubbles: false,
            cancelable: true,
            button: 2,
        });

        component.tile.containedItem = containedItem;

        component.mouseDownOnItem(mouseDownOnItem, component.tile.containedItem);
        expect(itemApplicatorServiceSpy.removeItem).toHaveBeenCalled();
    });

    it('should select the item and remove it from the tile when the tile applicator is deactivated and the right button is clicked', () => {
        itemApplicatorServiceSpy.isActivated = true;
        tileApplicatorServiceSpy.isActivated = false;
        const mouseDownOnItem: MouseEvent = new MouseEvent('mousedown', {
            bubbles: false,
            cancelable: true,
            button: 1,
        });

        component.tile.containedItem = containedItem;
        component.mouseDownOnItem(mouseDownOnItem, component.tile.containedItem);
        expect(boardGameManagerServiceSpy.updateTile).toHaveBeenCalled();

        expect(itemApplicatorServiceSpy.positionedItemSelected).toBeTrue();
        expect(itemApplicatorServiceSpy.xPositionLastItem).toEqual(component.xPosition);
        expect(itemApplicatorServiceSpy.yPositionLastItem).toEqual(component.yPosition);
    });
    it('should show a warning if the item limit is reached', () => {
        component.tile = { type: TileType.Grass, containedItem: null } as unknown as Tile;
        itemApplicatorServiceSpy.isActivated = true;
        itemApplicatorServiceSpy.currentItemSelected = { type: ItemType.ConditionBased } as Item;

        const ITEM_LIMIT = 10;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spyOn(component as any, 'findNumberOfItem').and.returnValue(ITEM_LIMIT);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spyOn(component as any, 'getItemLimit').and.returnValue(ITEM_LIMIT);

        component.mouseUpOnTile();

        expect(component.showItemLimitWarning).toBeTrue();
        expect(itemApplicatorServiceSpy.positionItem).not.toHaveBeenCalled();
        expect(itemApplicatorServiceSpy.deactivate).not.toHaveBeenCalled();
    });
    it('should return the correct item limit for a small map', () => {
        boardGameManagerServiceSpy.editedBoardGame.and.returnValue({ size: BoardGameSize.Small } as unknown as BoardGame);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((component as any).getItemLimit()).toBe(NB_ITEM_SMALL_MAP);
    });

    it('should return the correct item limit for a small map', () => {
        boardGameManagerServiceSpy.editedBoardGame.and.returnValue({ size: BoardGameSize.Medium } as unknown as BoardGame);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((component as any).getItemLimit()).toBe(NB_ITEM_MEDIUM_MAP);
    });

    it('should return the correct item limit for a small map', () => {
        boardGameManagerServiceSpy.editedBoardGame.and.returnValue({ size: BoardGameSize.Large } as unknown as BoardGame);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((component as any).getItemLimit()).toBe(NB_ITEM_LARGE_MAP);
    });
    it('should return the correct number of items on the board', () => {
        const mockTiles: Tile[][] = [
            [
                { containedItem: { type: ItemType.ConditionBased } as Item } as Tile,
                { containedItem: { type: ItemType.StartingPoint } as Item } as Tile,
            ],
            [{ containedItem: { type: ItemType.Flag } as Item } as Tile, { containedItem: { type: ItemType.ConditionBased } as Item } as Tile],
        ];
        boardGameManagerServiceSpy.editedBoardGame.and.returnValue({ size: 2, tiles: mockTiles } as unknown as BoardGame);

        expect(component['findNumberOfItem']()).toBe(2);
    });

    it('should return 0 if there are no items on the board', () => {
        const mockTiles: Tile[][] = [
            [{ containedItem: null as unknown as Item } as Tile, { containedItem: null as unknown as Item } as Tile],
            [{ containedItem: null as unknown as Item } as Tile, { containedItem: null as unknown as Item } as Tile],
        ];
        boardGameManagerServiceSpy.editedBoardGame.and.returnValue({ size: 2, tiles: mockTiles } as unknown as BoardGame);

        expect(component['findNumberOfItem']()).toBe(0);
    });

    it('should ignore Flag and StartingPoint items', () => {
        const mockTiles: Tile[][] = [
            [{ containedItem: { type: ItemType.Flag } as Item } as Tile, { containedItem: { type: ItemType.StartingPoint } as Item } as Tile],
            [{ containedItem: null as unknown as Item } as Tile, { containedItem: { type: ItemType.Flag } as Item } as Tile],
        ];
        boardGameManagerServiceSpy.editedBoardGame.and.returnValue({ size: 2, tiles: mockTiles } as unknown as BoardGame);

        expect(component['findNumberOfItem']()).toBe(0);
    });
    it('should set showItemLimitWarning to false when clickOnOk is called', () => {
        component.showItemLimitWarning = true;

        component.clickOnOk();

        expect(component.showItemLimitWarning).toBeFalse();
    });
});
