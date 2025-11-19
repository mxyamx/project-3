import { inject, Injectable } from '@angular/core';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { ChatMessage } from '@common/chat-message';
import { CurrentGame, CurrentGamePreview, JoinGameAck } from '@common/current-game';
import { SocketClientEventNames, SocketEventNames } from '@common/enums/socket-events-names';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { GameEvent } from '@common/game-event';
import { Player } from '@common/player';
import { AuthentificationService } from '../authentification/authentification.service';

@Injectable({
    providedIn: 'root',
})
export class PlayerSocketService {
    private clientSocketService: SocketClientService = inject(SocketClientService);
    private authentificationService: AuthentificationService = inject(AuthentificationService);

    connect(): void {
        const firebaseId = this.authentificationService.getCurrentUserId();
        if (firebaseId) this.clientSocketService.connect(firebaseId);
    }

    disconnect(): void {
        this.clientSocketService.disconnect();
    }

    isConnected(): boolean {
        return this.clientSocketService.isSocketAlive();
    }

    emitCreateGame(game: CurrentGame, callback: (response: CurrentGame) => void): void {
        this.clientSocketService.emit<CurrentGame, CurrentGame>('create-game', game, callback);
    }

    emitUpdateGameStart(gameId: string): void {
        this.clientSocketService.emit('update-game-start', gameId);
    }

    emitToggleLock(gameId: string, callback: (isLocked: boolean) => void): void {
        this.clientSocketService.emit('toggle-lock', gameId, callback);
    }

    emitToggleDropIn(gameId: string, callback: (dropInEnabled: boolean) => void): void {
        this.clientSocketService.emit('toggle-drop-in', gameId, callback);
    }

    emitJoinGame(gameId: string, player: Player, callback: (response: JoinGameAck) => void): void {
        this.clientSocketService.emit('join-game', { gameId, player }, callback);
    }

    emitStartGame(gameId: string) {
        this.clientSocketService.emit('start-game', gameId);
    }

    emitLeaveGame(gameId: string): void {
        this.clientSocketService.emit('leave-game', { gameId });
    }

    emitKickPlayer(gameId: string, player: Player): void {
        this.clientSocketService.emit('kick-player', { gameId, player });
    }

    emitGetGame(gameId: string, callback: (response: CurrentGame) => void): void {
        this.clientSocketService.emit('get-game', gameId, callback);
    }

    emitGetCurrentGamePreviews(callback: (response: CurrentGamePreview[]) => void): void {
        this.clientSocketService.emit(SocketEventNames.GetCurrentGamePreviews, undefined, callback);
    }

    emitDeleteGame(gameId: string): void {
        this.clientSocketService.emit('delete-game', gameId);
    }

    emitAdminLeaving(gameId: string): void {
        this.clientSocketService.emit('admin-leaving', gameId);
    }

    onAdminLeft(callback: (gameId: string) => void): void {
        this.clientSocketService.on<string>('admin-left', callback);
    }

    onLockUpdated(callback: (game: CurrentGame) => void): void {
        this.clientSocketService.on<CurrentGame>('lock-updated', callback);
    }

    onDropInUpdated(callback: (game: CurrentGame) => void): void {
        this.clientSocketService.on<CurrentGame>('drop-in-updated', callback);
    }

    onPlayerJoined(callback: (player: Player) => void): void {
        this.clientSocketService.on<Player>('player-joined', callback);
    }

    onPlayerLeft(callback: (player: Player) => void): void {
        this.clientSocketService.on<Player>('player-left', callback);
    }

    onKicked(callback: (player: Player) => void): void {
        this.clientSocketService.on<Player>('kicked', callback);
    }

    emitSelectAvatar(gameId: string, avatar: string): void {
        this.clientSocketService.emit('select-avatar', { gameId, avatar });
    }

    emitDeselectAvatar(gameId: string, avatar: string): void {
        this.clientSocketService.emit('deselect-avatar', { gameId, avatar });
    }

    onAvatarSelected(callback: (avatarList: string[]) => void): void {
        this.clientSocketService.on<string[]>('avatar-list-updated', callback);
    }

    onCurrentGamePreviewsUpdated(callback: (previews: CurrentGamePreview[]) => void): void {
        this.clientSocketService.on<CurrentGamePreview[]>(SocketEventNames.CurrentGamePreviewsUpdated, callback);
    }

    onAvatarDeselected(callback: (avatarList: string[]) => void): void {
        this.clientSocketService.on<string[]>('avatar-list-updated', callback);
    }

    emitAvatarSelection(gameId: string, avatar: string, callback: (avatars: string[]) => void): void {
        this.clientSocketService.emit('avatar-selection', { gameId, avatar }, callback);
    }

    emitAvatarDeselection(gameId: string, avatar: string, callback: (avatars: string[]) => void): void {
        this.clientSocketService.emit('avatar-deselection', { gameId, avatar }, callback);
    }

    emitJoinAvatarRoom(gameId: string, callback: (response: JoinGameAck) => void): void {
        const data: { gameId: string; isVirtual: boolean } = { gameId, isVirtual: false };
        this.clientSocketService.emit('join-room', data, callback);
    }

