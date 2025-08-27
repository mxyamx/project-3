import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAX_LENGTH_MESSAGE } from '@app/constants/objects-constants';
import { ChatService } from '@app/services/chat/chat.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { BoardGame } from '@common/board-game';
import { CharacterAttributes } from '@common/character-attributes';
import { ChatMessage } from '@common/chat-message';
import { CurrentGame } from '@common/current-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameMode } from '@common/enums/game-mode';
import { Player } from '@common/player';
import { ChatComponent } from './chat.component';

describe('ChatComponent', () => {
    let component: ChatComponent;
    let fixture: ComponentFixture<ChatComponent>;
    let mockCurrentGameManagerService: jasmine.SpyObj<CurrentGameManagerService>;
    let mockGameSessionManagerService: jasmine.SpyObj<GameSessionManagerService>;
    let mockPlayerSocketService: jasmine.SpyObj<PlayerSocketService>;
    let mockChatService: jasmine.SpyObj<ChatService>;

    const attribute: CharacterAttributes = {
        attackValue: 4,
        defenseValue: 4,
        speedValue: 4,
        healthValue: 6,
        bonusAttack: DiceBonus.FourSideBonus,
        bonusDefense: DiceBonus.SixSideBonus,
    };
    const mockPlayer: Player = { name: 'Alice', character: 'a', attributes: attribute, organizer: true, virtualPlayer: false };

    beforeEach(async () => {
        mockCurrentGameManagerService = jasmine.createSpyObj('CurrentGameManagerService', ['displayedCurrentGame']);
        mockGameSessionManagerService = jasmine.createSpyObj('GameSessionManagerService', ['chosenPlayer']);
        mockChatService = jasmine.createSpyObj('ChatService', ['addMessage']);
        mockPlayerSocketService = jasmine.createSpyObj('PlayerSocketService', ['emitJoinChatRoom', 'emitSendMessage']);
        mockPlayerSocketService.onNewMessage = jasmine.createSpy('onNewMessage');

        await TestBed.configureTestingModule({
            declarations: [],
            imports: [FormsModule, ChatComponent],
            providers: [
                { provide: CurrentGameManagerService, useValue: mockCurrentGameManagerService },
                { provide: GameSessionManagerService, useValue: mockGameSessionManagerService },
                { provide: ChatService, useValue: mockChatService },
                { provide: PlayerSocketService, useValue: mockPlayerSocketService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ChatComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize gameId and player on ngOnInit', () => {
        const mockBoardGame1: BoardGame = {
            id: 'bg1',
            name: 'Test Game 1',
            description: 'A test game',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: [[]],
            previewImage: 'asset1',
            visibility: true,
            lastModified: new Date(),
        };
        const mockGame: CurrentGame = {
            id: '1234',
            locked: false,
            players: [],
            boardGame: mockBoardGame1,
        };

        mockCurrentGameManagerService.displayedCurrentGame.and.returnValue(mockGame);
        mockGameSessionManagerService.chosenPlayer.and.returnValue(mockPlayer);

        component.ngOnInit();

        expect(component.gameId).toBe('1234');
        expect(component.player).toEqual(mockPlayer);
    });

    it('should set gameId to null when displayedCurrentGame returns null or undefined', () => {
        mockCurrentGameManagerService.displayedCurrentGame.and.returnValue(null as unknown as CurrentGame);
        component.ngOnInit();
        expect(component.gameId).toBeNull();
    });

    it('should add message to chatService when receiving new message from socket', () => {
        const newMessage: ChatMessage = { text: 'Salut!', sender: 'Bob', timestamp: new Date() };

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        let callbackFn: (message: ChatMessage) => void = () => {};
        mockPlayerSocketService.onNewMessage.and.callFake((cb) => (callbackFn = cb));

        component.configureBaseSocketFeatures();

        callbackFn(newMessage);

        expect(mockChatService.addMessage).toHaveBeenCalledWith(newMessage);
    });

    it('should truncate the message if it exceeds MAX_LENGTH_MESSAGE', () => {
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        const longMessage = 'a'.repeat(MAX_LENGTH_MESSAGE + 10);
        component.player = mockPlayer;
        component.gameId = 'game-id';
        component.messageInput = longMessage;

        component.sendToRoom();

        expect(mockPlayerSocketService.emitSendMessage).toHaveBeenCalledWith(
            'game-id',
            jasmine.objectContaining({
                text: 'a'.repeat(MAX_LENGTH_MESSAGE),
                sender: 'Alice',
            }),
        );
        expect(component.messageInput).toBe('');
    });
});
