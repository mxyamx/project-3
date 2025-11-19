import { NgClass } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { ItemElementComponent } from '@app/components/item-element/item-element.component';
import { FROM_TILE_TYPE_TO_IMAGE } from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { ItemApplicatorService } from '@app/services/item-applicator/item-applicator.service';
import { TeleportationManagerService } from '@app/services/teleportation-manager/teleportation-manager.service';
import { TileApplicatorService } from '@app/services/tile-applicator/tile-applicator.service';
import { restrictEvent } from '@app/utils/functions/dom-related-functions';
import { BoardGameSize } from '@common/enums/board-game-size';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';
import { Tile } from '@common/tile';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-tile-element',
    imports: [ItemElementComponent, TranslatePipe, NgClass],
    templateUrl: './tile-element.component.html',
    styleUrl: './tile-element.component.scss',
})
export class TileElementComponent {
    @Input() tile: Tile = { type: TileType.Grass };
    @Input() xPosition: number;
    @Input() yPosition: number;

    showItemLimitWarning: boolean = false;

    private imageHashMap: { [key in TileType]: string } = FROM_TILE_TYPE_TO_IMAGE;
    private boardManager: BoardGameManagerService = inject(BoardGameManagerService);
    private itemApplicatorService: ItemApplicatorService = inject(ItemApplicatorService);
    private tileApplicatorService: TileApplicatorService = inject(TileApplicatorService);
    private teleportationManager: TeleportationManagerService = inject(TeleportationManagerService);

    get itemApplicator(): ItemApplicatorService {
        return this.itemApplicatorService;
    }

    get tileApplicator(): TileApplicatorService {
        return this.tileApplicatorService;
    }

    getTileImage(tile: Tile): string {
        if (tile.type === TileType.Door) {
            return tile.doorState ? 'assets/tiles/porteOuverte.jpg' : 'assets/tiles/porteFermee.jpg';
        }
        return this.imageHashMap[tile.type];
    }

    getTeleporterPairNumber(): string | null {
        if (this.tile.type === TileType.Teleportation && this.tile.teleportPairId) {
            return this.tile.teleportPairId.replace('tp-', '');
        }
        return null;
    }

    getTeleporterColor(): string {
        if (this.tile.type === TileType.Teleportation && this.tile.teleportPairId) {
            return this.teleportationManager.getPairColor(this.tile.teleportPairId);
        }
        return '#FFFFFF';
    }

    isTeleportationWaitingForSecond(): boolean {
        return this.teleportationManager.isWaitingForSecondTeleport();
    }

    isFirstTeleportTile(): boolean {
        const firstPos = this.teleportationManager.firstTeleportPosition();
        return firstPos !== null && firstPos.x === this.xPosition && firstPos.y === this.yPosition;
    }

    mouseDownOnTile(event: MouseEvent): void {
        if (event.button === 2) {
            // Right click
            this.rightClickOnTile(event);
            return;
        }

        // Left click
        if (this.tileApplicatorService.isActivated) {
            this.tileApplicatorService.mouseClicked = true;
            this.tileApplicatorService.handleTileClick(this.xPosition, this.yPosition);
        }
    }

    mouseEnterTile(): void {
        // Handle tile sliding (not for teleportation)
        if (this.tileApplicatorService.isActivated && this.tileApplicatorService.currentTileType !== TileType.Teleportation) {
            this.tileApplicatorService.handleTileDrag(this.xPosition, this.yPosition);
        }
    }

    mouseUpOnTile(): void {
        if (this.tile.containedItem) {
            return;
        }

        // Handle item placement
        if (this.itemApplicatorService.isActivated) {
            if (this.tile.type === TileType.Grass || this.tile.type === TileType.Ice || this.tile.type === TileType.Water) {
                const currentItem = this.itemApplicatorService.currentItemSelected;

                if (currentItem.type !== ItemType.StartingPoint && currentItem.type !== ItemType.Flag) {
                    if (this.findNumberOfItem() >= this.getItemLimit()) {
                        console.log(`Maximum number of items (${this.getItemLimit()}) reached.`);
                        console.log(`Current number of items: ${this.findNumberOfItem()}`);
                        this.showItemLimitWarning = true;
                        return;
                    }
                }

                if (!this.tile.containedItem) {
                    this.itemApplicatorService.positionItem(this.xPosition, this.yPosition, structuredClone(currentItem), false);
                    this.itemApplicatorService.deactivate();
                }
            }
        }

        this.tileApplicatorService.mouseClicked = false;
    }

    rightClickOnTile(event: Event): void {
        restrictEvent(event);

        // Remove teleport pair or reset tile
        if (this.tile.type === TileType.Teleportation && this.tile.teleportPairId) {
            this.teleportationManager.removeTeleportPair(this.tile.teleportPairId);
        } else if (this.tile.type !== TileType.Grass) {
            this.tileApplicatorService.resetTile(this.xPosition, this.yPosition);
        }

        this.tileApplicatorService.deactivate();
    }

    mouseDownOnItem(event: MouseEvent, item: Item): void {
        if (event.button === 2) {
            this.rightClickOnItem(event);
            return;
        }

        if (this.tileApplicatorService.isActivated) {
            return;
        }

        this.itemApplicatorService.activate(structuredClone(item));
        this.boardManager.updateTile(this.xPosition, this.yPosition, { type: this.tile.type });

        this.itemApplicatorService.positionedItemSelected = true;
        this.itemApplicatorService.xPositionLastItem = this.xPosition;
        this.itemApplicatorService.yPositionLastItem = this.yPosition;
    }

    rightClickOnItem(event: Event): void {
        restrictEvent(event);

        if (this.tile.containedItem) {
            this.itemApplicatorService.removeItem(this.xPosition, this.yPosition, this.tile.containedItem?.name);
        }
        this.itemApplicatorService.deactivate();
    }

    clickOnOk(): void {
        this.showItemLimitWarning = false;
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

    protected getItemLimit(): number {
        const size = this.boardManager.editedBoardGame().size;
        switch (size) {
            case BoardGameSize.Small:
                return 2;
            case BoardGameSize.Medium:
                return 4;
            case BoardGameSize.Large:
                return 6;
            default:
                return 0;
        }
    }
}
