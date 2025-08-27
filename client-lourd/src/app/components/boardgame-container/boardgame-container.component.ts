import { Component, inject, Signal } from '@angular/core';
import { TileElementComponent } from '@app/components/tile-element/tile-element.component';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { ItemApplicatorService } from '@app/services/item-applicator/item-applicator.service';
import { TileApplicatorService } from '@app/services/tile-applicator/tile-applicator.service';
import { restrictEvent } from '@app/utils/functions/dom-related-functions';
import { BoardGame } from '@common/board-game';
import { TileType } from '@common/enums/tile-type';
import { Tile } from '@common/tile';

@Component({
    selector: 'app-boardgame-container',
    imports: [TileElementComponent],
    templateUrl: './boardgame-container.component.html',
    styleUrl: './boardgame-container.component.scss',
})
export class BoardgameContainerComponent {
    boardgame: Signal<BoardGame>;

    private displayedBoardManager: BoardGameManagerService = inject(BoardGameManagerService);
    private tileApplicator: TileApplicatorService = inject(TileApplicatorService);
    private itemApplicator: ItemApplicatorService = inject(ItemApplicatorService);
    private itemRecentlyRemoved: boolean;

    constructor() {
        this.boardgame = this.displayedBoardManager.editedBoardGame.asReadonly();
        this.itemRecentlyRemoved = false;
    }

    changeTile(event: MouseEvent, xPosition: number, yPosition: number): void {
        restrictEvent(event);

        const tileType: TileType = this.tileApplicator.currentTileType;

        if (event.button === 2) {
            this.resetTile(event, xPosition, yPosition);
            return;
        }

        if (!this.tileApplicator.isActivated) {
            return;
        }

        this.tileApplicator.mouseClicked = true;
        const targetTile: Tile = structuredClone(this.boardgame().tiles[xPosition][yPosition]);

        if (targetTile.containedItem) {
            if (tileType === TileType.Door || tileType === TileType.Wall) {
                this.itemApplicator.removeItem(xPosition, yPosition, targetTile.containedItem?.name);
                this.itemRecentlyRemoved = true;
            }
        }

        if (tileType === targetTile.type) {
            if (tileType === TileType.Door) {
                this.tileApplicator.toggleDoorState(xPosition, yPosition);
                return;
            }
            return;
        }

        this.tileApplicator.changeTile(xPosition, yPosition, tileType);
    }

    onMouseEnterTile(event: MouseEvent, xPosition: number, yPosition: number): void {
        if (this.itemRecentlyRemoved) {
            this.itemRecentlyRemoved = false;
            return;
        }
        if (this.tileApplicator.mouseClicked) {
            this.changeTile(event, xPosition, yPosition);
        } else if (this.tileApplicator.rightButtonPressed) {
            this.resetTile(event, xPosition, yPosition);
        }
    }

    resetTile(event: Event, xPosition: number, yPosition: number): void {
        event.preventDefault();

        if (this.boardgame().tiles[xPosition][yPosition].type === TileType.Grass) {
            this.tileApplicator.deactivate();
            return;
        }

        this.tileApplicator.resetTile(xPosition, yPosition);
    }

    mouseDownOnTile(event: MouseEvent, xPosition: number, yPosition: number): void {
        restrictEvent(event);

        if (event.button === 2) {
            this.tileApplicator.rightButtonPressed = true;
            this.resetTile(event, xPosition, yPosition);
        } else {
            this.changeTile(event, xPosition, yPosition);
        }
    }
}
