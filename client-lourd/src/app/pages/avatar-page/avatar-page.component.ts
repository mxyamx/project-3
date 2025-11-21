import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AttributeFormComponent } from '@app/components/attribute-form/attribute-form.component';
import { AvatarImgComponent } from '@app/components/avatar-img/avatar-img.component';
import { EMPTY_CODE } from '@app/constants/development-constants';
import { DEFAULT_ATTRIBUTES_POINT } from '@app/constants/objects-constants';
import { ChatService } from '@app/services/chat/chat.service';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { GameEventService } from '@app/services/game-event/game-event.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { StatisticsManagerService } from '@app/services/statistics-manager/statistics-manager.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { CharacterAttributes } from '@common/character-attributes';
import { CurrentGame, CurrentGamePhase, JoinGameAck } from '@common/current-game';
import { DiceBonus } from '@common/enums/dice-bonus';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { UrlPage } from '@common/enums/url-page';
import { GameEvent } from '@common/game-event';
import { Player } from '@common/player';
import { UpdateGamedRes } from '@common/socket-data-forms';
import { TranslatePipe } from '@ngx-translate/core';
@Component({
    selector: 'app-avatar-page',
    imports: [ReactiveFormsModule, AvatarImgComponent, AttributeFormComponent, RouterLink, TranslatePipe],
    templateUrl: './avatar-page.component.html',
    styleUrls: ['./avatar-page.component.scss'],
})
export class AvatarPageComponent implements OnInit, OnDestroy {
    formGroup = new FormGroup({
        avatar: new FormControl<string | null>(null, [Validators.required]),
        attributes: new FormControl<CharacterAttributes | null>(null, [Validators.required]),
        bonus: new FormControl('', [Validators.required]),
    });

    showVisibilityAlert: boolean = false;
    isButtonDisabled: boolean = true;

    lockedError: boolean = false;
    limitError: boolean = false;
    notExistingError: boolean = false;

    selectedAvatars: Set<string> = new Set();
    currentSelectedAvatar: string | null = null;
    hasBeenClicked: boolean = false;
    joiningRoom: boolean = false;
    gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    userManagerService: UserManagerService = inject(UserManagerService);
    private playerSocketService = inject(PlayerSocketService);
    private currentGameManager = inject(CurrentGameManagerService);
    private chatService = inject(ChatService);
    private gameEventService = inject(GameEventService);
    private httpUserService = inject(HttpUserService);
    private gameId: string = '';
    private currentGame: CurrentGame;
    private socketManager: SocketClientService = inject(SocketClientService);
    private statisticsManager: StatisticsManagerService = inject(StatisticsManagerService);
    userManager = inject(UserManagerService);

    constructor(private router: Router) {}

    ngOnInit() {
        this.refreshUserData();
        this.socketManager.on(SocketClientEventNames.ServerError, () => {
            this.gameSessionManager.updateGameId(EMPTY_CODE);
            this.router.navigate([UrlPage.Error]);
        });
        this.formGroup.valueChanges.subscribe(() => {
            this.updateButtonState();
        });
        const idGame = this.currentGameManager.displayedCurrentGame().id;
        if (idGame) {
            this.gameId = idGame;
            this.playerSocketService.emitGetGame(idGame, (response: CurrentGame) => {
                if (response) {
                    this.currentGame = response;
                }
            });
            this.playerSocketService.emitGetSelectedAvatars(idGame, (avatars: string[]) => {
                this.selectedAvatars = new Set(avatars);
            });
        } else {
            this.router.navigate(['/home']);
        }

        this.playerSocketService.onAvatarListUpdated((avatars) => {
            this.selectedAvatars = new Set(avatars);
        });
    }

    ngOnDestroy(): void {
        if (!this.joiningRoom) {
            this.deleteGameOnAdminQuit();
            this.deselectAvatarOnPlayerQuit();
            this.refreshUserData();
        }
    }

    deleteGameOnAdminQuit() {
        if (this.currentGameManager.displayedCurrentGame().players.length === 0) {
            this.playerSocketService.emitDeleteGame(this.gameId);
        }
    }

    deselectAvatarOnPlayerQuit() {
        if (this.currentSelectedAvatar) {
            this.playerSocketService.emitAvatarDeselection(this.gameId, this.currentSelectedAvatar, (updatedAvatars: string[]) => {
                this.selectedAvatars = new Set(updatedAvatars);
                this.currentSelectedAvatar = null;
            });
        }
    }

