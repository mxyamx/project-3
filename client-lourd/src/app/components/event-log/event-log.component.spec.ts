import { ComponentFixture, TestBed } from '@angular/core/testing';
import { STANDARD_PLAYERS } from '@app/constants/development-constants';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { GameEventService } from '@app/services/game-event/game-event.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { GameEventType } from '@common/enums/game-event-type';
import { GameEvent } from '@common/game-event';
import { Player } from '@common/player';
import { EventLogComponent } from './event-log.component';

const MOCK_PLAYER: Player = STANDARD_PLAYERS[0];

describe('EventLogComponent', () => {
    let component: EventLogComponent;
    let fixture: ComponentFixture<EventLogComponent>;
    let mockGameEventService: jasmine.SpyObj<GameEventService>;
    let mockSocketClientService: jasmine.SpyObj<SocketClientService>;
    let mockGameSessionManagerService: jasmine.SpyObj<GameSessionManagerService>;
    let mockPlayerSocketService: jasmine.SpyObj<PlayerSocketService>;

    beforeEach(async () => {
        mockGameEventService = jasmine.createSpyObj('GameEventService', ['addLog', 'setFilter', 'updateFilteredEvents']);
        mockGameSessionManagerService = jasmine.createSpyObj('GameSessionManagerService', ['chosenPlayer', 'listOfPlayers', 'gameId']);
        mockSocketClientService = jasmine.createSpyObj('SocketClientService', ['on', 'emitJoinLogRoom', 'emitLog']);

        mockGameSessionManagerService.chosenPlayer.and.returnValue(MOCK_PLAYER);
        mockGameSessionManagerService.listOfPlayers.and.returnValue([MOCK_PLAYER]);
        mockPlayerSocketService = jasmine.createSpyObj('PlayerSocketService', ['emitJoinLogRoom', 'onChangeLog', 'onCombatLog']);

        await TestBed.configureTestingModule({
            imports: [EventLogComponent],
            providers: [
                { provide: GameEventService, useValue: mockGameEventService },
                { provide: GameSessionManagerService, useValue: mockGameSessionManagerService },
                { provide: PlayerSocketService, useValue: mockPlayerSocketService },
                { provide: SocketClientService, useValue: mockSocketClientService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EventLogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should toggle filtering and call setFilter on GameEventService', () => {
        component.filteredEventsButton();
        expect(mockGameEventService.setFilter).toHaveBeenCalledWith(false, MOCK_PLAYER.name);
    });

    it('should call addLog on non-fight events from onChangeLog', () => {
        const callback = (TestBed.inject(PlayerSocketService) as jasmine.SpyObj<PlayerSocketService>).onChangeLog.calls.argsFor(0)[0];

        const event: GameEvent = {
            message: 'Test log',
            type: GameEventType.DebugMode,
            timestamp: new Date(),
            player: ['Alice'],
        };

        callback(event);
        expect(mockGameEventService.addLog).toHaveBeenCalledWith(event);
    });

    it('should call addLog on fight events from onCombatLog', () => {
        const callback = (TestBed.inject(PlayerSocketService) as jasmine.SpyObj<PlayerSocketService>).onCombatLog.calls.argsFor(0)[0];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component.currentPlayer = { name: 'Alice' } as any;
        const event: GameEvent = {
            message: 'Test log 2',
            type: GameEventType.Escape,
            timestamp: new Date(),
            player: ['Alice'],
        };

        callback(event);
        expect(mockGameEventService.addLog).toHaveBeenCalledWith(event);
    });

    it('should replace newline characters with <br>', () => {
        const input = 'Line 1\nLine 2\nLine 3';
        const expectedOutput = 'Line 1<br>Line 2<br>Line 3';

        const result = component.replaceNewlines(input);
        expect(result).toEqual(expectedOutput);
    });

    it('should not throw if scrollToBottom throws (catch block is triggered)', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component['eventLogContainer'] = {
            nativeElement: {
                get scrollTop() {
                    throw new Error('Simulated error');
                },
                get scrollHeight() {
                    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
                    return 100;
                },
            },
        };

        expect(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (component as any).scrollToBottom();
        }).not.toThrow();
    });
});
