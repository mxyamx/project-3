import { Component, inject, Input } from '@angular/core';
import { PlayerElementComponent } from '@app/components/player-element/player-element.component';
import { PlayingItemComponent } from '@app/components/playing-item/playing-item.component';
import { FROM_TILE_TYPE_TO_IMAGE } from '@app/constants/objects-constants';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { TileType } from '@common/enums/tile-type';
import { Position } from '@common/position';
import { Tile } from '@common/tile';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-playing-tile',
    imports: [PlayingItemComponent, PlayerElementComponent, TranslatePipe],
    templateUrl: './playing-tile.component.html',
    styleUrl: './playing-tile.component.scss',
})
export class PlayingTileComponent {
    @Input() tile: Tile = { type: TileType.Grass };

    @Input() xPosition: number;
    @Input() yPosition: number;
    private imageHashMap: { [key in TileType]: string } = FROM_TILE_TYPE_TO_IMAGE;
    private gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);

    getTileImage(tile: Tile): string {
        if (tile.type === TileType.Door) {
            return tile.doorState ? 'assets/tiles/porteOuverte.jpg' : 'assets/tiles/porteFermee.jpg';
        }
        return this.imageHashMap[tile.type];
    }

    mouseDownOnItem(event: MouseEvent): void {
        if (event.button === 2) event.preventDefault();
    }
    mouseDownOnPlayer(event: MouseEvent): void {
        if (event.button === 2) event.preventDefault();
    }

    tileIsStartingPosition(): boolean {
        const tilePosition: Position = { x: this.xPosition, y: this.yPosition };
        return JSON.stringify(this.gameSessionManager.chosenPlayer().startPosition) === JSON.stringify(tilePosition);
    }
}
