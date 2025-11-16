import { BoardGame } from './board-game';
import { GameMode } from './enums/game-mode';
import { Player } from './player';
import { UpdateGamedRes } from './socket-data-forms';

export enum CurrentGamePhase {
    Waiting = 'waiting',
    Running = 'running',
    Ended = 'ended',
}
export interface CurrentGame {
    id: string;
    name?: string;
    players: Player[];
    boardGame: BoardGame;
    locked: boolean;
    adminId: string;
    phase: CurrentGamePhase;
    dropInEnabled: boolean;
    entryPrice: number;
    friendsOnly: boolean;
}

export interface CurrentGamePreview {
    id: string;
    playerCount: number;
    maxPlayerCount: number;
    boardgameSize: number;
    gameMode: GameMode;
    phase: CurrentGamePhase;
    previewImage: string;
    isJoinable: boolean;
    entryPrice: number;
    friendsOnly: boolean;
}

export interface JoinGameAck {
    game?: CurrentGame;
    player?: Player;
    limitError: boolean;
    lockedError: boolean;
    codeError: boolean;
    insufficientFundsError?: boolean;
    updateGamedRes?: UpdateGamedRes;
    notFriendError?: boolean;
    blockedByPlayerError?: boolean;
    youBlockedPlayerWarning?: boolean;
}
