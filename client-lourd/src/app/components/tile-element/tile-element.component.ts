import { Component, Input, inject } from '@angular/core';
import { ItemElementComponent } from '@app/components/item-element/item-element.component';
import { FROM_TILE_TYPE_TO_IMAGE, NB_ITEM_LARGE_MAP, NB_ITEM_MEDIUM_MAP, NB_ITEM_SMALL_MAP } from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { ItemApplicatorService } from '@app/services/item-applicator/item-applicator.service';
import { TileApplicatorService } from '@app/services/tile-applicator/tile-applicator.service';
import { restrictEvent } from '@app/utils/functions/dom-related-functions';
import { BoardGameSize } from '@common/enums/board-game-size';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';
import { Tile } from '@common/tile';

@Component({
    selector: 'app-tile-element',
    imports: [ItemElementComponent],
    templateUrl: './tile-element.component.html',
    styleUrl: './tile-element.component.scss',
})
export class TileElementComponent {
    @Input() tile: Tile = { type: TileType.Grass };

    @Input() xPosition: number;
    @Input() yPosition: number;

    showItemLimitWarning: boolean = false;

    private itemApplicator: ItemApplicatorService = inject(ItemApplicatorService);
    private tileApplicator: TileApplicatorService = inject(TileApplicatorService);
    private boardManager: BoardGameManagerService = inject(BoardGameManagerService);

    private imageHashMap: { [key in TileType]: string } = FROM_TILE_TYPE_TO_IMAGE;

    get itemApplicatorService(): ItemApplicatorService {
        return this.itemApplicator;
    }

    get tileApplicatorService(): TileApplicatorService {
        return this.tileApplicator;
    }

    getTileImage(tile: Tile): string {
        if (tile.type === TileType.Door) {
            return tile.doorState ? 'assets/tiles/porteOuverte.jpg' : 'assets/tiles/porteFermee.jpg';
        }
        return this.imageHashMap[tile.type];
    }

    mouseUpOnTile(): void {
        if (this.tile.containedItem) {
            return;
        }
        if (this.itemApplicator.isActivated) {
            if (this.tile.type === TileType.Grass || this.tile.type === TileType.Ice || this.tile.type === TileType.Water) {
                if (
                    this.itemApplicator.currentItemSelected.type !== ItemType.StartingPoint &&
                    this.itemApplicator.currentItemSelected.type !== ItemType.Flag
                ) {
                    if (this.findNumberOfItem() >= this.getItemLimit()) {
                        this.showItemLimitWarning = true;
                        return;
                    }
                }
                if (!this.tile.containedItem) {
                    this.itemApplicator.positionItem(this.xPosition, this.yPosition, structuredClone(this.itemApplicator.currentItemSelected), false);
                    this.itemApplicator.deactivate();
                }
            }
        }
    }

    mouseDownOnItem(event: MouseEvent, item: Item): void {
        if (event.button === 2) {
            this.rightClickOnItem(event);
            return;
        }

        if (this.tileApplicator.isActivated) {
            return;
        }

        this.itemApplicator.activate(structuredClone(item));
        this.boardManager.updateTile(this.xPosition, this.yPosition, { type: this.tile.type });

        this.itemApplicator.positionedItemSelected = true;
        this.itemApplicator.xPositionLastItem = this.xPosition;
        this.itemApplicator.yPositionLastItem = this.yPosition;
    }

    rightClickOnItem(event: Event): void {
        restrictEvent(event);

        if (this.tile.containedItem) {
            this.itemApplicator.removeItem(this.xPosition, this.yPosition, this.tile.containedItem?.name);
        }
        this.itemApplicator.deactivate();
    }

    clickOnOk(): void {
        this.showItemLimitWarning = false;
    }

    protected getItemLimit(): number {
        switch (this.boardManager.editedBoardGame().size) {
            case BoardGameSize.Small: {
                return NB_ITEM_SMALL_MAP;
            }
            case BoardGameSize.Medium: {
                return NB_ITEM_MEDIUM_MAP;
            }
            case BoardGameSize.Large: {
                return NB_ITEM_LARGE_MAP;
            }
        }
    }

    private findNumberOfItem(): number {
        let result = 0;
        const tiles = this.boardManager.editedBoardGame().tiles;
        for (let i = 0; i < this.boardManager.editedBoardGame().size; ++i) {
            for (let j = 0; j < this.boardManager.editedBoardGame().size; ++j) {
                const containedItem = tiles[i][j].containedItem;
                if (containedItem) {
                    if (containedItem.type !== ItemType.Flag && containedItem.type !== ItemType.StartingPoint) {
                        ++result;
                    }
                }
            }
        }
        return result;
    }
}
