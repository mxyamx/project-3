import { TestBed } from '@angular/core/testing';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { ChatMessage } from '@common/chat-message';
import { CurrentGame } from '@common/current-game';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameEventType } from '@common/enums/game-event-type';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { GameEvent } from '@common/game-event';
import { Player } from '@common/player';
import { PlayerSocketService } from './player-socket.service';

describe('PlayerSocketService', () => {
    let service: PlayerSocketService;
    let clientSocketServiceSpy: jasmine.SpyObj<SocketClientService>;
    let testPlayer: Player;

    beforeEach(() => {
        clientSocketServiceSpy = jasmine.createSpyObj('SocketClientService', ['connect', 'disconnect', 'isSocketAlive', 'emit', 'on']);

        TestBed.configureTestingModule({
            providers: [PlayerSocketService, { provide: SocketClientService, useValue: clientSocketServiceSpy }],
        });
        service = TestBed.inject(PlayerSocketService);

        testPlayer = {
            name: 'Default Player',
            character: 'character.png',
            attributes: {
                attackValue: 5,
                defenseValue: 5,
                speedValue: 5,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: true,
            virtualPlayer: false,
            victories: 0,
        };
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call connect on clientSocketService', () => {
        service.connect();
        expect(clientSocketServiceSpy.connect).toHaveBeenCalled();
    });

    it('should call disconnect on clientSocketService', () => {
        service.disconnect();
        expect(clientSocketServiceSpy.disconnect).toHaveBeenCalled();
    });

    it('should call isSocketAlive on clientSocketService', () => {
        clientSocketServiceSpy.isSocketAlive.and.returnValue(true);
        expect(service.isConnected()).toBeTrue();
        expect(clientSocketServiceSpy.isSocketAlive).toHaveBeenCalled();
    });

    it('should emit create-game event', () => {
        const game = {} as CurrentGame;
        const callback = jasmine.createSpy('callback');
        service.emitCreateGame(game, callback);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('create-game', game, callback);
    });

    it('should listen for player-joined event', () => {
        const callback = jasmine.createSpy('callback');
        service.onPlayerJoined(callback);
        expect(clientSocketServiceSpy.on).toHaveBeenCalledWith('player-joined', callback);
    });

    it('should emit update-game-start event', () => {
        const gameId = 'game123';
        service.emitUpdateGameStart(gameId);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('update-game-start', gameId);
    });

    it('should emit toggle-lock event', () => {
        const gameId = 'game123';
        const callback = jasmine.createSpy('callback');
        service.emitToggleLock(gameId, callback);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('toggle-lock', gameId, callback);
    });

    it('should emit join-game event', () => {
        const gameId = 'game123';
        const callback = jasmine.createSpy('callback');
        service.emitJoinGame(gameId, testPlayer, callback);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('join-game', { gameId, player: testPlayer }, callback);
    });

    it('should emit add-virtual-player event', () => {
        const gameId = 'game123';
        const profile = VirtualPlayerProfile.Agressive;
        service.emitAddVirtualPlayer(gameId, profile);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('add-virtual-player', { gameId, profile });
    });

    it('should emit start-game event', () => {
        const gameId = 'game123';
        service.emitStartGame(gameId);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('start-game', gameId);
    });

    it('should emit leave-game event', () => {
        const gameId = 'game123';
        service.emitLeaveGame(gameId, testPlayer);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('leave-game', { gameId, player: testPlayer });
    });

    it('should emit kick-player event', () => {
        const gameId = 'game123';
        service.emitKickPlayer(gameId, testPlayer);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('kick-player', { gameId, player: testPlayer });
    });

    it('should emit get-game event', () => {
        const gameId = 'game123';
        const callback = jasmine.createSpy('callback');
        service.emitGetGame(gameId, callback);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('get-game', gameId, callback);
    });

    it('should emit delete-game event', () => {
        const gameId = 'game123';
        service.emitDeleteGame(gameId);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('delete-game', gameId);
    });

    it('should emit admin-leaving event', () => {
        const gameId = 'game123';
        const callback = jasmine.createSpy('callback');
        service.emitAdminLeaving(gameId, callback);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('admin-leaving', gameId, callback);
    });

    it('should listen for admin-left event', () => {
        const callback = jasmine.createSpy('callback');
        service.onAdminLeft(callback);
        expect(clientSocketServiceSpy.on).toHaveBeenCalledWith('admin-left', callback);
    });

    it('should listen for lock-updated event', () => {
        const callback = jasmine.createSpy('callback');
        service.onLockUpdated(callback);
        expect(clientSocketServiceSpy.on).toHaveBeenCalledWith('lock-updated', callback);
    });

    it('should listen for player-left event', () => {
        const callback = jasmine.createSpy('callback');
        service.onPlayerLeft(callback);
        expect(clientSocketServiceSpy.on).toHaveBeenCalledWith('player-left', callback);
    });

    it('should listen for kicked event', () => {
        const callback = jasmine.createSpy('callback');
        service.onKicked(callback);
        expect(clientSocketServiceSpy.on).toHaveBeenCalledWith('kicked', callback);
    });

    it('should emit select-avatar event', () => {
        const gameId = 'game123';
        const avatar = 'avatar.png';
        service.emitSelectAvatar(gameId, avatar);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('select-avatar', { gameId, avatar });
    });

    it('should emit deselect-avatar event', () => {
        const gameId = 'game123';
        const avatar = 'avatar.png';
        service.emitDeselectAvatar(gameId, avatar);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('deselect-avatar', { gameId, avatar });
    });

    it('should listen for avatar-selected event', () => {
        const callback = jasmine.createSpy('callback');
        service.onAvatarSelected(callback);
        expect(clientSocketServiceSpy.on).toHaveBeenCalledWith('avatar-list-updated', callback);
    });

    it('should listen for avatar-deselected event', () => {
        const callback = jasmine.createSpy('callback');
        service.onAvatarDeselected(callback);
        expect(clientSocketServiceSpy.on).toHaveBeenCalledWith('avatar-list-updated', callback);
    });

    it('should emit avatar-selection event', () => {
        const gameId = 'game123';
        const avatar = 'avatar.png';
        const callback = jasmine.createSpy('callback');
        service.emitAvatarSelection(gameId, avatar, callback);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('avatar-selection', { gameId, avatar }, callback);
    });

    it('should emit avatar-deselection event', () => {
        const gameId = 'game123';
        const avatar = 'avatar.png';
        const callback = jasmine.createSpy('callback');
        service.emitAvatarDeselection(gameId, avatar, callback);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('avatar-deselection', { gameId, avatar }, callback);
    });

    it('should emit join-room event', () => {
        const gameId = 'game123';
        service.emitJoinAvatarRoom(gameId);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('join-room', gameId);
    });

    it('should listen for avatar-room-joined event', () => {
        const callback = jasmine.createSpy('callback');
        service.onAvatarRoomJoined(callback);
        expect(clientSocketServiceSpy.on).toHaveBeenCalledWith('avatar-room-joined', callback);
    });

    it('should listen for avatar-room-left event', () => {
        const callback = jasmine.createSpy('callback');
        service.onAvatarRoomLeft(callback);
        expect(clientSocketServiceSpy.on).toHaveBeenCalledWith('avatar-room-left', callback);
    });

    it('should emit get-selected-avatars event', () => {
        const gameId = 'game123';
        const callback = jasmine.createSpy('callback');
        service.emitGetSelectedAvatars(gameId, callback);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('get-selected-avatars', gameId, callback);
    });

    it('should listen for avatar-list-updated event and call the callback with avatars', () => {
        const callback = jasmine.createSpy('callback');
        const avatars = ['avatar1.png', 'avatar2.png', 'avatar3.png'];

        service.onAvatarListUpdated(callback);
        clientSocketServiceSpy.on.calls.mostRecent().args[1](avatars);

        expect(callback).toHaveBeenCalledWith(avatars);
    });

    it('should emit room-message event', () => {
        const gameId = 'game123';
        const message: ChatMessage = {
            sender: 'Alice',
            text: 'test message',
            timestamp: new Date(),
        };
        service.emitSendMessage(gameId, message);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('room-message', { gameId, message }, undefined);
    });

    it('should listen for message-sent event and call the callback with the messsage', () => {
        const callback = jasmine.createSpy('callback');
        const message: ChatMessage = {
            sender: 'Alice',
            text: 'test message',
            timestamp: new Date(),
        };

        service.onNewMessage(callback);
        clientSocketServiceSpy.on.calls.mostRecent().args[1](message);

        expect(callback).toHaveBeenCalledWith(message);
    });

    it('should emit join-room-log event', () => {
        const gameId = 'game123';
        service.emitJoinLogRoom(gameId);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('join-room-log', gameId);
    });

    it('should listen for change-turn-log-sent event and call the callback with the log', () => {
        const callback = jasmine.createSpy('callback');
        const event: GameEvent = {
            message: 'Test log message',
            timestamp: new Date(),
            type: GameEventType.StartTurn,
            player: ['Alice'],
        };

        service.onChangeLog(callback);
        clientSocketServiceSpy.on.calls.mostRecent().args[1](event);

        expect(callback).toHaveBeenCalledWith(event);
    });

    it('should listen for combat-log-sent event and call the callback with the log', () => {
        const callback = jasmine.createSpy('callback');
        const event: GameEvent = {
            message: 'Test log combat message',
            timestamp: new Date(),
            type: GameEventType.Escape,
            player: ['Alice'],
        };

        service.onCombatLog(callback);
        clientSocketServiceSpy.on.calls.mostRecent().args[1](event);

        expect(callback).toHaveBeenCalledWith(event);
    });

    it('should emit add-virtual-player event', () => {
        const gameId = 'game123';
        const profile = VirtualPlayerProfile.Agressive;
        service.emitAddVirtualPlayer(gameId, profile);
        expect(clientSocketServiceSpy.emit).toHaveBeenCalledWith('add-virtual-player', { gameId, profile });
    });
});
