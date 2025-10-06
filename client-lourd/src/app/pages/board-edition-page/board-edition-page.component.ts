import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import { BoardgameContainerComponent } from '@app/components/boardgame-container/boardgame-container.component';
import { SaveBoardDialogComponent } from '@app/components/save-board-dialog/save-board-dialog.component';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { HttpBoardGameService } from '@app/services/http-manager/http-board-game.service';
import { ItemApplicatorService } from '@app/services/item-applicator/item-applicator.service';
import { TileApplicatorService } from '@app/services/tile-applicator/tile-applicator.service';

import {
    followerData,
    FROM_ITEM_NAME_TO_DESCRIPTION,
    FROM_ITEM_TO_IMAGE,
    FROM_TILE_TYPE_TO_DESCRIPTION,
    FROM_TILE_TYPE_TO_IMAGE,
} from '@app/constants/objects-constants';
import { PreviewImageGenerationService } from '@app/services/preview-image-generation/preview-image-generation.service';
import { restrictEvent } from '@app/utils/functions/dom-related-functions';
import { BoardGame } from '@common/board-game';
import { TileType } from '@common/enums/tile-type';
import { UrlPage } from '@common/enums/url-page';
import { Item } from '@common/item';
import { Tile } from '@common/tile';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-board-edition-page',
    imports: [BoardgameContainerComponent, MatDialogModule, MatButtonModule, RouterLink, TranslatePipe],
    templateUrl: './board-edition-page.component.html',
    styleUrl: './board-edition-page.component.scss',
})
export class BoardEditionPageComponent {
    hoveredTile: Tile | null = null;
    hoveredItem: Item | null = null;
    mouseX: number = 0;
    mouseY: number = 0;

    tiles: Tile[] = [
        { type: TileType.Wall, image: FROM_TILE_TYPE_TO_IMAGE[TileType.Wall], description: FROM_TILE_TYPE_TO_DESCRIPTION[TileType.Wall] },
        {
            type: TileType.Door,
            image: FROM_TILE_TYPE_TO_IMAGE[TileType.Door],
            doorState: false,
            description: FROM_TILE_TYPE_TO_DESCRIPTION[TileType.Door],
        },
        {
            type: TileType.Water,
            image: FROM_TILE_TYPE_TO_IMAGE[TileType.Water],
            isAccessible: false,
            description: FROM_TILE_TYPE_TO_DESCRIPTION[TileType.Water],
        },
        { type: TileType.Ice, image: FROM_TILE_TYPE_TO_IMAGE[TileType.Ice], description: FROM_TILE_TYPE_TO_DESCRIPTION[TileType.Ice] },
    ];

    private tileApplicator: TileApplicatorService = inject(TileApplicatorService);
    private itemApplicator: ItemApplicatorService = inject(ItemApplicatorService);
    private boardgameManager: BoardGameManagerService = inject(BoardGameManagerService);
    private httpBoardGameService: HttpBoardGameService = inject(HttpBoardGameService);
    private previewImageGenerationService: PreviewImageGenerationService = inject(PreviewImageGenerationService);

    private itemImageCorrespondance: { [key: string]: string };
    private itemDescriptionCorrespondance: { [key: string]: string };

    constructor(
        private router: Router,
        private dialog: MatDialog,
    ) {
        this.itemImageCorrespondance = FROM_ITEM_TO_IMAGE;
        this.itemDescriptionCorrespondance = FROM_ITEM_NAME_TO_DESCRIPTION;
    }

    get itemApplicatorService(): ItemApplicatorService {
        return this.itemApplicator;
    }

    get tileApplicatorService(): TileApplicatorService {
        return this.tileApplicator;
    }

    get itemImage(): { [key: string]: string } {
        return this.itemImageCorrespondance;
    }

    get itemDescription(): { [key: string]: string } {
        return this.itemDescriptionCorrespondance;
    }

    get boardManager(): BoardGameManagerService {
        return this.boardgameManager;
    }

    tileOnMouseEnter(tile: Tile) {
        this.hoveredTile = tile;
    }

    tileOnMouseLeave() {
        this.hoveredTile = null;
    }

    itemOnMouseEnter(item: Item) {
        this.hoveredItem = item;
    }

    itemOnMouseLeave() {
        this.hoveredItem = null;
    }

    onMouseLeavePage() {
        const mouseupSim: MouseEvent = new MouseEvent('mouseup', {
            button: this.tileApplicator.rightButtonPressed ? 2 : 0,
        });
        this.mouseUpOnMainDiv(mouseupSim);
    }

