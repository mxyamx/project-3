import { inject, Injectable } from '@angular/core';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { Player } from '@common/player';

@Injectable({
    providedIn: 'root',
})
export class OpponentService {
    private gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);

    getOpponent(): Player {
        const players = this.gameSessionManager.listOfPlayers();
        const currentPlayer = this.gameSessionManager.chosenPlayer();

        if (players && players.length > 1 && currentPlayer) {
            const opponents = players.filter((player) => player.name !== currentPlayer.name);
            if (opponents.length > 0) {
                return opponents[0];
            }
        }
        throw new Error('aucun adversaire trouve');
    }
}
