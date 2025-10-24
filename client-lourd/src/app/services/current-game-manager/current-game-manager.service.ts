import { Injectable, signal, WritableSignal } from '@angular/core';
import { BoardGame } from '@common/board-game';
import { CurrentGame } from '@common/current-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { GamePrivacy } from '@common/enums/game-visibility';
import { Player } from '@common/player';

@Injectable({
    providedIn: 'root',
})
export class CurrentGameManagerService {
    pickedBoardGame: BoardGame = {
        id: '',
        name: 'Jeu de test',
        description: 'This is a default description for the board game.',
        size: BoardGameSize.Medium,
        gameMode: GameMode.Normal,
        privacy: GamePrivacy.Private,
        tiles: [],
        previewImage: 'assets/preview.png',
        lastModified: new Date(),
        itemInfos: [],
        ownerId: '',
    };

    displayedCurrentGame: WritableSignal<CurrentGame> = signal({
        id: '1',
        players: [],
        boardGame: this.pickedBoardGame,
        locked: false,
        adminId: '',
    });

    updateCurrentGame(newGame: CurrentGame): void {
        this.displayedCurrentGame.set(newGame);
    }

    addPlayer(player: Player): void {
        this.displayedCurrentGame.update((curr) => ({ ...curr, players: [...curr.players, player] }));
    }

    removePlayer(playerRemoved: Player): void {
        this.displayedCurrentGame.update((curr) => ({
            ...curr,
            players: curr.players.filter((player) => player.name !== playerRemoved.name),
        }));
    }

    updatePickedBoardGame(board: BoardGame) {
        this.displayedCurrentGame.update((curr) => ({ ...curr, boardGame: board }));
    }

    reset(): void {
        this.displayedCurrentGame.set({
            id: '',
            players: [],
            boardGame: this.pickedBoardGame,
            locked: false,
            adminId: '',
        });
    }

    verifyUniquePlayerName(name: string, players: Player[]): string {
        let uniqueName = name.trim();
        let suffix = 2;

        while (players.some((player) => player.name.trim() === uniqueName)) {
            uniqueName = `${name}-${suffix}`;
            suffix++;
        }
        return uniqueName;
    }
}
