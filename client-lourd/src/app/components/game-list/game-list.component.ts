import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BoardGameDTO } from '@common/board-game';
import { GameMode } from '@common/enums/game-mode';
import { TranslatePipe } from '@ngx-translate/core';
import { LoadingComponent } from '../loading/loading.component';

@Component({
    selector: 'app-game-list',
    standalone: true,
    imports: [CommonModule, TranslatePipe, LoadingComponent],
    templateUrl: './game-list.component.html',
    styleUrls: ['./game-list.component.scss'],
})
export class GameListComponent {
    @Input() gamesList: BoardGameDTO[] = [];
    @Input() theme: 'green' | 'brown' = 'brown';
    @Output() gameSelected = new EventEmitter<BoardGameDTO>();
    @Output() duplicateGame = new EventEmitter<BoardGameDTO>();
    @Input() isAdminPage: boolean = false;
    @Input() isLoading: boolean = false;

    hoveredObject: BoardGameDTO | null = null;
    gameMode: typeof GameMode = GameMode;

    get filteredGames(): BoardGameDTO[] {
        return this.gamesList;
    }

    selectGame(game: BoardGameDTO) {
        this.gameSelected.emit(game);
    }
    onDuplicateGame(game: BoardGameDTO) {
        this.duplicateGame.emit(game);
    }
}
