import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FROM_ITEM_TO_IMAGE_ON_BOARD, TORCH_ASSETS } from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { ItemName } from '@common/enums/item-name';
import { TileType } from '@common/enums/tile-type';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-inventory',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './inventory.component.html',
    styleUrl: './inventory.component.scss',
})
export class InventoryComponent {
    protected boardGameManager: BoardGameManagerService = inject(BoardGameManagerService);
    protected gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);

    getItemImageCorrespondance(): { [key: string]: string } {
        return FROM_ITEM_TO_IMAGE_ON_BOARD;
    }

    /**
     * Get the correct item image, with special handling for torch based on player's tile
     */
    getItemImage(itemName: string): string {
        // Special handling for torch - check if player is on water/ice
        if (itemName === ItemName.Torch) {
            const player = this.gameSessionManager.chosenPlayer();
            if (player && player.position) {
                // Access tiles through boardGameManager
                const tiles = this.boardGameManager.playingBoardGame().tiles;
                const pos = player.position;

                // Check if position is valid
                if (pos.x >= 0 && pos.x < tiles.length && pos.y >= 0 && pos.y < tiles[0].length) {
                    const tileType = tiles[pos.x][pos.y].type;

                    // If player is on water or ice, show extinguished torch
                    if (tileType === TileType.Water || tileType === TileType.Ice) {
                        return TORCH_ASSETS.extinguished;
                    }
                }
            }
            // Otherwise show lit torch
            return TORCH_ASSETS.lit;
        }

        // For all other items, use the standard mapping
        return FROM_ITEM_TO_IMAGE_ON_BOARD[itemName];
    }
}
