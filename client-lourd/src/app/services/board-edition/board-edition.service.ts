import { inject, Injectable } from '@angular/core';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { HttpBoardGameService } from '@app/services/http-manager/http-board-game.service';
import { ItemApplicatorService } from '@app/services/item-applicator/item-applicator.service';
import { PreviewImageGenerationService } from '@app/services/preview-image-generation/preview-image-generation.service';
import { TileApplicatorService } from '@app/services/tile-applicator/tile-applicator.service';
import { BoardGame } from '@common/board-game';
import { TileType } from '@common/enums/tile-type';

@Injectable({
    providedIn: 'root',
})
export class BoardEditionService {
    private boardgameManager: BoardGameManagerService = inject(BoardGameManagerService);
    private httpBoardGameService: HttpBoardGameService = inject(HttpBoardGameService);
    private previewImageGenerationService: PreviewImageGenerationService = inject(PreviewImageGenerationService);
    private itemApplicator: ItemApplicatorService = inject(ItemApplicatorService);
    private tileApplicator: TileApplicatorService = inject(TileApplicatorService);

    manageTileApplicator(tileType: TileType): void {
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
                this.httpBoardGameService.updateBoard(newBoard).subscribe();
            },
            error: () => {
                this.httpBoardGameService.createBoard(newBoard).subscribe();
            },
        });
    }

    private async modifyBoard(): Promise<BoardGame> {
        const previewImage = await this.previewImageGenerationService.generatePreviewImage(this.boardgameManager.editedBoardGame().tiles);
        return {
            ...this.boardgameManager.editedBoardGame(),
            previewImage,
            visibility: false,
            name: this.boardgameManager.editedBoardGame().name.trim().replace(/\s+/g, ' '),
        };
    }
}
