import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';
import { DEFAULT_BOARD, ID_LENGTH } from '@app/constants/objects-constants';
import { OptionForm } from '@app/interfaces/option-form';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { ChatService } from '@app/services/chat/chat.service';
import { generateId } from '@app/utils/functions/id-related-functions';
import { BoardGame } from '@common/board-game';
import { GameMode } from '@common/enums/game-mode';
import { GamePrivacy } from '@common/enums/game-visibility';
import { UrlPage } from '@common/enums/url-page';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-game-option',
    imports: [ReactiveFormsModule, RouterLink, TranslatePipe, ChatContainerComponent],
    templateUrl: './game-option.component.html',
    styleUrl: './game-option.component.scss',
})
export class GameOptionComponent {
    settingsForm: FormGroup<OptionForm>;
    protected readonly gamePrivacies: GamePrivacy[] = [GamePrivacy.Public, GamePrivacy.Private, GamePrivacy.PrivateShared];
    protected readonly gameModes: GameMode[] = [GameMode.Normal, GameMode.CTF];

    private sizeHashMap: { [key: string]: number } = {
        ['20x20']: 20,
        ['15x15']: 15,
        ['10x10']: 10,
    };
    private displayedBoardManager: BoardGameManagerService = inject(BoardGameManagerService);
    private router: Router;

    chatService: ChatService = inject(ChatService);

    constructor() {
        this.settingsForm = new FormGroup<OptionForm>({
            gameMode: new FormControl<GameMode>(GameMode.Normal, Validators.required),
            boardSize: new FormControl<string>('10x10', Validators.required),
            gamePrivacy: new FormControl<GamePrivacy>(GamePrivacy.Private, Validators.required),
        });
        this.router = new Router();
    }

    onSubmit(): void {
        const newBoard: BoardGame = DEFAULT_BOARD;

        if (!this.registerChoices(newBoard)) {
            return;
        }

        newBoard.itemInfos = this.displayedBoardManager.itemInfoGenerator(newBoard.size, newBoard.gameMode === GameMode.CTF);

        this.displayedBoardManager.updateDisplayedBoardGame(newBoard);
        this.displayedBoardManager.updateLoadedBoardGame(structuredClone(newBoard));
        this.displayedBoardManager.isEditing = false;
        this.router.navigate([UrlPage.Editor]);
    }

    openChat() {
        this.chatService.showChat.set(!this.chatService.showChat());
    }

    private registerChoices(newBoard: BoardGame): boolean {
        let isValid = false;

        const boardSizeChoice: string | null | undefined = this.settingsForm.value.boardSize;
        if (!boardSizeChoice) {
            return isValid;
        }
        newBoard.size = this.sizeHashMap[boardSizeChoice];
        newBoard.tiles = this.displayedBoardManager.tileGenerator(newBoard.size);
        newBoard.id = generateId(ID_LENGTH);

        const gameModeChoice: GameMode | null | undefined = this.settingsForm.value.gameMode;
        if (!gameModeChoice) {
            return isValid;
        }
        newBoard.gameMode = gameModeChoice;

        const gamePrivacy: GamePrivacy | null | undefined = this.settingsForm.value.gamePrivacy;
        if (!gamePrivacy) {
            return isValid;
        }
        newBoard.privacy = gamePrivacy;

        isValid = true;
        return isValid;
    }
}
