import { Injectable, inject } from '@angular/core';
import { FROM_ITEM_NAME_TO_DESCRIPTION } from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { ItemName } from '@common/enums/item-name';
import { ItemType } from '@common/enums/item-type';
import { Item } from '@common/item';
import { Tile } from '@common/tile';
@Injectable({
    providedIn: 'root',
})
export class ItemApplicatorService {
    isActivated: boolean;
    currentItemSelected: Item;

    positionedItemSelected: boolean;
    xPositionLastItem: number;
    yPositionLastItem: number;

    private boardManager: BoardGameManagerService = inject(BoardGameManagerService);

    constructor() {
        this.isActivated = false;
        this.currentItemSelected = {
            type: ItemType.ConditionBased,
            name: ItemName.ConditionBased1,
            description: FROM_ITEM_NAME_TO_DESCRIPTION[ItemName.ConditionBased1],
        };
        this.positionedItemSelected = false;
        this.xPositionLastItem = 0;
        this.yPositionLastItem = 0;
    }

    activate(newType: Item): void {
        this.isActivated = true;
        this.currentItemSelected = newType;
    }

    deactivate(): void {
        this.isActivated = false;
        this.positionedItemSelected = false;
    }

    positionItem(xPosition: number, yPosition: number, newItem: Item, updateBoardGame: boolean): void {
        const newTile: Tile = structuredClone(this.boardManager.editedBoardGame().tiles[xPosition][yPosition]);
        newItem.xPosition = xPosition;
        newItem.yPosition = yPosition;
        newTile.containedItem = newItem;

        newTile.isEntryPoint = false;
        if (newItem.type === ItemType.StartingPoint) {
            newTile.isEntryPoint = true;
        }

        this.boardManager.updateTile(xPosition, yPosition, newTile);
        if (updateBoardGame) this.boardManager.updateItemAvailability(newItem.name, false);
        this.deactivate();
    }

    removeItem(xPosition: number, yPosition: number, itemName: string): void {
        const newTile: Tile = structuredClone(this.boardManager.editedBoardGame().tiles[xPosition][yPosition]);
        newTile.containedItem = undefined;

        this.boardManager.updateTile(xPosition, yPosition, newTile);
        this.boardManager.updateItemAvailability(itemName, true);
    }
}
