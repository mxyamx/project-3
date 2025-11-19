import { CommonModule } from '@angular/common';
import { Component, effect, inject, Signal, ViewChild } from '@angular/core';
import { PlayingBoardCanvasComponent } from '@app/components/playing-board-canvas/playing-board-canvas.component';
import { PlayingTileComponent } from '@app/components/playing-tile/playing-tile.component';
import { FROM_ITEM_NAME_TO_VP_PREFERENCE, FROM_ITEM_TO_IMAGE_ON_BOARD, RIGHT_CLICK } from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { CanvasManagerService } from '@app/services/canvas-manager/canvas-manager.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { GameplayTeleportationHelperService } from '@app/services/gameplay-teleportation-helper/gameplay-teleportation-helper.service';
import { restrictEvent } from '@app/utils/functions/dom-related-functions';
import { BoardGame } from '@common/board-game';
import { ActionType } from '@common/enums/action-type';
import { PlayerState } from '@common/enums/player-state';
import { TileType } from '@common/enums/tile-type';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import { Tile } from '@common/tile';
import { VirtualPlayer } from '@common/virtual-player';
import { TranslatePipe } from '@ngx-translate/core';
import { TrapPopupComponent } from '../trap-popup/trap-popup.component';
@Component({
    selector: 'app-playing-board',
    imports: [CommonModule, PlayingTileComponent, PlayingBoardCanvasComponent, TranslatePipe, TrapPopupComponent],
    templateUrl: './playing-board.component.html',
    styleUrl: './playing-board.component.scss',
})
export class PlayingBoardComponent {
    @ViewChild(TrapPopupComponent) trapPopup?: TrapPopupComponent;

    boardgame: Signal<BoardGame>;
    selectedTile: Tile | undefined = { type: TileType.Grass };
    showInfoNotification: boolean = false;
    protected vpPreferenceItem = VpPreferenceItem;

    private boardManager: BoardGameManagerService = inject(BoardGameManagerService);
    private gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    private canvasManager: CanvasManagerService = inject(CanvasManagerService);
    private teleportHelper: GameplayTeleportationHelperService = inject(GameplayTeleportationHelperService);
    private itemImageCorrespondance: { [key: string]: string } = FROM_ITEM_TO_IMAGE_ON_BOARD;

    constructor() {
        this.boardgame = this.boardManager.playingBoardGame.asReadonly();
        effect(() => {
            const board = this.boardgame();
            if (board && board.tiles) {
                this.teleportHelper.initializeFromTiles(board.tiles);
            }
        });
    }

    get imageCorrespondance(): { [key: string]: string } {
        return this.itemImageCorrespondance;
    }

    get sessionManager(): GameSessionManagerService {
        return this.gameSessionManager;
    }

    getVirtualPlayerProfile(player: Player): string {
        return (player as VirtualPlayer).profile;
    }

    hasVirtualPlayers(): boolean {
        return this.gameSessionManager.listOfPlayers().some((player) => player.virtualPlayer);
    }

    clickOnItemToDrop(item: Item): void {
        this.gameSessionManager.dropItem(item);
        this.gameSessionManager.updateShowDropItemInterface(false);
    }

    mouseDownOnTile(event: MouseEvent, newPosition: Position, tile: Tile): void {
        if (event.button === 2) {
            restrictEvent(event);
            if (this.gameSessionManager.playerState() === PlayerState.WaitingForAction && this.gameSessionManager.debugModeStatus()) {
                this.gameSessionManager.teleportPlayer(newPosition);
            } else {
                this.selectedTile = tile;
                this.showInfoNotification = true;
            }
        }
    }

    onMouseLeaveTile(): void {
        this.canvasManager.clearCanvas();
    }

    onMouseEnterTile(tilePosition: Position): void {
        if (
            this.gameSessionManager.playerState() === PlayerState.WaitingForAction &&
            this.boardgame().tiles[tilePosition.x][tilePosition.y].reachable
        )
            this.canvasManager.drawLine(tilePosition);
    }

    clickOnTile(event: Event, tile: Tile): void {
        restrictEvent(event);

        if (this.gameSessionManager.playerState() !== PlayerState.WaitingForAction) return;

        if (tile.availableAction) {
            if (this.gameSessionManager.nbOfActions() <= 0) return;
            this.gameSessionManager.decrementAmountOfAction();
            switch (tile.availableAction.type) {
                case ActionType.CloseDoor: {
                    this.gameSessionManager.toggleDoorState(tile.position ?? { x: 0, y: 0 });
                    break;
                }
                case ActionType.OpenDoor: {
                    this.gameSessionManager.toggleDoorState(tile.position ?? { x: 0, y: 0 });
                    break;
                }
                case ActionType.AttackPlayer: {
                    this.gameSessionManager.startAttack(tile.position ?? { x: 0, y: 0 });
                    break;
                }
                case ActionType.Teleport: {
                    this.gameSessionManager.executeTeleport(this.gameSessionManager.activePlayer().position ?? { x: 0, y: 0 });
                    break;
                }
                default:
                    return;
            }
        } else if (tile.reachable) {
            this.gameSessionManager.movePlayer(tile.shortestDistanceFromPosition ?? []);
        }
    }

    closeInfoNotification(): void {
        this.showInfoNotification = false;
    }

    tileCostInfo(tile: Tile): string {
        const tileWeight = this.weightFunction(tile);
        if (tileWeight === Infinity) {
            return 'inacessible';
        } else {
            return tileWeight.toString();
        }
    }

    getItemPreference(item: Item): VpPreferenceItem | undefined {
        return FROM_ITEM_NAME_TO_VP_PREFERENCE[item.name];
    }

    contextMenuOnInfoPopUp(event: MouseEvent): void {
        if (event.button === RIGHT_CLICK) event.preventDefault();
    }

    protected isAggressive(player: Player): boolean {
        if (player.virtualPlayer) {
            return (player as VirtualPlayer).profile === VirtualPlayerProfile.Agressive;
        }
        return false;
    }

    private weightFunction(tile: Tile): number {
        switch (tile.type) {
            case TileType.Ice:
                return 0;
            case TileType.Water:
                return 2;
            case TileType.Grass:
            case TileType.Teleportation:
            case TileType.Trap:
                return 1;
            case TileType.Door:
                if (tile.doorState) return 1;
                return Infinity;
            default:
                return Infinity;
        }
    }
}
