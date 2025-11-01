import { BoardGame } from './board-game';
import { Player } from './player';

export interface CurrentGame {
    id: string;
    name?: string;
    players: Player[];
    boardGame: BoardGame;
    locked: boolean;
    adminId?: string;
    started?: boolean;
}

export interface CurrentGamePreview {
    id: string;
    playerCount: number;
    maxPlayerCount: number;
    boardgameSize: number;
    started: boolean;
    previewImage: string;
}
