import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { CurrentGame } from '@common/current-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameMode } from '@common/enums/game-mode';
import { PlayerLimits } from '@common/enums/players-limit';
import { Player } from '@common/player';
import { AvatarPageComponent } from './avatar-page.component';

describe('AvatarPageComponent', () => {
    let component: AvatarPageComponent;
    let fixture: ComponentFixture<AvatarPageComponent>;
    let mockCurrentGameManager: jasmine.SpyObj<CurrentGameManagerService>;
    let mockGameSessionManager: jasmine.SpyObj<GameSessionManagerService>;
    let mockPlayerSocketService: jasmine.SpyObj<PlayerSocketService>;

    const mockCurrentGame: CurrentGame = {
        id: '1234',
        locked: false,
        players: [],
        boardGame: {
            id: 'bg1',
            name: 'Test Game',
            description: 'A test game',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: [],
            previewImage: '',
            visibility: true,
            lastModified: new Date(),
        },
    };

    beforeEach(async () => {
        mockCurrentGameManager = jasmine.createSpyObj('CurrentGameManagerService', ['displayedCurrentGame', 'verifyUniquePlayerName', 'addPlayer']);
        mockGameSessionManager = jasmine.createSpyObj('GameSessionManagerService', ['updateChosenPlayer', 'updateGameId']);
        mockPlayerSocketService = jasmine.createSpyObj('PlayerSocketService', [
            'emitGetGame',
            'emitGetSelectedAvatars',
            'onAvatarListUpdated',
            'emitAvatarSelection',
            'emitAvatarDeselection',
            'emitJoinGame',
            'emitDeleteGame',
        ]);

        mockCurrentGameManager.displayedCurrentGame.and.returnValue(mockCurrentGame);
        mockPlayerSocketService.emitGetGame.and.callFake((id, callback) => callback(mockCurrentGame));

        await TestBed.configureTestingModule({
            declarations: [],
            imports: [ReactiveFormsModule, AvatarPageComponent],
            providers: [
                { provide: CurrentGameManagerService, useValue: mockCurrentGameManager },
                { provide: GameSessionManagerService, useValue: mockGameSessionManager },
                { provide: PlayerSocketService, useValue: mockPlayerSocketService },
                provideRouter([]),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AvatarPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize form and subscribe to value changes', () => {
        component.ngOnInit();
        expect(component.formGroup).toBeDefined();
        expect(component.formGroup.get('name')).toBeDefined();
        expect(component.formGroup.get('avatar')).toBeDefined();
        expect(component.formGroup.get('attributes')).toBeDefined();
        expect(component.formGroup.get('bonus')).toBeDefined();
    });

    it('should fetch game data on init', () => {
        mockCurrentGameManager.displayedCurrentGame.and.returnValue(mockCurrentGame);
        mockPlayerSocketService.emitGetGame.and.callFake((id, callback) => callback(mockCurrentGame));

        component.ngOnInit();

        expect(mockCurrentGameManager.displayedCurrentGame).toHaveBeenCalled();
        expect(mockPlayerSocketService.emitGetGame).toHaveBeenCalledWith(mockCurrentGame.id, jasmine.any(Function));
    });

    it('should handle avatar selection', () => {
        const selectedImage = 'avatar1';
        mockPlayerSocketService.emitAvatarSelection.and.callFake((id, avatar, callback) => callback([selectedImage]));

        component.onImageSelected(selectedImage);

        expect(mockPlayerSocketService.emitAvatarSelection).toHaveBeenCalledWith(mockCurrentGame.id, selectedImage, jasmine.any(Function));
        expect(component.selectedAvatars.has(selectedImage)).toBeTrue();
        expect(component.currentSelectedAvatar).toBe(selectedImage);
    });

    it('should handle avatar deselection', () => {
        const selectedImage = 'avatar1';
        component.currentSelectedAvatar = selectedImage;
        mockPlayerSocketService.emitAvatarDeselection.and.callFake((id, avatar, callback) => callback([]));

        component.onImageSelected('');

        expect(mockPlayerSocketService.emitAvatarDeselection).toHaveBeenCalledWith(mockCurrentGame.id, selectedImage, jasmine.any(Function));
        expect(component.selectedAvatars.has(selectedImage)).toBeFalse();
        expect(component.currentSelectedAvatar).toBeNull();
    });

    it('should update button state on form changes', () => {
        component.ngOnInit();
        component.formGroup.patchValue({
            name: 'Alice',
            avatar: 'avatar1',
            attributes: {
                attackValue: 4,
                defenseValue: 4,
                speedValue: 4,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            bonus: 'bonus1',
        });

        expect(component.isButtonDisabled).toBeFalse();
    });

    it('should show visibility alert on confirmation', () => {
        component.formGroup.patchValue({
            name: 'Alice',
            avatar: 'avatar1',
            attributes: {
                attackValue: 4,
                defenseValue: 4,
                speedValue: 4,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            bonus: 'bonus1',
        });
        component.confirmation();
        expect(component.showVisibilityAlert).toBeTrue();
    });

    it('should hide visibility alert on cancel', () => {
        component.showVisibilityAlert = true;
        component.cancelAlert();
        expect(component.showVisibilityAlert).toBeFalse();
    });

    it('should create character and join game', () => {
        const player: Player = {
            name: 'Alice',
            character: 'avatar1',
            attributes: {
                attackValue: 4,
                defenseValue: 4,
                speedValue: 4,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: true,
            virtualPlayer: false,
            victories: 0,
            color: 'red',
        };

        mockCurrentGameManager.displayedCurrentGame.and.returnValue(mockCurrentGame);
        mockPlayerSocketService.emitGetGame.and.callFake((id, callback) => callback(mockCurrentGame));
        mockCurrentGameManager.verifyUniquePlayerName.and.returnValue(player.name);

        component.formGroup.patchValue({
            name: player.name,
            avatar: player.character,
            attributes: player.attributes,
            bonus: 'bonus1',
        });

        component.createCharacter();

        expect(mockGameSessionManager.updateChosenPlayer).toHaveBeenCalledWith(player);
        expect(mockPlayerSocketService.emitJoinGame).toHaveBeenCalledWith(mockCurrentGame.id, player, jasmine.any(Function));
    });

    it('should handle errors when game is locked or full', () => {
        const lockedGame: CurrentGame = { ...mockCurrentGame, locked: true };
        const fullGame: CurrentGame = { ...mockCurrentGame, players: Array(PlayerLimits[mockCurrentGame.boardGame.size].maxPlayers).fill({}) };

        mockPlayerSocketService.emitGetGame.and.callFake((id, callback) => callback(lockedGame));
        component.createCharacter();
        expect(component.lockedError).toBeTrue();

        mockPlayerSocketService.emitGetGame.and.callFake((id, callback) => callback(fullGame));
        component.createCharacter();
        expect(component.limitError).toBeTrue();
    });

    it('should retry after error', () => {
        component.lockedError = true;
        component.limitError = true;
        component.retry();
        expect(component.lockedError).toBeFalse();
        expect(component.limitError).toBeFalse();
    });

    it('should trim whitespace from name input', () => {
        const nameControl = component.formGroup.get('name');
        nameControl?.setValue('  Alice  ');

        expect(nameControl?.value).toBe('Alice');
    });

    it('should fetch selected avatars on init', () => {
        const avatars = ['avatar1', 'avatar2'];
        mockPlayerSocketService.emitGetSelectedAvatars.and.callFake((id, callback) => callback(avatars));

        component.ngOnInit();

        expect(mockPlayerSocketService.emitGetSelectedAvatars).toHaveBeenCalledWith(mockCurrentGame.id, jasmine.any(Function));
        expect(component.selectedAvatars).toEqual(new Set(avatars));
    });

    it('should navigate to home if gameId is not defined', () => {
        const game: CurrentGame = { ...mockCurrentGame, id: null as unknown as string };
        mockCurrentGameManager.displayedCurrentGame.and.returnValue(game);

        component.ngOnInit();
    });

    it('should update selected avatars on avatar list update', () => {
        const avatars = ['avatar1', 'avatar2'];
        mockPlayerSocketService.onAvatarListUpdated.and.callFake((callback) => callback(avatars));

        component.ngOnInit();

        expect(component.selectedAvatars).toEqual(new Set(avatars));
    });

    it('should delete game if admin quits and no players are left', () => {
        const game: CurrentGame = { ...mockCurrentGame, players: [] };
        mockCurrentGameManager.displayedCurrentGame.and.returnValue(game);

        component.deleteGameOnAdminQuit();

        expect(mockPlayerSocketService.emitDeleteGame).toHaveBeenCalledWith(mockCurrentGame.id);
    });

    it('should deselect avatar when player quits', () => {
        component.currentSelectedAvatar = 'avatar1';
        mockPlayerSocketService.emitAvatarDeselection.and.callFake((id, avatar, callback) => callback([]));

        component.deselectAvatarOnPlayerQuit();

        expect(mockPlayerSocketService.emitAvatarDeselection).toHaveBeenCalledWith(mockCurrentGame.id, 'avatar1', jasmine.any(Function));
        expect(component.selectedAvatars.size).toBe(0);
        expect(component.currentSelectedAvatar).toBeNull();
    });

    it('should not select an avatar if it is already selected', () => {
        component.selectedAvatars = new Set(['avatar1']);
        spyOn(component, 'onImageSelected').and.callThrough();

        component.onImageSelected('avatar1');
    });

    it('should deselect current avatar when a new avatar is selected', () => {
        component.currentSelectedAvatar = 'avatar1';
        mockPlayerSocketService.emitAvatarDeselection.and.callFake((id, avatar, callback) => callback([]));

        component.onImageSelected('avatar2');

        expect(mockPlayerSocketService.emitAvatarDeselection).toHaveBeenCalledWith(mockCurrentGame.id, 'avatar1', jasmine.any(Function));
        expect(component.selectedAvatars.size).toBe(0);
        expect(component.currentSelectedAvatar).toBeNull();
    });

    it('should return if updatedAvatars is not an array', () => {
        mockPlayerSocketService.emitAvatarSelection.and.callFake((id, avatar, callback) => callback(null as unknown as string[]));

        component.onImageSelected('avatar1');

        expect(component.selectedAvatars.size).toBe(0);
    });

    it('should call confirmation on form submission if form is valid', () => {
        const event = new Event('submit');
        spyOn(event, 'preventDefault');
        spyOn(component, 'confirmation');

        component.formGroup.patchValue({
            name: 'Alice',
            avatar: 'avatar1',
            attributes: {
                attackValue: 4,
                defenseValue: 4,
                speedValue: 4,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            bonus: 'bonus1',
        });

        component.submit(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(component.confirmation).toHaveBeenCalled();
    });

    it('should set notExistingError to true when game response is falsy', () => {
        const mockPlayer = {
            name: 'TestPlayer',
            character: 'avatar1',
            attributes: {
                attackValue: 5,
                defenseValue: 5,
                speedValue: 5,
                healthValue: 5,
                bonusAttack: DiceBonus.SixSideBonus,
                bonusDefense: DiceBonus.FourSideBonus,
            },
            organizer: false,
            virtualPlayer: false,
        } as Player;

        component.formGroup.setValue({
            name: mockPlayer.name,
            avatar: mockPlayer.character,
            attributes: mockPlayer.attributes,
            bonus: '',
        });

        mockPlayerSocketService.emitGetGame.and.callFake((gameId, callback) => {
            callback(null as unknown as CurrentGame);
        });

        component.createCharacter();

        expect(component.notExistingError).toBeTrue();
        expect(mockPlayerSocketService.emitJoinGame).not.toHaveBeenCalled();
    });

    it('should hide alert and create character', () => {
        spyOn(component, 'createCharacter');

        component.hideAlert();

        expect(component.showVisibilityAlert).toBeFalse();
        expect(component.createCharacter).toHaveBeenCalled();
    });

    it('should navigate to waiting page if join response is received', () => {
        mockPlayerSocketService.emitGetGame.and.callFake((id, callback) => callback(mockCurrentGame));
        mockPlayerSocketService.emitJoinGame.and.callFake((id, player, callback) => callback(mockCurrentGame));

        component.createCharacter();
    });
});