    onImageSelected(selectedImage: string) {
        if (this.selectedAvatars.has(selectedImage)) {
            return;
        }

        if (selectedImage === '') {
            if (this.currentSelectedAvatar) {
                this.playerSocketService.emitAvatarDeselection(this.gameId, this.currentSelectedAvatar, (updatedAvatars: string[]) => {
                    this.selectedAvatars = new Set(updatedAvatars);
                    this.currentSelectedAvatar = null;
                });
            }
            this.formGroup.patchValue({ avatar: null }, { emitEvent: false });
            this.formGroup.updateValueAndValidity();
            return;
        }

        if (this.formGroup.get('avatar')?.value !== selectedImage) {
            if (this.currentSelectedAvatar) {
                this.playerSocketService.emitAvatarDeselection(this.gameId, this.currentSelectedAvatar, (updatedAvatars: string[]) => {
                    this.selectedAvatars = new Set(updatedAvatars);
                    this.currentSelectedAvatar = null;
                });
                this.formGroup.patchValue({ avatar: null }, { emitEvent: false });
            }
            this.playerSocketService.emitAvatarSelection(this.gameId, selectedImage, (updatedAvatars: string[]) => {
                if (Array.isArray(updatedAvatars)) {
                    this.selectedAvatars = new Set(updatedAvatars);
                    this.currentSelectedAvatar = selectedImage;
                } else {
                    return;
                }
            });
            this.formGroup.patchValue({ avatar: selectedImage });
        }

        this.formGroup.get('avatar')?.markAsTouched();
        this.formGroup.updateValueAndValidity();
    }

    submit(event: Event) {
        event.preventDefault();
        if (this.formGroup.valid) {
            this.confirmation();
        }
    }

    isFieldValid(fieldName: string) {
        const formControl = this.formGroup.get(fieldName);
        return formControl?.invalid && (formControl?.dirty || formControl?.touched);
    }

    updateButtonState() {
        this.isButtonDisabled = this.formGroup.invalid;
    }

    hideAlert() {
        this.showVisibilityAlert = false;
        this.createCharacter();
        this.chatService.roomMessages = [];
        this.gameEventService.events = [];
    }

    cancelAlert() {
        this.showVisibilityAlert = false;
    }

    confirmation() {
        if (!this.isButtonDisabled) {
            this.showVisibilityAlert = true;
        }
    }

    createCharacter() {
        const attributes: CharacterAttributes = this.formGroup.value.attributes || {
            attackValue: DEFAULT_ATTRIBUTES_POINT,
            defenseValue: DEFAULT_ATTRIBUTES_POINT,
            speedValue: DEFAULT_ATTRIBUTES_POINT,
            healthValue: DEFAULT_ATTRIBUTES_POINT,
            bonusAttack: DiceBonus.SixSideBonus,
            bonusDefense: DiceBonus.FourSideBonus,
        };

        const player: Player = {
            name: this.userManager.currentUser().username || '',
            userId: this.userManagerService.getCurrentUser().id,
            character: this.formGroup.value.avatar || '',
            attributes,
            organizer: this.currentGame.players.length === 0,
            virtualPlayer: false,
            victories: 0,
            color: 'red',
            socketId: this.socketManager.socket?.id || '',
            eliminated: false,
        };

        this.playerSocketService.emitJoinGame(this.gameId, player, (response: JoinGameAck) => {
            if (response.codeError) {
                this.notExistingError = response.codeError;
                return;
            }
            if (response.lockedError) {
                this.lockedError = response.lockedError;
                return;
            }
            if (response.limitError) {
                this.limitError = response.limitError;
                return;
            }
            if (!response.player || !response.game) {
                this.notExistingError = true;
                return;
            }
            this.joiningRoom = true;
            this.hasBeenClicked = true;
            this.currentGameManager.addPlayer(response.player);
            if (response.game.phase === CurrentGamePhase.Running && response.updateGamedRes) {
                this.gameSessionManager.updateChosenPlayer(response.player);
                this.gameSessionManager.updateGameId(response.game.id);
                this.joinRunningGame(response.updateGamedRes);
                return;
            }
            this.gameSessionManager.updateChosenPlayer(response.player);
            this.gameSessionManager.updateGameId(response.game.id);
            this.router.navigate([UrlPage.Waiting]);
        });
    }

    error(): boolean {
        return this.lockedError || this.limitError || this.notExistingError;
    }

    retry() {
        this.lockedError = false;
        this.limitError = false;
        this.notExistingError = false;
        this.hasBeenClicked = false;
    }

    joinRunningGame(data: UpdateGamedRes): void {
        if (data.boardGame && data.listOfPlayers) {
            this.gameSessionManager.updateListOfPlayers(data.listOfPlayers);
            this.gameEventService.retrieveNumberOfPlayersInit(data);
            this.gameSessionManager.updateBoardGame(data.boardGame);
            this.gameSessionManager.updateActivePlayer(data.activePlayer);
            this.gameSessionManager.updateDisplayedList(structuredClone(data.listOfPlayers));
            this.statisticsManager.reset();

            this.router.navigate([UrlPage.Game]);

            const newChosenPlayer: Player | undefined = data.listOfPlayers.find((player: Player) => {
                return player.name === this.gameSessionManager.chosenPlayer().name;
            });
            if (newChosenPlayer) this.gameSessionManager.updateChosenPlayer(newChosenPlayer);
        }
        this.playerSocketService.onChangeLog((gameEvent: GameEvent) => {
            this.gameEventService.addLog(gameEvent);
        });
    }
    private refreshUserData(): void {
        const userId = this.userManagerService.getCurrentUser().id;
        this.httpUserService.getUser(userId).subscribe({
            next: (user) => {
                this.userManagerService.setMoney(user.money);
            },
            error: (err) => console.error('Failed to refresh user data:', err),
        });
    }
}
