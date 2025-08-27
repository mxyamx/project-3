/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { FROM_ITEM_NAME_TO_DESCRIPTION, FROM_TILE_TYPE_TO_DESCRIPTION, ITEM_NAMES } from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { TileApplicatorService } from '@app/services/tile-applicator/tile-applicator.service';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Tile } from '@common/tile';

describe('TileApplicatorService', () => {
    let service: TileApplicatorService;
    let boardGameManagerServiceSpy: jasmine.SpyObj<BoardGameManagerService>;
    let standardTile: Tile;
    let xPositionTest: number;
    let yPositionTest: number;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        boardGameManagerServiceSpy = jasmine.createSpyObj('BoardGameManagerService', ['updateTile', 'editedBoardGame']);
        standardTile = { type: TileType.Grass, description: FROM_TILE_TYPE_TO_DESCRIPTION[TileType.Grass] } as Tile;
        xPositionTest = 0;
        yPositionTest = 0;

        TestBed.overrideProvider(BoardGameManagerService, { useValue: boardGameManagerServiceSpy });
        (boardGameManagerServiceSpy as any).editedBoardGame = () => {
            return {
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
            };
        };

        service = TestBed.inject(TileApplicatorService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should activate', () => {
        service.activate(standardTile.type);
        expect(service.isActivated).toBeTrue();
        expect(service.currentTileType).toBe(standardTile.type);
    });

    it('should deactivate', () => {
        service.deactivate();
        expect(service.isActivated).toBeFalse();
        expect(service.currentTileType).toBe(TileType.Grass);
    });

    it('should change tile', () => {
        service.changeTile(xPositionTest, yPositionTest, standardTile.type);
        expect(boardGameManagerServiceSpy.updateTile).toHaveBeenCalledOnceWith(xPositionTest, yPositionTest, { type: standardTile.type });
    });

    it('should reset tile', () => {
        service.resetTile(xPositionTest, yPositionTest);
        expect(service.isActivated).toBeFalse();
        expect(service.currentTileType).toBe(TileType.Grass);
        expect(boardGameManagerServiceSpy.updateTile).toHaveBeenCalledOnceWith(xPositionTest, yPositionTest, { type: TileType.Grass });
    });

    it('should toggle door state', () => {
        xPositionTest = 0;
        yPositionTest = 1;
        service.toggleDoorState(xPositionTest, yPositionTest);
        expect(boardGameManagerServiceSpy.updateTile).toHaveBeenCalledOnceWith(xPositionTest, yPositionTest, {
            type: TileType.Door,
            doorState: true,
        });
    });
});