    onAvatarRoomJoined(callback: (playerId: string) => void): void {
        this.clientSocketService.on<string>('avatar-room-joined', callback);
    }

    onAvatarRoomLeft(callback: (playerId: string) => void): void {
        this.clientSocketService.on('avatar-room-left', callback);
    }

    emitGetSelectedAvatars(gameId: string, callback: (avatars: string[]) => void): void {
        this.clientSocketService.emit('get-selected-avatars', gameId, callback);
    }

    onAvatarListUpdated(callback: (avatars: string[]) => void) {
        this.clientSocketService.on<string[]>('avatar-list-updated', (avatars: string[]) => {
            callback(avatars);
        });
    }

    emitJoinChatRoom(gameId: string): void {
        this.clientSocketService.emit('join-room-chat', gameId);
    }

    emitSendMessage(gameId: string, message: ChatMessage, callback?: (response: unknown) => void): void {
        this.clientSocketService.emit('room-message', { gameId, message }, callback);
    }

    onNewMessage(callback: (message: ChatMessage) => void): void {
        this.clientSocketService.on<ChatMessage>('message-sent', (data: ChatMessage) => {
            callback(data);
        });
    }

    onChatHistory(callback: (chatHistory: ChatMessage[]) => void) {
        this.clientSocketService.on<ChatMessage[]>(SocketEventNames.ChatHistory, (data: ChatMessage[]) => {
            callback(data);
        });
    }

    emitAddVirtualPlayer(gameId: string, profile: VirtualPlayerProfile): void {
        this.clientSocketService.emit('add-virtual-player', { gameId, profile });
    }

    emitJoinLogRoom(gameId: string): void {
        this.clientSocketService.emit('join-room-log', gameId);
    }

    emitLog(gameId: string, gameEvent: GameEvent, callback?: (response: unknown) => void): void {
        this.clientSocketService.emit('change-turn-log', { gameId, gameEvent }, callback);
    }

    onChangeLog(callback: (gameEvent: GameEvent) => void): void {
        this.clientSocketService.on<GameEvent>('change-turn-log-sent', (data: GameEvent) => {
            callback(data);
        });
    }

    emitJoinCombatLogRoom(gameId: string, playerNames: string[]): void {
        playerNames.forEach((playerName) => {
            this.clientSocketService.emit('join-combat-log', { gameId, playerName });
        });
    }

    emitCombatLog(gameId: string, gameEvent: GameEvent, callback?: (response: unknown) => void): void {
        this.clientSocketService.emit('combat-log', { gameId, gameEvent }, callback);
    }

    onCombatLog(callback: (gameEvent: GameEvent) => void): void {
        this.clientSocketService.on<GameEvent>('combat-log-sent', (data: GameEvent) => {
            callback(data);
        });
    }

    unsubscribeChat(): void {
        this.clientSocketService.off('message-sent');
        this.clientSocketService.off(SocketEventNames.ChatHistory);
    }

    unsubscribeGameEvents(): void {
        this.unsubscribeChat();
        this.clientSocketService.off('admin-left');
        this.clientSocketService.off('lock-updated');
        this.clientSocketService.off('player-joined');
        this.clientSocketService.off('player-left');
        this.clientSocketService.off('kicked');
        this.clientSocketService.off('avatar-list-updated');
        this.clientSocketService.off('avatar-room-joined');
        this.clientSocketService.off('avatar-room-left');
        this.clientSocketService.off('change-turn-log-sent');
        this.clientSocketService.off('combat-log-sent');
        this.clientSocketService.off(SocketClientEventNames.StartGame);
        this.clientSocketService.off(SocketClientEventNames.ServerError);
        this.clientSocketService.off(SocketClientEventNames.StartFight);
        this.clientSocketService.off(SocketClientEventNames.ProcessAttack);
        this.clientSocketService.off(SocketClientEventNames.SwitchTurn);
        this.clientSocketService.off(SocketClientEventNames.ProcessEscapeAttempt);
        this.clientSocketService.off(SocketClientEventNames.EndFight);
        this.clientSocketService.off(SocketClientEventNames.EndTurn);
        this.clientSocketService.off(SocketClientEventNames.StartTurn);
        this.clientSocketService.off(SocketClientEventNames.Clock);
        this.clientSocketService.off(SocketClientEventNames.EndGame);
        this.clientSocketService.off(SocketClientEventNames.UpdateGame);
        this.clientSocketService.off(SocketClientEventNames.ShowEndFightNotification);
        this.clientSocketService.off(SocketClientEventNames.ProcessEscapeAttempt);
        this.clientSocketService.off(SocketClientEventNames.ToggleDebugMode);
        this.clientSocketService.off(SocketClientEventNames.DeactivateDebugMode);
        this.clientSocketService.off(SocketClientEventNames.PickUpItem);
        this.clientSocketService.off(SocketClientEventNames.DropItem);
        this.clientSocketService.off(SocketClientEventNames.MovePlayer);
        this.clientSocketService.off(SocketClientEventNames.MovementOver);
        this.clientSocketService.off(SocketClientEventNames.ToggleDoorState);
        this.clientSocketService.off(SocketClientEventNames.Teleport);
        this.clientSocketService.off('drop-in-updated');
    }
}
