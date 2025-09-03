import { inject, Injectable } from '@angular/core';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { ChatMessage } from '@common/chat-message';
import { CurrentGame } from '@common/current-game';
import { SocketEventNames } from '@common/enums/socket-events-names';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { GameEvent } from '@common/game-event';
import { Player } from '@common/player';

@Injectable({
    providedIn: 'root',
})
export class PlayerSocketService {
    private clientSocketService: SocketClientService = inject(SocketClientService);

    connect(): void {
        this.clientSocketService.connect();
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

    emitJoinGame(gameId: string, player: Player, callback: (response: CurrentGame) => void): void {
        this.clientSocketService.emit('join-game', { gameId, player }, callback);
    }

    emitStartGame(gameId: string) {
        this.clientSocketService.emit('start-game', gameId);
    }

    emitLeaveGame(gameId: string, player: Player): void {
        this.clientSocketService.emit('leave-game', { gameId, player });
    }

    emitKickPlayer(gameId: string, player: Player): void {
        this.clientSocketService.emit('kick-player', { gameId, player });
    }

    emitGetGame(gameId: string, callback: (response: CurrentGame) => void): void {
        this.clientSocketService.emit('get-game', gameId, callback);
    }

    emitDeleteGame(gameId: string): void {
        this.clientSocketService.emit('delete-game', gameId);
    }

    emitAdminLeaving(gameId: string, callback: () => void): void {
        this.clientSocketService.emit('admin-leaving', gameId, callback);
    }

    onAdminLeft(callback: (gameId: string) => void): void {
        this.clientSocketService.on<string>('admin-left', callback);
    }

    onLockUpdated(callback: (game: CurrentGame) => void): void {
        this.clientSocketService.on<CurrentGame>('lock-updated', callback);
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

    onAvatarDeselected(callback: (avatarList: string[]) => void): void {
        this.clientSocketService.on<string[]>('avatar-list-updated', callback);
    }

    emitAvatarSelection(gameId: string, avatar: string, callback: (avatars: string[]) => void): void {
        this.clientSocketService.emit('avatar-selection', { gameId, avatar }, callback);
    }

    emitAvatarDeselection(gameId: string, avatar: string, callback: (avatars: string[]) => void): void {
        this.clientSocketService.emit('avatar-deselection', { gameId, avatar }, callback);
    }

    emitJoinAvatarRoom(gameId: string): void {
        this.clientSocketService.emit('join-room', gameId);
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
}
