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

    onDepositTorch(): void {
        if (!this.canDepositTorch()) {
            return;
        }

        this.gameSessionManager.depositTorch();
    }

    canDepositTorch(): boolean {
        const player = this.gameSessionManager.chosenPlayer();

        // Check 1: Must be player's turn
        if (player.name !== this.gameSessionManager.activePlayer().name) {
            return false;
        }

        // Check 2: Must have a torch in inventory
        const hasTorch = player.inventory?.some((item) => item.name === ItemName.Torch);
        if (!hasTorch) {
            return false;
        }

        // Check 3: Must have a valid position
        const position = player.position;
        if (!position) {
            return false;
        }

        // Check 4: Must be on a valid tile type (grass, water, or ice)
        const tiles = this.boardGameManager.playingBoardGame().tiles;

        // Validate position is within bounds
        if (position.x < 0 || position.x >= tiles.length || position.y < 0 || position.y >= tiles[0].length) {
            return false;
        }

        const tile = tiles[position.x][position.y];

        const validTileTypes = [TileType.Grass, TileType.Water, TileType.Ice];
        if (!validTileTypes.includes(tile.type)) {
            return false;
        }

        // Check 5: Tile must be empty (no item already present)
        if (tile.containedItem) {
            return false;
        }

        return true;
    }

    getDepositTorchTooltip(): string {
        const player = this.gameSessionManager.chosenPlayer();

        if (player.name !== this.gameSessionManager.activePlayer().name) {
            return 'Not your turn';
        }

        const hasTorch = player.inventory?.some((item) => item.name === ItemName.Torch);
        if (!hasTorch) {
            return 'No torch in inventory';
        }

        const position = player.position;
        if (!position) {
            return 'Invalid position';
        }

        const tiles = this.boardGameManager.playingBoardGame().tiles;
        if (position.x < 0 || position.x >= tiles.length || position.y < 0 || position.y >= tiles[0].length) {
            return 'Invalid position';
        }

        const tile = tiles[position.x][position.y];

        const validTileTypes = [TileType.Grass, TileType.Water, TileType.Ice];
        if (!validTileTypes.includes(tile.type)) {
            return 'Can only deposit on grass, water, or ice tiles';
        }

        if (tile.containedItem) {
            return 'Tile already has an item';
        }

        return 'Deposit torch on current tile';
    }
}
