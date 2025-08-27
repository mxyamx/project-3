import { TestBed } from '@angular/core/testing';
import { STANDARD_PLAYERS } from '@app/constants/development-constants';
import { FROM_ITEM_NAME_TO_DESCRIPTION, ITEM_NAMES } from '@app/constants/objects-constants';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameEventType } from '@common/enums/game-event-type';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { GameEvent } from '@common/game-event';
import { Player } from '@common/player';
import { endFightNotification, PickUpItemRes, StartGameData, ToggleDoorStateRes } from '@common/socket-data-forms';
import { GameEventService } from './game-event.service';

const MOCK_PLAYER: Player = STANDARD_PLAYERS[0];

describe('GameEventService', () => {
    let service: GameEventService;
    let standardBoard: BoardGame;
    let mockPlayerSocketService: jasmine.SpyObj<PlayerSocketService>;
    let mockGameSessionManagerService: jasmine.SpyObj<GameSessionManagerService>;

    beforeEach(() => {
        mockPlayerSocketService = jasmine.createSpyObj('PlayerSocketService', [
            'emitJoinLogRoom',
            'onChangeLog',
            'onCombatLog',
            'emitLog',
            'emitCombatLog',
        ]);

        mockGameSessionManagerService = jasmine.createSpyObj('GameSessionManagerService', [
            'gameId',
            'gameMode',
            'debugModeStatus',
            'chosenPlayer',
            'listOfPlayers',
            'activePlayer',
        ]);

        mockGameSessionManagerService.chosenPlayer.and.returnValue(MOCK_PLAYER);
        mockGameSessionManagerService.listOfPlayers.and.returnValue(STANDARD_PLAYERS);
        mockGameSessionManagerService.activePlayer.and.returnValue(MOCK_PLAYER);

        standardBoard = {
            id: '',
            name: 'Default Board',
            description: 'This is a default description for the board game.',
            size: BoardGameSize.Medium,
            gameMode: GameMode.Normal,
            tiles: [
                [
                    { type: TileType.Wall },
                    { type: TileType.Door },
                    {
                        type: TileType.Grass,
                        containedItem: {
                            type: ItemType.AttributeEditor,
                            name: ITEM_NAMES.attributeEditor2,
                            description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.attributeEditor2],
                        },
                    },
                ],
            ],
            previewImage: 'assets/preview.png',
            visibility: true,
            lastModified: new Date(),
            itemInfos: [],
        };
        TestBed.configureTestingModule({
            providers: [
                { provide: PlayerSocketService, useValue: mockPlayerSocketService },
                { provide: GameSessionManagerService, useValue: mockGameSessionManagerService },
                GameEventService,
            ],
        });
        service = TestBed.inject(GameEventService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should add a new unique event and call updateFilteredEvents', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spyOn(service as any, 'updateFilteredEvents');
        const event: GameEvent = {
            message: 'Player joined',
            type: GameEventType.StartTurn,
            timestamp: new Date(),
            player: ['Alice'],
        };

        service.addLog(event);

        expect(service.events.length).toBe(1);
        expect(service.events[0]).toEqual(event);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((service as any)['updateFilteredEvents']).toHaveBeenCalled();
    });

    it('should not add a duplicate event and not call updateFilteredEvents', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spyOn(service as any, 'updateFilteredEvents');
        const timestamp = new Date();
        const event: GameEvent = {
            message: 'Player joined',
            type: GameEventType.StartTurn,
            timestamp,
            player: ['Alice'],
        };

        service.addLog(event);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any)['updateFilteredEvents'].calls.reset();

        const duplicateEvent = { ...event, timestamp: new Date(timestamp) };
        service.addLog(duplicateEvent);

        expect(service.events.length).toBe(1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((service as any)['updateFilteredEvents']).not.toHaveBeenCalled();
    });

    it('should show door opened notification and emit log', () => {
        const data: ToggleDoorStateRes = {
            boardGame: standardBoard,
            listOfPlayers: [MOCK_PLAYER],
            doorPosition: { x: 1, y: 2 },
            activePlayer: MOCK_PLAYER,
            doorState: true,
            successful: false,
            message: '',
        };

        service.showLogToggleDoorNotification(data);

        expect(mockPlayerSocketService.emitLog).toHaveBeenCalled();
        const logEvent = mockPlayerSocketService.emitLog.calls.mostRecent().args[1] as GameEvent;

        expect(logEvent.message).toBe(`${service['colorLogName'](MOCK_PLAYER.name)} a ouvert la porte`);
        expect(logEvent.type).toBe(GameEventType.DoorState);
        expect(logEvent.player).toEqual([MOCK_PLAYER.name]);
    });

    it('should show door closed notification and emit log', () => {
        const data: ToggleDoorStateRes = {
            boardGame: standardBoard,
            listOfPlayers: [MOCK_PLAYER],
            doorPosition: { x: 1, y: 2 },
            activePlayer: MOCK_PLAYER,
            doorState: false,
            successful: false,
            message: '',
        };

        service.showLogToggleDoorNotification(data);

        expect(mockPlayerSocketService.emitLog).toHaveBeenCalled();
        const logEvent = mockPlayerSocketService.emitLog.calls.mostRecent().args[1] as GameEvent;

        expect(logEvent.message).toBe(`${service['colorLogName'](MOCK_PLAYER.name)} a fermé la porte`);
        expect(logEvent.type).toBe(GameEventType.DoorState);
        expect(logEvent.player).toEqual([MOCK_PLAYER.name]);
    });

    it('should show end game notification and emit log', () => {
        service.showLogEndNotification();

        expect(mockPlayerSocketService.emitLog).toHaveBeenCalled();
        const logEvent = mockPlayerSocketService.emitLog.calls.mostRecent().args[1] as GameEvent;

        const planerNames = STANDARD_PLAYERS.map((player) => service['colorLogName'](player.name));

        expect(logEvent.message).toBe(`Il reste ${planerNames.join(', ')} dans la partie`);
        expect(logEvent.type).toBe(GameEventType.EndGame);
        expect(logEvent.player).toEqual([planerNames.join(', ')]);
    });

    it('should show debug mode activated notification and emit log', () => {
        mockGameSessionManagerService.debugModeStatus.and.returnValue(false);
        service.showToggleDebugModeNotification();
        expect(mockPlayerSocketService.emitLog).toHaveBeenCalled();
        let logEvent = mockPlayerSocketService.emitLog.calls.mostRecent().args[1] as GameEvent;

        expect(logEvent.message).toBe(`${service['colorLogName'](MOCK_PLAYER.name)} a activé le mode débogage`);
        expect(logEvent.type).toBe(GameEventType.DebugMode);
        expect(logEvent.player).toEqual([MOCK_PLAYER.name]);

        mockGameSessionManagerService.debugModeStatus.and.returnValue(true);
        service.showToggleDebugModeNotification();
        expect(mockPlayerSocketService.emitLog).toHaveBeenCalled();
        logEvent = mockPlayerSocketService.emitLog.calls.mostRecent().args[1] as GameEvent;

        expect(logEvent.message).toBe(`${service['colorLogName'](MOCK_PLAYER.name)} a désactivé le mode débogage`);
        expect(logEvent.type).toBe(GameEventType.DebugMode);
        expect(logEvent.player).toEqual([MOCK_PLAYER.name]);
    });

    it('should show result fight notification and emit log', () => {
        const data: endFightNotification = {
            successful: false,
            message: '',
            winnerName: STANDARD_PLAYERS[0].name,
            loserName: STANDARD_PLAYERS[1].name,
        };

        service.showLogResultFightNotification(data);

        expect(mockPlayerSocketService.emitLog).toHaveBeenCalled();
        const logEvent = mockPlayerSocketService.emitLog.calls.mostRecent().args[1] as GameEvent;

        expect(logEvent.message).toBe(
            `${service['colorLogName'](STANDARD_PLAYERS[0].name)} a gagné et ${service['colorLogName'](STANDARD_PLAYERS[1].name)} a perdu le combat`,
        );
        expect(logEvent.type).toBe(GameEventType.EndFight);
        expect(logEvent.player).toEqual([STANDARD_PLAYERS[0].name, STANDARD_PLAYERS[1].name]);
    });

    it('should show end fight notification and emit log', () => {
        const data: endFightNotification = {
            successful: false,
            message: '',
            winnerName: STANDARD_PLAYERS[0].name,
            loserName: STANDARD_PLAYERS[1].name,
        };

        service.showLogEndFightNotification(data);

        expect(mockPlayerSocketService.emitLog).toHaveBeenCalled();
        const logEvent = mockPlayerSocketService.emitLog.calls.mostRecent().args[1] as GameEvent;

        expect(logEvent.message).toBe(
            `${service['colorLogName'](STANDARD_PLAYERS[0].name)} et ${service['colorLogName'](STANDARD_PLAYERS[1].name)} ont terminé le combat`,
        );
        expect(logEvent.type).toBe(GameEventType.EndFight);
        expect(logEvent.player).toEqual([STANDARD_PLAYERS[0].name, STANDARD_PLAYERS[1].name]);
    });

    it('should show turn notification and emit log', () => {
        service.showLogTurnNotification();

        expect(mockPlayerSocketService.emitLog).toHaveBeenCalled();
        const logEvent = mockPlayerSocketService.emitLog.calls.mostRecent().args[1] as GameEvent;

        expect(logEvent.message).toBe(`C'est le tour de : ${service['colorLogName'](MOCK_PLAYER.name)}`);
        expect(logEvent.type).toBe(GameEventType.StartTurn);
        expect(logEvent.player).toEqual([MOCK_PLAYER.name]);
    });

    it('should show first turn notification and emit log', () => {
        const data: StartGameData = {
            boardGame: standardBoard,
            listOfPlayers: STANDARD_PLAYERS,
            activePlayer: MOCK_PLAYER,
        };
        service.showFirstTurnNotification(data);

        expect(mockPlayerSocketService.emitLog).toHaveBeenCalled();
        const logEvent = mockPlayerSocketService.emitLog.calls.mostRecent().args[1] as GameEvent;

        expect(logEvent.message).toBe(`C'est le tour de: ${service['colorLogName'](MOCK_PLAYER.name)}`);
        expect(logEvent.type).toBe(GameEventType.StartTurn);
        expect(logEvent.player).toEqual([MOCK_PLAYER.name]);
    });

    it('should show abandon notification and emit log', () => {
        service.showLogAbandonNotification(MOCK_PLAYER);

        expect(mockPlayerSocketService.emitLog).toHaveBeenCalled();
        const logEvent = mockPlayerSocketService.emitLog.calls.mostRecent().args[1] as GameEvent;

        expect(logEvent.message).toBe(`${service['colorLogName'](MOCK_PLAYER.name)} a abandonné la partie`);
        expect(logEvent.type).toBe(GameEventType.AbandonGame);
        expect(logEvent.player).toEqual([MOCK_PLAYER.name]);
    });

    it('should show flag notification and emit log', () => {
        const data: PickUpItemRes = {
            successful: false,
            message: '',
            boardGame: standardBoard,
            listOfPlayers: [MOCK_PLAYER],
            activePlayer: MOCK_PLAYER,
            pickedItem: {
                type: ItemType.Flag,
                name: ITEM_NAMES.flag,
                description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.flag],
            },
        };

        service.showLogFlagNotification(data);

        expect(mockPlayerSocketService.emitLog).toHaveBeenCalled();
        const logEvent = mockPlayerSocketService.emitLog.calls.mostRecent().args[1] as GameEvent;

        expect(logEvent.message).toBe(`${service['colorLogName'](MOCK_PLAYER.name)} a ramassé le drapeau`);
        expect(logEvent.type).toBe(GameEventType.AbandonGame);
        expect(logEvent.player).toEqual([MOCK_PLAYER.name]);
    });

    it('should show item notification and emit log', () => {
        const data: PickUpItemRes = {
            successful: false,
            message: '',
            boardGame: standardBoard,
            listOfPlayers: [MOCK_PLAYER],
            activePlayer: MOCK_PLAYER,
            pickedItem: {
                type: ItemType.GameEditor,
                name: ITEM_NAMES.gameEditor2,
                description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.gameEditor2],
            },
        };

        service.showLogItemNotification(data);

        expect(mockPlayerSocketService.emitLog).toHaveBeenCalled();
        const logEvent = mockPlayerSocketService.emitLog.calls.mostRecent().args[1] as GameEvent;

        expect(logEvent.message).toBe(`${service['colorLogName'](MOCK_PLAYER.name)} a ramassé un item: ${ITEM_NAMES.gameEditor2}`);
        expect(logEvent.type).toBe(GameEventType.PickUpItem);
        expect(logEvent.player).toEqual([MOCK_PLAYER.name]);
    });

    it('should setFilter and call updateFilteredEvents', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spyOn(service as any, 'updateFilteredEvents');
        service.setFilter(true, MOCK_PLAYER.name);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((service as any)['updateFilteredEvents']).toHaveBeenCalled();
        // const logEvent = mockPlayerSocketService.emitLog.calls.mostRecent().args[1] as GameEvent;

        expect(service.isFiltered).toBeTrue();
        expect(service.playerName).toBe(MOCK_PLAYER.name);
        expect(service.events.length).toBe(0);
        expect(service.filteredEvents.length).toBe(0);
    });

    it('should update filtered events when isFiltered is true', () => {
        const event1: GameEvent = {
            message: 'Player joined',
            type: GameEventType.StartTurn,
            timestamp: new Date(),
            player: [STANDARD_PLAYERS[0].name],
        };
        const event2: GameEvent = {
            message: 'Player left',
            type: GameEventType.EndGame,
            timestamp: new Date(),
            player: [STANDARD_PLAYERS[1].name],
        };

        service.events = [event1, event2];
        service.isFiltered = true;
        service.playerName = STANDARD_PLAYERS[0].name;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        service['updateFilteredEvents']();

        expect(service.filteredEvents).toEqual([event1]);
    });

    it('should update filtered events when isFiltered is false', () => {
        const event1: GameEvent = {
            message: 'Player joined',
            type: GameEventType.StartTurn,
            timestamp: new Date(),
            player: ['Alice'],
        };
        const event2: GameEvent = {
            message: 'Player left',
            type: GameEventType.EndGame,
            timestamp: new Date(),
            player: ['Bob'],
        };

        service.events = [event1, event2];
        service.isFiltered = false;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        service['updateFilteredEvents']();

        expect(service.filteredEvents).toEqual([event1, event2]);
    });

    it('should retrieve the initial lenght of the player list', () => {
        const data: StartGameData = {
            boardGame: standardBoard,
            listOfPlayers: [MOCK_PLAYER],
            activePlayer: MOCK_PLAYER,
        };

        service.retrieveNumberOfPlayersInit(data);

        expect(service.numberOfPlayersInit).toEqual(data.listOfPlayers.length);
    });
});
