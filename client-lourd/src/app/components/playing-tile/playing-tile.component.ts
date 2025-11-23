import { Component, inject, Input, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
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
export class PlayingTileComponent implements OnChanges {
    @Input() tile: Tile = { type: TileType.Grass };

    @Input() xPosition: number;
    @Input() yPosition: number;
    @Input() forceShowEmoteMenu = false;
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

    getEmoteClass(emoteType: EmoteType | null | undefined): string {
    if (!emoteType) return '';
    
    switch (emoteType) {
        case EmoteType.Happy:
            return 'emote-happy';
        case EmoteType.Sad:
            return 'emote-sad';
        case EmoteType.Angry:
            return 'emote-angry';
        case EmoteType.Laugh:
            return 'emote-laugh';
        case EmoteType.ThumbUp:
            return 'emote-thumbup';
        case EmoteType.ThumbDown:
            return 'emote-thumbdown';
        default:
            return '';
    }
}

    isCurrentPlayerTile(): boolean {
    if (!this.tile.containedPlayer) return false;
    const current = this.gameSessionManager.chosenPlayer();
    return this.tile.containedPlayer.userId === current.userId;
}

toggleEmoteMenu(event?: MouseEvent): void {
    if (event) {
        event.stopPropagation();
    }
    
    this.showEmoteMenu = !this.showEmoteMenu;
    
    if (this.showEmoteMenu) {
        setTimeout(() => {
            const closeMenu = () => {
                this.showEmoteMenu = false;
                document.removeEventListener('click', closeMenu);
            };
            document.addEventListener('click', closeMenu);
        }, 100);
    }
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


ngOnChanges(changes: SimpleChanges): void {
    if (changes['forceShowEmoteMenu']) {
        const currentValue = changes['forceShowEmoteMenu'].currentValue;
        const previousValue = changes['forceShowEmoteMenu'].previousValue;
        
        console.log('🔄 [ngOnChanges] forceShowEmoteMenu changé');
        console.log('   currentValue:', currentValue);
        console.log('   previousValue:', previousValue);
        console.log('   tile.containedPlayer:', this.tile.containedPlayer);
       
        if (currentValue === true && previousValue === false) {
            console.log('   Vérification isCurrentPlayerTile():', this.isCurrentPlayerTile());
            
            if (this.isCurrentPlayerTile()) {
                console.log('   ✅ Ouverture du menu emote');
                this.showEmoteMenu = true;
                
             
                setTimeout(() => {
                    const closeMenu = () => {
                        console.log('   ❌ Fermeture du menu emote (clic extérieur)');
                        this.showEmoteMenu = false;
                        this.cdr.detectChanges();
                        document.removeEventListener('click', closeMenu);
                    };
                    document.addEventListener('click', closeMenu);
                }, 100);
            } else {
                console.log('   ⚠️ Pas la tuile du joueur actuel');
            }
        }
    }
}
}
