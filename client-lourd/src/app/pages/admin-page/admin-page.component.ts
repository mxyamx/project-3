import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';
import { DropdownComponent } from '@app/components/dropdown/dropdown.component';
import { GameListComponent } from '@app/components/game-list/game-list.component';
import { LoadingComponent } from '@app/components/loading/loading.component';
import { SaveBoardDialogComponent } from '@app/components/save-board-dialog/save-board-dialog.component';
import { AdminPageManagerService } from '@app/services/admin-page-manager/admin-page-manager.service';
import { ChatService } from '@app/services/chat/chat.service';
import { HttpBoardGameService } from '@app/services/http-manager/http-board-game.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { BoardGameDTO } from '@common/board-game';
import { GameMode } from '@common/enums/game-mode';
import { GamePrivacy } from '@common/enums/game-visibility';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-admin-page',
    imports: [RouterLink, CommonModule, FormsModule, GameListComponent, TranslatePipe, DropdownComponent, LoadingComponent, ChatContainerComponent],
    templateUrl: './admin-page.component.html',
    styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent implements OnInit, OnDestroy {
    showDeleteConfirmation: boolean = false;
    showAlertConfirmation: boolean = false;
    gameMode: typeof GameMode = GameMode;
    diplayedObjectPrivacy: GamePrivacy;
    protected readonly gamePrivacies: GamePrivacy[] = [GamePrivacy.Public, GamePrivacy.Private, GamePrivacy.PrivateShared];
    protected adminPageManagerService: AdminPageManagerService = inject(AdminPageManagerService);
    private httpBoardGameService: HttpBoardGameService = inject(HttpBoardGameService);
    private playerSocketService = inject(PlayerSocketService);
    userManager = inject(UserManagerService);
    showChat: WritableSignal<boolean> = signal(false);
    chatService: ChatService = inject(ChatService);

    constructor(private dialog: MatDialog) {}

    get gamesList(): BoardGameDTO[] {
        return this.adminPageManagerService.gamesList;
    }

    get displayedObject(): BoardGameDTO | null {
        return this.adminPageManagerService.displayedObject;
    }

    async ngOnInit(): Promise<void> {
        await this.loadGames();

        this.adminPageManagerService.showDeleteConfirmation$.subscribe((show) => (this.showDeleteConfirmation = show));

        this.adminPageManagerService.showAlertConfirmation$.subscribe((show) => (this.showAlertConfirmation = show));

        this.adminPageManagerService.onBoadGameChanges();
    }
    ngOnDestroy(): void {
        this.playerSocketService.offBoardGameListeners();
    }

    setDisplayedObject(game: BoardGameDTO): void {
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

    async updateDisplayedObjectPrivacy($event: string): Promise<void> {
        if (this.isGamePrivacy($event)) {
            await this.adminPageManagerService.updateObjectPrivacy($event);
        }
    }

    deleteGame(): void {
        this.adminPageManagerService.deleteGame().subscribe();
    }

    editGame(): void {
        this.adminPageManagerService.editGame();
    }

    onDuplicateGame(boardGameDTO: BoardGameDTO): void {
        const { ownerName, ...board } = boardGameDTO;
        const result: Omit<BoardGameDTO, 'ownerName'> = { ...board, ownerId: '' };
        this.httpBoardGameService.duplicateBoard(result).subscribe({
            next: () => {
                this.openDialog('success', true);
            },
            error: (error) => this.openDialog(error.message, false),
        });
    }

    private openDialog(message: string, success: boolean): void {
        const dialogRef = this.dialog.open(SaveBoardDialogComponent, {
            width: '300px',
            data: { message, success },
        });

        dialogRef.afterClosed().subscribe(async () => {
            await this.loadGames();
        });
    }
    openChat() {
        this.showChat.set(!this.showChat());
    }

    private async loadGames(): Promise<void> {
        await this.adminPageManagerService.loadGames();
    }
    private isGamePrivacy(value: string): value is GamePrivacy {
        return Object.values(GamePrivacy).includes(value as GamePrivacy);
    }
}
