import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FROM_ITEM_TO_IMAGE_ON_BOARD } from '@app/constants/objects-constants';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';

@Component({
    selector: 'app-inventory',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './inventory.component.html',
    styleUrl: './inventory.component.scss',
})
export class InventoryComponent {
    protected gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);

    getItemImageCorrespondance(): { [key: string]: string } {
        return FROM_ITEM_TO_IMAGE_ON_BOARD;
    }
}
