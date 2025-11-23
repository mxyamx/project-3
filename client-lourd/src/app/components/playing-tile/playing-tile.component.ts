import { Component, inject, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerElementComponent } from '@app/components/player-element/player-element.component';
import { PlayingItemComponent } from '@app/components/playing-item/playing-item.component';
import { FROM_TILE_TYPE_TO_IMAGE } from '@app/constants/objects-constants';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { TileType } from '@common/enums/tile-type';
import { EmoteType } from '@common/enums/emote-type';
import { Position } from '@common/position';
import { Tile } from '@common/tile';
import { TranslatePipe } from '@ngx-translate/core';


@Component({
    selector: 'app-playing-tile',
    imports: [CommonModule, PlayingItemComponent, PlayerElementComponent, TranslatePipe],
    templateUrl: './playing-tile.component.html',
    styleUrl: './playing-tile.component.scss',
})
export class PlayingTileComponent {
    @Input() tile: Tile = { type: TileType.Grass };

    @Input() xPosition: number;
    @Input() yPosition: number;
    private imageHashMap: { [key in TileType]: string } = FROM_TILE_TYPE_TO_IMAGE;
    private gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

    getTileImage(tile: Tile): string {
        if (tile.type === TileType.Door) {
            return tile.doorState ? 'assets/tiles/porteOuverte.jpg' : 'assets/tiles/porteFermee.jpg';
        }
        return this.imageHashMap[tile.type];
    }

    mouseDownOnItem(event: MouseEvent): void {
        if (event.button === 2) event.preventDefault();
    }

    showEmoteMenu = false;

    emotes = [
        { type: EmoteType.Happy, icon: '😊' },
        { type: EmoteType.Sad, icon: '😢' },
        { type: EmoteType.Angry, icon: '😠' },
        { type: EmoteType.Laugh, icon: '😂' },
        { type: EmoteType.ThumbUp, icon: '👍' },
        { type: EmoteType.ThumbDown, icon: '👎' },
    ];

    mouseDownOnPlayer(event: MouseEvent): void {
        if (event.button === 2) {
            event.preventDefault();

            const current = this.gameSessionManager.chosenPlayer();
            if (!this.tile.containedPlayer || current.userId !== this.tile.containedPlayer.userId) {
                return;
            }

            this.showEmoteMenu = true;

            
            setTimeout(() => {
                const closeMenu = () => {
                    this.showEmoteMenu = false;
                    document.removeEventListener('click', closeMenu);
                };
                document.addEventListener('click', closeMenu);
            }, 100);
        }
    }


    onEmoteClick(emoteType: EmoteType, event: MouseEvent): void {
        console.log('🖱️ [onEmoteClick] Clic sur emote !');
        console.log('   Emote choisie:', emoteType);
        console.log('   Joueur actuel:', this.gameSessionManager.chosenPlayer().name);
        console.log('   UserId:', this.gameSessionManager.chosenPlayer().userId);

        event.stopPropagation();

        console.log('   📤 Envoi de l\'emote via sendEmote...');
        this.gameSessionManager.sendEmote(emoteType);

        this.showEmoteMenu = false;
        console.log('   Menu fermé');
    }

    getEmoteIcon(emoteType: EmoteType | null | undefined): string {
        if (!emoteType) return '';
        const emote = this.emotes.find((e) => e.type === emoteType);
        return emote?.icon || '';
    }


    tileIsStartingPosition(): boolean {
        const tilePosition: Position = { x: this.xPosition, y: this.yPosition };
        return JSON.stringify(this.gameSessionManager.chosenPlayer().startPosition) === JSON.stringify(tilePosition);
    }
    ngDoCheck(): void {
    
    if (this.tile.containedPlayer?.currentEmote) {
        console.log('🔍 [ngDoCheck] Emote détectée sur tuile !');
        console.log('   Position:', `[${this.xPosition},${this.yPosition}]`);
        console.log('   Joueur:', this.tile.containedPlayer.name);
        console.log('   Emote:', this.tile.containedPlayer.currentEmote);
        
     
        this.cdr.detectChanges();
    }
}
}
