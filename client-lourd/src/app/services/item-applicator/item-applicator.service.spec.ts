import { TestBed } from '@angular/core/testing';
import { FROM_ITEM_NAME_TO_DESCRIPTION, ITEM_NAMES } from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { ItemApplicatorService } from '@app/services/item-applicator/item-applicator.service';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';

describe('ItemApplicatorService', () => {
    let service: ItemApplicatorService;
    let boardGameManagerServiceSpy: jasmine.SpyObj<BoardGameManagerService>;
    let standardItem: Item;
    let xPositionTest: number;
    let yPositionTest: number;

    beforeEach(() => {
        TestBed.configureTestingModule({});

        boardGameManagerServiceSpy = jasmine.createSpyObj('BoardGameManagerService', ['updateTile', 'displayedBoardGame', 'updateItemAvailability']);
        standardItem = {
            type: ItemType.AttributeEditor,
            description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.attributeEditor1],
            name: ITEM_NAMES.attributeEditor2,
        } as Item;
        xPositionTest = 0;
        yPositionTest = 2;

        TestBed.overrideProvider(BoardGameManagerService, { useValue: boardGameManagerServiceSpy });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        service = TestBed.inject(ItemApplicatorService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should activate the item applicator service', () => {
        service.activate(standardItem);
        expect(service.isActivated).toBeTrue();
    });

    it('should deactivate the item applicator service', () => {
        service.activate(standardItem);
        service.deactivate();
        expect(service.isActivated).toBeFalse();
    });

    it('should position the item on the board game', () => {
        service.activate(standardItem);
        service.positionItem(xPositionTest, yPositionTest, standardItem, true);
        expect(boardGameManagerServiceSpy.updateTile).toHaveBeenCalled();
    });

    it('should position the right item on the board game', () => {
        standardItem.type = ItemType.StartingPoint;
        standardItem.name = ITEM_NAMES.startingPoint;

        service.activate(standardItem);
        service.positionItem(xPositionTest, yPositionTest, standardItem, true);
        expect(boardGameManagerServiceSpy.updateTile).toHaveBeenCalledWith(xPositionTest, yPositionTest, {
            type: TileType.Grass,
            containedItem: {
                type: ItemType.StartingPoint,
                name: ITEM_NAMES.startingPoint,
                description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.attributeEditor1],
                xPosition: xPositionTest,
                yPosition: yPositionTest,
            },
            isEntryPoint: true,
        });
    });
    it(' should remove the item correctly', () => {
        service.removeItem(xPositionTest, yPositionTest, ITEM_NAMES.attributeEditor2);
        expect(boardGameManagerServiceSpy.updateTile).toHaveBeenCalledWith(xPositionTest, yPositionTest, {
            type: TileType.Grass,
            containedItem: undefined,
        });

        expect(boardGameManagerServiceSpy.updateItemAvailability).toHaveBeenCalledWith(standardItem.name, true);
    });
});
