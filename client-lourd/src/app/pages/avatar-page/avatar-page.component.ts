import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AttributeFormComponent } from '@app/components/attribute-form/attribute-form.component';
import { AvatarImgComponent } from '@app/components/avatar-img/avatar-img.component';
import { DEFAULT_ATTRIBUTES_POINT } from '@app/constants/objects-constants';
import { ChatService } from '@app/services/chat/chat.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { GameEventService } from '@app/services/game-event/game-event.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { CharacterAttributes } from '@common/character-attributes';
import { CurrentGame } from '@common/current-game';
import { DiceBonus } from '@common/enums/dice-bonus';
import { PlayerLimits } from '@common/enums/players-limit';
import { UrlPage } from '@common/enums/url-page';
import { Player } from '@common/player';
import { TranslatePipe } from '@ngx-translate/core';
@Component({
    selector: 'app-avatar-page',
    imports: [ReactiveFormsModule, AvatarImgComponent, AttributeFormComponent, RouterLink, TranslatePipe],
    templateUrl: './avatar-page.component.html',
    styleUrls: ['./avatar-page.component.scss'],
})
export class AvatarPageComponent implements OnInit {
    formGroup = new FormGroup({
        name: new FormControl('', [Validators.required]),
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
    gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    private playerSocketService = inject(PlayerSocketService);
    private currentGameManager = inject(CurrentGameManagerService);
    private chatService = inject(ChatService);
    private gameEventService = inject(GameEventService);
    private gameId: string = '';
    private currentGame: CurrentGame;

    constructor(private router: Router) {}

    ngOnInit() {
        this.formGroup.valueChanges.subscribe(() => {
            this.updateButtonState();
        });
        this.formGroup.get('name')?.valueChanges.subscribe((value) => {
            if (value && value.trim() !== value) {
                this.formGroup.get('name')?.setValue(value.trim(), { emitEvent: false });
            }
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
            name: this.formGroup.value.name || '',
            character: this.formGroup.value.avatar || '',
            attributes,
            organizer: this.currentGame.players.length === 0,
            virtualPlayer: false,
            victories: 0,
            color: 'red',
        };

        this.playerSocketService.emitGetGame(this.gameId, (response: CurrentGame) => {
            if (!response) {
                this.notExistingError = true;
                return;
            }
            this.currentGame = response;
            if (response.locked) {
                this.lockedError = true;
                return;
            }
            const maxPlayers = PlayerLimits[response.boardGame.size].maxPlayers;
            if (response.players.length >= maxPlayers) {
                this.limitError = true;
                return;
            }
            player.name = this.currentGameManager.verifyUniquePlayerName(player.name, this.currentGame.players);

            this.gameSessionManager.updateChosenPlayer(player);

            this.playerSocketService.emitJoinGame(this.gameId, player, (joinResponse: CurrentGame) => {
                if (joinResponse) {
                    this.currentGameManager.addPlayer(player);
                    this.gameSessionManager.updateGameId(joinResponse.id);
                    this.router.navigate([UrlPage.Waiting]);
                }
            });
        });

        this.hasBeenClicked = true;
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
}
