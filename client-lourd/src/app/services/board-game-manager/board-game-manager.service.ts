import { Injectable, signal, WritableSignal } from '@angular/core';
import {
    FROM_ITEM_NAME_TO_DESCRIPTION,
    FROM_ITEM_NAME_TO_TYPE,
    ITEM_NAMES,
    MAP_SIZE,
    NB_ITEM_LARGE_MAP,
    NB_ITEM_MEDIUM_MAP,
    NB_ITEM_SMALL_MAP,
} from '@app/constants/objects-constants';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';
import { ItemInfoContainer } from '@common/item-info-container';
import { Tile } from '@common/tile';

@Injectable({
    providedIn: 'root',
})
export class BoardGameManagerService {
    editedBoardGame: WritableSignal<BoardGame> = signal({
        id: '',
        name: 'Default Board Game',
        description: 'This is a default description for the board game.',
        size: BoardGameSize.Medium,
        gameMode: GameMode.Normal,
        tiles: [],
        previewImage: 'assets/preview.png',
        visibility: true,
        lastModified: new Date(),
        itemInfos: [],
    });

    loadedBoardGame: WritableSignal<BoardGame> = signal({
        id: '',
        name: 'Default Board Game',
        description: 'This is a default description for the board game.',
        size: BoardGameSize.Medium,
        gameMode: GameMode.Normal,
        tiles: [],
        previewImage: 'assets/preview.png',
        visibility: true,
        lastModified: new Date(),
        itemInfos: [],
    });

    playingBoardGame: WritableSignal<BoardGame> = signal({
        id: '',
        name: 'Default Board Game',
        description: 'This is a default description for the board game.',
        size: BoardGameSize.Medium,
        gameMode: GameMode.Normal,
        tiles: [],
        previewImage: 'assets/preview.png',
        visibility: true,
        lastModified: new Date(),
        itemInfos: [],
    });

    constructor() {
        const newTiles: Tile[][] = this.tileGenerator(this.editedBoardGame().size);
        this.editedBoardGame.update((curr) => ({ ...curr, tiles: newTiles }));
        this.playingBoardGame.update((curr) => ({ ...curr, tiles: newTiles }));

        const newItemInfos: ItemInfoContainer[] = this.itemInfoGenerator(this.editedBoardGame().size, this.editedBoardGame().gameMode === 'CTF');
        this.editedBoardGame.update((curr) => ({
            ...curr,
            itemInfos: newItemInfos,
        }));
    }

    updateTiles(newTiles: Tile[][], playingPage: boolean) {
        if (playingPage) {
            this.playingBoardGame.update((curr) => ({ ...curr, tiles: newTiles }));
        } else {
            this.editedBoardGame.update((curr) => ({ ...curr, tiles: newTiles }));
        }
    }

    updateLoadedBoardGame(newBoard: BoardGame): void {
        this.loadedBoardGame.set(newBoard);
    }

    updateDisplayedBoardGame(newBoard: BoardGame, playingPage?: boolean): void {
        if (playingPage) {
            this.playingBoardGame.set(newBoard);
        } else {
            this.editedBoardGame.set(newBoard);
        }
    }

    updateDescription(newDescription: string): void {
        this.editedBoardGame.update((curr) => ({ ...curr, description: newDescription }));
    }

    updateName(newName: string): void {
        this.editedBoardGame.update((curr) => ({ ...curr, name: newName }));
    }

    updateTile(xPosition: number, yPosition: number, newTile: Tile, playingPage?: boolean) {
        const newTiles: Tile[][] = this.editedBoardGame().tiles;
        newTiles[xPosition][yPosition] = newTile;
        if (playingPage) {
            this.playingBoardGame.update((curr) => ({ ...curr, tiles: structuredClone(newTiles) }));
        } else {
            this.editedBoardGame.update((curr) => ({ ...curr, tiles: structuredClone(newTiles) }));
        }
    }

    getBoardGame(): BoardGame {
        const copy = structuredClone(this.editedBoardGame());
        return { ...copy };
    }

    updateItemAvailability(name: string, add: boolean): void {
        const newItemInfos: ItemInfoContainer[] | undefined = this.editedBoardGame().itemInfos;

        if (newItemInfos) {
            const index: number = newItemInfos.findIndex((itemInfoContainer) => itemInfoContainer.item.name === name);

            if (add) {
                ++newItemInfos[index].available;
            } else {
                --newItemInfos[index].available;
            }
        }

        this.editedBoardGame.update((curr) => ({ ...curr, itemInfos: structuredClone(newItemInfos) }));
    }

    tileGenerator(mapSize: number): Tile[][] {
        const tiles: Tile[][] = [];
        for (let i = 0; i < mapSize; ++i) {
            const tilesColumn: Tile[] = [];
            for (let j = 0; j < mapSize; ++j) {
                tilesColumn.push({ type: TileType.Grass });
            }
            tiles.push(tilesColumn);
        }
        return tiles;
    }

    itemInfoGenerator(mapSize: number, flag: boolean): ItemInfoContainer[] {
        const itemContainer: ItemInfoContainer[] = [];

        this.registerMultipleItems(itemContainer, mapSize);

        const flagInfoContainer: ItemInfoContainer = {
            item: { type: ItemType.Flag, name: ITEM_NAMES.flag, description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.flag] },
            available: flag ? 1 : 0,
        };
        itemContainer.push(flagInfoContainer);

        return itemContainer;
    }

    private registerMultipleItems(itemContainer: ItemInfoContainer[], mapSize: number) {
        const itemNames: string[] = Object.values(ITEM_NAMES);
        for (let i = 0; i < itemNames.length - 1; ++i) {
            const item: Item = {
                type: FROM_ITEM_NAME_TO_TYPE[itemNames[i]],
                name: itemNames[i],
                description: FROM_ITEM_NAME_TO_DESCRIPTION[itemNames[i]],
            };
            let available: number;
            if (item.type === ItemType.RandomItem || item.type === ItemType.StartingPoint) {
                if (mapSize === MAP_SIZE.large) {
                    available = NB_ITEM_LARGE_MAP;
                } else if (mapSize === MAP_SIZE.medium) {
                    available = NB_ITEM_MEDIUM_MAP;
                } else {
                    available = NB_ITEM_SMALL_MAP;
                }
            } else {
                available = 1;
            }

            const itemInfoContainer: ItemInfoContainer = {
                item,
                available,
            };
            itemContainer.push(itemInfoContainer);
        }
    }
}