    onMouseMove(event: MouseEvent): void {
        this.mouseX = event.clientX - followerData.followerWidth / 2;
        this.mouseY = event.clientY - followerData.followerHeight / 2;
    }
    onInputDescription(event: Event): void {
        const target = event.target as HTMLTextAreaElement;
        this.boardgameManager.updateDescription(target.value);
    }

    onInputName(event: Event): void {
        const target = event.target as HTMLTextAreaElement;
        this.boardgameManager.updateName(target.value);
    }

    manageTileApplicator(event: Event, tileType: TileType): void {
        restrictEvent(event);
        if (this.tileApplicator.isActivated && tileType === this.tileApplicator.currentTileType) {
            this.tileApplicator.deactivate();
            return;
        }

        this.itemApplicator.deactivate();
        this.tileApplicator.activate(tileType);
    }
    async saveBoard(): Promise<void> {
        const newBoard = await this.modifyBoard();
        const boardId = this.boardgameManager.editedBoardGame().id;

        this.httpBoardGameService.getBoard(boardId).subscribe({
            next: () => {
                this.httpBoardGameService.updateBoard(newBoard).subscribe({
                    next: () => {
                        this.openDialog('Enregistrement reussit!', true);
                    },
                    error: (error) => this.openDialog(error.message, false),
                });
            },
            error: () => {
                this.httpBoardGameService.createBoard(newBoard).subscribe({
                    next: () => {
                        this.openDialog('Enregistrement reussit!', true);
                    },
                    error: (error) => this.openDialog(error.message, false),
                });
            },
        });
    }

    openDialog(message: string, success: boolean): void {
        const dialogRef = this.dialog.open(SaveBoardDialogComponent, {
            width: '300px',
            data: { message, success },
        });

        dialogRef.afterClosed().subscribe(() => {
            if (success) {
                this.router.navigate([UrlPage.Admin]);
            }
        });
    }

    activateItemApplicator(event: MouseEvent, newItem: Item): void {
        restrictEvent(event);

        if (event.button === 2) {
            return;
        }

        this.tileApplicator.deactivate();
        this.itemApplicator.activate(structuredClone(newItem));
        this.boardgameManager.updateItemAvailability(newItem.name, false);
    }

    mouseUpOnMainDiv(event: MouseEvent): void {
        if (event.button === 0) {
            this.tileApplicator.mouseClicked = false;
        } else if (event.button === 2) {
            this.tileApplicator.rightButtonPressed = false;
        }

        this.deactivateItemApplicator();
    }

    mouseUpOnItemSection(item: Item): void {
        if (this.itemApplicator.isActivated) {
            if (this.itemApplicator.positionedItemSelected) {
                if (this.itemApplicator.currentItemSelected.type === item.type && this.itemApplicator.currentItemSelected.name === item.name) {
                    this.itemApplicator.positionedItemSelected = false;
                }
            }
        }
    }

    reinitialize(): void {
        this.boardgameManager.updateDisplayedBoardGame(structuredClone(this.boardgameManager.loadedBoardGame()));
        this.tileApplicator.deactivate();
        this.itemApplicator.deactivate();
    }

    private async generatePreview(): Promise<string> {
        const tiles = this.boardgameManager.editedBoardGame().tiles;
        const preview = await this.previewImageGenerationService.generatePreviewImage(tiles);
        return preview;
    }

    private async modifyBoard(): Promise<BoardGame> {
        const previewImage = await this.generatePreview();
        return {
            ...this.boardgameManager.editedBoardGame(),
            previewImage,
            visibility: false,
            name: this.boardgameManager.editedBoardGame().name.trim().replace(/\s+/g, ' '),
            description: this.boardgameManager.editedBoardGame().description.trim().replace(/\s+/g, ' '),
        };
    }

    private deactivateItemApplicator(): void {
        if (this.itemApplicator.isActivated) {
            if (this.itemApplicator.positionedItemSelected) {
                this.itemApplicator.positionItem(
                    this.itemApplicator.xPositionLastItem,
                    this.itemApplicator.yPositionLastItem,
                    this.itemApplicator.currentItemSelected,
                    false,
                );
            } else {
                this.boardgameManager.updateItemAvailability(this.itemApplicator.currentItemSelected.name, true);
            }

            this.itemApplicator.deactivate();
        }
    }
}
