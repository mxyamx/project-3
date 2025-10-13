import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BoardGame } from '@common/board-game';
import { GameMode } from '@common/enums/game-mode';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-game-list',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './game-list.component.html',
    styleUrls: ['./game-list.component.scss'],
})
export class GameListComponent {
    @Input() gamesList: BoardGame[] = [];
    @Input() showOnlyVisible: boolean = false;
    @Input() theme: 'green' | 'brown' = 'brown';
    @Output() gameSelected = new EventEmitter<BoardGame>();

    hoveredObject: BoardGame | null = null;
    gameMode: typeof GameMode = GameMode;

    get filteredGames(): BoardGame[] {
        return this.showOnlyVisible ? this.gamesList.filter((game) => game.visibility) : this.gamesList;
    }

    selectGame(game: BoardGame) {
        this.gameSelected.emit(game);
    }
}
