import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BoardGame } from '@common/board-game';

@Component({
    selector: 'app-game-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './game-list.component.html',
    styleUrls: ['./game-list.component.scss'],
})
export class GameListComponent {
    @Input() gamesList: BoardGame[] = [];
    @Input() showOnlyVisible: boolean = false;
    @Input() theme: 'green' | 'brown' = 'brown';
    @Output() gameSelected = new EventEmitter<BoardGame>();

    hoveredObject: BoardGame | null = null;

    get filteredGames(): BoardGame[] {
        return this.showOnlyVisible ? this.gamesList.filter((game) => game.visibility) : this.gamesList;
    }

    selectGame(game: BoardGame) {
        this.gameSelected.emit(game);
    }
}
