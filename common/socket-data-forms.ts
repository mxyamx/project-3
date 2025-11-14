import { BoardGame } from './board-game';
import { ChatMessage } from './chat-message';
import { CtfTeam } from './enums/ctf-team';
import { VirtualPlayerProfile } from './enums/virtual-player-profile';
import { GameEvent } from './game-event';
import { Item } from './item';
import { Player } from './player';
import { Position } from './position';
import { GlobalStatistics, PlayerStatistics } from './statistics';

export interface GameCreationDataForm {
    gameCode: string;
}

export interface StandardReq {
    gameCode: string;
}

export interface StandardRes {
    successful: boolean;
    message: string;
}

export interface JoinGameReq extends StandardReq {}

export interface JoinGameRes extends StandardRes {
    chosenPlayer?: Player;
}

export interface StartGameData {
    boardGame: BoardGame;
    listOfPlayers: Player[];
    activePlayer: Player;
}

export interface MoveReq extends StandardReq {
    path: Position[];
    isMovingToItem?: boolean;
}

export interface MovePlayer extends StandardRes {
    boardGame: BoardGame;
    listOfPlayers: Player[];
    activePlayer: Player;
    isMovingToItem?: boolean;
}

export interface ChangeActivePlayer {
    listOfPlayers: Player[];
    activePlayer: Player;
}

export interface ToggleDoorStateReq extends StandardReq {
    doorPosition: Position;
}
export interface ToggleDoorStateRes extends StandardRes {
    boardGame: BoardGame;
    listOfPlayers: Player[];
    activePlayer: Player;
    doorPosition: Position;
    doorState: boolean;
}

export interface StartFightReq extends StandardReq {
    targetPlayerPosition: Position;
}

export interface StartFightRes extends StandardRes {
    boardGame: BoardGame;
    listOfPlayers: Player[];
    activePlayer: Player;
    attackingPlayer: Player;
    defendingPlayer: Player;
}

export interface ExecuteAttackRes extends StandardRes {
    boardGame: BoardGame;
    listOfPlayers: Player[];
    activePlayer: Player;
    attackingPlayer: Player;
    defendingPlayer: Player;
    defenseDice?: number;
    attackDice?: number;
    damageDoneAttackingPlayer?: number;
    damageTakenDefendingPlayer?: number;
    attackSoundEffect?: string;
}

export interface ExecuteAttackReq extends StandardReq {}

export interface SwitchTurn extends StandardRes {
    boardGame: BoardGame;
    listOfPlayers: Player[];
    activePlayer: Player;
    attackingPlayer: Player;
    defendingPlayer: Player;
    changeDisplayAttackClock?: boolean;
}

export interface EscapeAttemptReq extends StandardReq {}
export interface EscapeAttemptRes extends StandardRes {
    escapingPlayer?: Player;
    largestAmountOfEScapeAttempts?: number;
    defenderPlayer?: Player;
}

export interface EndFightRes extends StandardRes {
    boardGame: BoardGame;
    listOfPlayers: Player[];
    activePlayer: Player;
    winnerName?: string;
    loserName?: string;
    attackingPlayer?: Player;
}

export interface EndTurnRes extends StandardRes {
    boardGame: BoardGame;
    listOfPlayers: Player[];
    activePlayer: Player;
}
export interface EndTurnReq extends StandardReq {}

export interface ClockRes extends StandardRes {
    turnClockValue: number;
    fightClockValue: number;
}

export interface ServerError {
    message: string;
}

export interface endTurnNotification extends StandardRes {
    activePlayerName: string;
}

export interface startTurnNotification extends StandardRes {
    activePlayerName: string;
}

export interface endFightNotification extends StandardRes {
    winnerName: string;
    loserName: string;
}

export interface StartTurnRes extends StandardRes {}

export interface EndGameRes extends StandardRes {
    winner?: Player;
    winnerTeam?: CtfTeam;
    globalStats?: GlobalStatistics;
    listOfPlayerStats?: (PlayerStatistics & { name: string })[];
}

export interface UpdateGamedRes extends StandardRes {
    boardGame: BoardGame;
    listOfPlayers: Player[];
    activePlayer: Player;
}

export interface DeactivateDebugModeReq extends StandardReq {}

export interface ToggleDebugModeReq extends StandardReq {}

export interface TeleportPlayerReq extends StandardReq {
    oldPosition: Position;
    newPosition: Position;
}

export interface DeactivateDebugModeRes extends StandardRes {
    debugModeStatus: boolean;
}
export interface ToggleDebugModeRes extends StandardRes {
    debugModeStatus: boolean;
}
export interface TeleportPlayerRes extends StandardRes {
    boardGame: BoardGame;
    listOfPlayers: Player[];
    activePlayer: Player;
}

export interface PickUpItemReq extends StandardReq {
    player: Player;
}

export interface PickUpItemRes extends StandardRes {
    boardGame: BoardGame;
    listOfPlayers: Player[];
    activePlayer: Player;
    pickedItem?: Item;
}

export interface DropItemReq extends StandardReq {
    player: Player;
    item: Item;
}

export interface GetActivePlayerReq extends StandardReq {}

export interface GetActivePlayerRes extends StandardRes {
    activePlayer: Player;
}

export interface DropItemRes extends StandardRes {
    boardGame: BoardGame;
    listOfPlayers: Player[];
    activePlayer: Player;
    droppedItem?: Item;
}
export interface GetGameStateReq extends StandardReq {}

export interface GetGameStateRes extends StandardRes {
    boardGame: BoardGame;
    listOfPlayers: Player[];
    activePlayer: Player;
}

export interface RoomManagement {
    gameId: string;
    player: Player;
}

export interface VpRoomManagement {
    gameId: string;
    profile: VirtualPlayerProfile;
}

export interface AvatarManagement {
    gameId: string;
    avatar: string;
}

export interface RoomMessage {
    gameId: string;
    message: ChatMessage;
}

export interface GameEventLog {
    gameId: string;
    gameEvent: GameEvent;
}

export interface CombatLog {
    gameId: string;
    playerName: string;
}
