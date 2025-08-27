import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DEFAULT_BOARD, ID_LENGTH } from '@app/constants/objects-constants';
import { OptionForm } from '@app/interfaces/option-form';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { generateId } from '@app/utils/functions/id-related-functions';
import { BoardGame } from '@common/board-game';
import { GameMode } from '@common/enums/game-mode';
import { UrlPage } from '@common/enums/url-page';

@Component({
    selector: 'app-game-option',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './game-option.component.html',
    styleUrl: './game-option.component.scss',
})
export class GameOptionComponent {
    settingsForm: FormGroup<OptionForm>;
    protected readonly gameModes: GameMode[] = [GameMode.Normal, GameMode.CTF];

    private sizeHashMap: { [key: string]: number } = {
        ['20x20']: 20,
        ['15x15']: 15,
        ['10x10']: 10,
    };
    private displayedBoardManager: BoardGameManagerService = inject(BoardGameManagerService);
    private router: Router;

    constructor() {
        this.settingsForm = new FormGroup<OptionForm>({
            gameMode: new FormControl<GameMode>(GameMode.Normal, Validators.required),
            boardSize: new FormControl<string>('10x10', Validators.required),
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

        this.router.navigate([UrlPage.Editor]);
    }

    private registerChoices(newBoard: BoardGame): boolean {
        let isValid = false;

        const boardSizeChoice: string | null | undefined = this.settingsForm.value.boardSize;
        if (boardSizeChoice && boardSizeChoice) {
            newBoard.size = this.sizeHashMap[boardSizeChoice];
        } else {
            alert('board size missing');
            return isValid;
        }

        newBoard.tiles = this.displayedBoardManager.tileGenerator(newBoard.size);
        newBoard.id = generateId(ID_LENGTH);

        const gameModeChoice: GameMode | null | undefined = this.settingsForm.value.gameMode;
        if (gameModeChoice && gameModeChoice) {
            newBoard.gameMode = gameModeChoice;
        } else {
            alert('game mode missing');
            return isValid;
        }

        isValid = true;
        return isValid;
    }
}
