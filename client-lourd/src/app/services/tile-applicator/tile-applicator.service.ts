import { inject, Injectable } from '@angular/core';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { TileType } from '@common/enums/tile-type';
import { Tile } from '@common/tile';

@Injectable({
    providedIn: 'root',
})
export class TileApplicatorService {
    boardManager: BoardGameManagerService = inject(BoardGameManagerService);
    isActivated: boolean = false;
    currentTileType: TileType;
    mouseClicked: boolean = false;
    rightButtonPressed: boolean = false;

    activate(tileType: TileType): void {
        this.isActivated = true;
        this.currentTileType = tileType;
    }

    deactivate(): void {
        this.isActivated = false;
        this.currentTileType = TileType.Grass;
    }

    changeTile(xPosition: number, yPosition: number, tileType: TileType): void {
        const newTile: Tile = structuredClone(this.boardManager.editedBoardGame().tiles[xPosition][yPosition]);
        newTile.type = tileType;
        this.boardManager.updateTile(xPosition, yPosition, newTile);
    }

    resetTile(xPosition: number, yPosition: number): void {
        this.deactivate();
        this.changeTile(xPosition, yPosition, TileType.Grass);
    }

    toggleDoorState(xPosition: number, yPosition: number): void {
        const newTile: Tile = structuredClone(this.boardManager.editedBoardGame().tiles[xPosition][yPosition]);
        newTile.doorState = !newTile.doorState;

        this.boardManager.updateTile(xPosition, yPosition, newTile);
    }
}
