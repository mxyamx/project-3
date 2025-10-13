import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GameListComponent } from '@app/components/game-list/game-list.component';
import { AdminPageManagerService } from '@app/services/admin-page-manager/admin-page-manager.service';
import { BoardGame } from '@common/board-game';
import { GameMode } from '@common/enums/game-mode';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-admin-page',
    imports: [RouterLink, CommonModule, FormsModule, GameListComponent, TranslatePipe],
    templateUrl: './admin-page.component.html',
    styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent implements OnInit {
    showDeleteConfirmation: boolean = false;
    showAlertConfirmation: boolean = false;
    gameMode: typeof GameMode = GameMode;
    private adminPageManagerService: AdminPageManagerService = inject(AdminPageManagerService);

    get gamesList(): BoardGame[] {
        return this.adminPageManagerService.gamesList;
    }

    get displayedObject(): BoardGame | null {
        return this.adminPageManagerService.displayedObject;
    }

    ngOnInit(): void {
        this.loadGames();

        this.adminPageManagerService.showDeleteConfirmation$.subscribe((show) => (this.showDeleteConfirmation = show));

        this.adminPageManagerService.showAlertConfirmation$.subscribe((show) => (this.showAlertConfirmation = show));
    }

    setDisplayedObject(game: BoardGame): void {
        this.adminPageManagerService.setDisplayedObject(game);
    }

    confirmDelete(): void {
        this.adminPageManagerService.confirmDelete();
    }

    cancelDelete(): void {
        this.adminPageManagerService.cancelDelete();
    }

    hideAlert(): void {
        this.adminPageManagerService.hideAlert();
    }

    updateDisplayedObjectVisibility(): void {
        this.adminPageManagerService.updateObjectVisibility().subscribe();
    }

    deleteGame(): void {
        this.adminPageManagerService.deleteGame().subscribe();
    }

    editGame(): void {
        this.adminPageManagerService.editGame();
    }

    private loadGames(): void {
        this.adminPageManagerService.loadGames().subscribe();
    }
}
