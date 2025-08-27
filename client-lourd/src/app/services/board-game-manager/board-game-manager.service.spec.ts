import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
    FROM_ITEM_NAME_TO_DESCRIPTION,
    ITEM_NAMES,
    NB_ITEM_LARGE_MAP,
    NB_ITEM_MEDIUM_MAP,
    NB_ITEM_SMALL_MAP,
} from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { ItemInfoContainer } from '@common/item-info-container';
import { Tile } from '@common/tile';

describe('BoardGameManagerService', () => {
    let service: BoardGameManagerService;
    let standardBoardGame: BoardGame;
    let standardTile: Tile;
    let xPositionTest: number;
    let yPositionTest: number;

    beforeEach(() => {
        TestBed.configureTestingModule({});

        standardTile = { type: TileType.Wall };
        xPositionTest = 0;
        yPositionTest = 0;
        standardBoardGame = {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spyBoardGame: any = signal<BoardGame>(standardBoardGame);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spyPlayingBoard: any = signal<BoardGame>(standardBoardGame);
        service = TestBed.inject(BoardGameManagerService);
        service.editedBoardGame = spyBoardGame;
        service.playingBoardGame = spyPlayingBoard;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should update correctly the loaded boardGame', () => {
        standardBoardGame.name = 'test1';
        standardBoardGame.description = 'test2';

        service.updateLoadedBoardGame(standardBoardGame);

        expect(service.editedBoardGame()).toEqual(standardBoardGame);
    });

    it('should update correctly the boardGame', () => {
        standardBoardGame.name = 'test1';
        standardBoardGame.description = 'test2';

        service.updateDisplayedBoardGame(standardBoardGame);

        expect(service.editedBoardGame()).toEqual(standardBoardGame);
    });

    it('should update correctly the description and the name of the board game', () => {
        const descriptionTest = 'test description';
        const nameTest = 'test name';
        service.updateDescription(descriptionTest);
        service.updateName(nameTest);

        expect(service.editedBoardGame().description).toEqual(descriptionTest);
        expect(service.editedBoardGame().name).toEqual(nameTest);
    });

    it('should update the right tile without affecting the others', () => {
        yPositionTest = 2;
        service.updateTile(xPositionTest, yPositionTest, standardTile);

        expect(service.editedBoardGame().tiles[xPositionTest][yPositionTest]).toEqual(standardTile);
        expect(service.editedBoardGame().tiles[0][0]).toEqual(standardBoardGame.tiles[0][0]);
        expect(service.editedBoardGame().tiles[0][1]).toEqual(standardBoardGame.tiles[0][1]);
    });

    it('should return the correct board game', () => {
        const newBoard: BoardGame = service.getBoardGame();

        expect(newBoard).toEqual(standardBoardGame);
    });

    it('it should update correctly  the amount of item availability', () => {
        standardBoardGame.itemInfos = service.itemInfoGenerator(BoardGameSize.Small, true);
        service.updateDisplayedBoardGame(standardBoardGame);

        let itemName: string = ITEM_NAMES.flag;
        let initialAvailability: number | undefined = service.editedBoardGame().itemInfos?.find((item) => item.item.name === itemName)?.available;

        service.updateItemAvailability(itemName, true);

        let updatedAvailability = service.editedBoardGame().itemInfos?.find((item) => item.item.name === itemName)?.available;
        if (initialAvailability) {
            expect(updatedAvailability).toEqual(initialAvailability + 1);
        }

        itemName = ITEM_NAMES.attributeEditor1;
        initialAvailability = service.editedBoardGame().itemInfos?.find((item) => item.item.name === itemName)?.available;

        service.updateItemAvailability(itemName, false);

        updatedAvailability = service.editedBoardGame().itemInfos?.find((item) => item.item.name === itemName)?.available;
        if (initialAvailability) {
            expect(updatedAvailability).toEqual(initialAvailability - 1);
        }
    });

    it('should generate a grid of tiles with correct size and grass type for different map sizes', () => {
        const mapSizes: BoardGameSize[] = [BoardGameSize.Small, BoardGameSize.Medium, BoardGameSize.Large]; // Define map sizes to test

        mapSizes.forEach((mapSize) => {
            const result = service.tileGenerator(mapSize);
            expect(result.length).toEqual(mapSize);
            expect(result[0].length).toEqual(mapSize);
            expect(result[0][0].type).toEqual(TileType.Grass);
        });
    });

    it('should generate correct item info for different map sizes and flag availability', () => {
        const mapSizes: BoardGameSize[] = [BoardGameSize.Small, BoardGameSize.Medium, BoardGameSize.Large]; // Define map sizes to test
        const flagValues: boolean[] = [true, false];

        mapSizes.forEach((mapSize) => {
            flagValues.forEach((flag) => {
                const result = service.itemInfoGenerator(mapSize, flag);

                result.forEach((itemInfo) => {
                    if (itemInfo.item.type === ItemType.StartingPoint || itemInfo.item.type === ItemType.RandomItem) {
                        let nbElements: number;
                        if (mapSize === BoardGameSize.Small) {
                            nbElements = NB_ITEM_SMALL_MAP;
                        } else if (mapSize === BoardGameSize.Medium) {
                            nbElements = NB_ITEM_MEDIUM_MAP;
                        } else {
                            nbElements = NB_ITEM_LARGE_MAP;
                        }
                        expect(itemInfo.available).toEqual(nbElements);
                    } else if (itemInfo.item.type !== ItemType.Flag) {
                        expect(itemInfo.available).toEqual(1);
                    }
                });

                const flagItemInfo: ItemInfoContainer | undefined = result.find((itemInfo) => itemInfo.item.name === ITEM_NAMES.flag);
                if (flag) {
                    expect(flagItemInfo?.available).toEqual(1);
                } else {
                    expect(flagItemInfo?.available).toEqual(0);
                }
            });
        });
    });
    it('should update correctly the playing Board', () => {
        standardBoardGame.name = 'test1';
        standardBoardGame.description = 'test2';

        service.updateDisplayedBoardGame(standardBoardGame, true);

        expect(service.playingBoardGame()).toEqual(standardBoardGame);
    });
    it('should update correctly the playing board tiles', () => {
        standardBoardGame.name = 'test1';
        standardBoardGame.description = 'test2';

        service.updateTiles([[standardTile]], true);

        expect(service.playingBoardGame().tiles).toEqual([[standardTile]]);
    });
    it('should update correctly the edited board tiles', () => {
        standardBoardGame.name = 'test1';
        standardBoardGame.description = 'test2';

        service.updateTiles([[standardTile]], false);

        expect(service.editedBoardGame().tiles).toEqual([[standardTile]]);
    });
    it('should update the right tile without affecting the others for the playing board', () => {
        yPositionTest = 2;
        service.updateTile(xPositionTest, yPositionTest, standardTile, true);

        expect(service.playingBoardGame().tiles[xPositionTest][yPositionTest]).toEqual(standardTile);
        expect(service.playingBoardGame().tiles[0][0]).toEqual(standardBoardGame.tiles[0][0]);
        expect(service.playingBoardGame().tiles[0][1]).toEqual(standardBoardGame.tiles[0][1]);
    });
});
