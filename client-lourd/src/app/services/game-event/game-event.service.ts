import { inject, Injectable } from '@angular/core';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { GameEventType } from '@common/enums/game-event-type';
import { GameEvent } from '@common/game-event';
import { Player } from '@common/player';
import * as dataForm from '@common/socket-data-forms';

//TODO:ADD KEY VALUE IN i18n JSON FILES FOR TRANSLATION!!! Whe should create an enum containing the all the logs key, so we add the key attribute
//to the GameEvent interface, when the user receives it he translates depending on the key, with that we send a string array containing
//the data like names, door state
@Injectable({
    providedIn: 'root',
})
export class GameEventService {
    events: GameEvent[] = [];
    filteredEvents: GameEvent[] = [];
    isFiltered: boolean;
    playerName: string = '';
    numberOfPlayersInit: number = 0;

    private gameSessionManagerService: GameSessionManagerService = inject(GameSessionManagerService);
    private playerSocketService: PlayerSocketService = inject(PlayerSocketService);

    addLog(event: GameEvent) {
        const formatTime = (date: Date) => {
            const time = new Date(date);
            return `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;
        };

        const isDuplicate = this.events.some(
            (eventLog) =>
                formatTime(eventLog.timestamp) === formatTime(event.timestamp) &&
                eventLog.message === event.message &&
                eventLog.type === event.type &&
                eventLog.player.length === event.player.length,
        );

        if (!isDuplicate) {
            this.events.push(event);
            this.updateFilteredEvents();
        }
    }

    showLogToggleDoorNotification(data: dataForm.ToggleDoorStateRes) {
        const gameEvent: GameEvent = {
            message: `${this.colorLogName(data.activePlayer.name)} a ${data.doorState ? 'ouvert' : 'fermé'} la porte`,
            timestamp: new Date(),
            type: GameEventType.DoorState,
            player: [data.activePlayer.name],
        };

        this.playerSocketService.emitLog(this.gameSessionManagerService.gameId(), gameEvent);
    }

    showFirstTurnNotification(data: dataForm.StartGameData) {
        const gameEvent: GameEvent = {
            message: `C'est le tour de: ${this.colorLogName(data.listOfPlayers[0].name)}`,
            timestamp: new Date(),
            type: GameEventType.StartTurn,
            player: [data.listOfPlayers[0].name],
        };

        this.playerSocketService.emitLog(this.gameSessionManagerService.gameId(), gameEvent);
    }

    showToggleDebugModeNotification() {
        const gameEvent: GameEvent = {
            message: `${this.colorLogName(this.gameSessionManagerService.chosenPlayer().name)} a ${
                this.gameSessionManagerService.debugModeStatus() ? 'désactivé' : 'activé'
            } le mode débogage`,
            timestamp: new Date(),
            type: GameEventType.DebugMode,
            player: [this.gameSessionManagerService.chosenPlayer().name],
        };

        this.playerSocketService.emitLog(this.gameSessionManagerService.gameId(), gameEvent);
    }

    showLogStartAttackNotification(data: dataForm.StartFightRes) {
        const defenderPlayer = this.colorLogName(this.gameSessionManagerService.defendingPlayer().name);
        const attackingPlayer = this.colorLogName(data.attackingPlayer.name);
        const gameEvent: GameEvent = {
            message: `${attackingPlayer} commence le combat avec ${defenderPlayer}`,
            timestamp: new Date(),
            type: GameEventType.StartFight,
            player: [data.attackingPlayer.name, this.gameSessionManagerService.defendingPlayer().name],
        };

        this.playerSocketService.emitLog(this.gameSessionManagerService.gameId(), gameEvent);
    }

    showLogAttackNotification(data: dataForm.ExecuteAttackRes) {
        const gameEvent: GameEvent = {
            message: `${this.colorLogName(data.attackingPlayer.name)} roule ${data.attackDice} \n 
            ${this.colorLogName(data.defendingPlayer.name)} roule ${data.defenseDice} \n
            ~   ${data.damageDoneAttackingPlayer} points de vie perdus    ~`,
            timestamp: new Date(),
            type: GameEventType.Fight,
            player: [this.gameSessionManagerService.attackingPlayer().name, this.gameSessionManagerService.defendingPlayer().name],
        };

        this.playerSocketService.emitCombatLog(this.gameSessionManagerService.gameId(), gameEvent);
    }

    showResultEscapeNotification(data: dataForm.EscapeAttemptRes) {
        const gameEvent: GameEvent = {
            message: `${this.colorLogName(data.escapingPlayer?.name ?? 'Un joueur inconnu')} essaie de s'évader contre ${this.colorLogName(
                data.defenderPlayer?.name ?? 'Un défendeur inconnu',
            )}.\n
             ${data.escapingPlayer?.name ?? 'Un joueur inconnu'} a ${this.colorLogName(
                 data.message.includes('escaped') ? 'réussi' : 'échoué',
             )} l'évasion`,
            timestamp: new Date(),
            type: GameEventType.Escape,
            player: [data.escapingPlayer?.name ?? 'Un joueur inconnu', data.defenderPlayer?.name ?? 'Un défendeur inconnu'],
        };

        this.playerSocketService.emitCombatLog(this.gameSessionManagerService.gameId(), gameEvent);
    }

    showLogEndNotification() {
        const listOfPlayers = this.gameSessionManagerService.listOfPlayers();
        const filteredPlayers = listOfPlayers
            .filter((player) => !player.isNotInGame)
            .map((player) => this.colorLogName(player.name))
            .join(', ');
        const gameEvent: GameEvent = {
            message: `Il reste ${filteredPlayers} dans la partie`,
            timestamp: new Date(),
            type: GameEventType.EndGame,
            player: [filteredPlayers],
        };

        this.playerSocketService.emitLog(this.gameSessionManagerService.gameId(), gameEvent);
    }

    showLogResultFightNotification(data: dataForm.endFightNotification) {
        const gameEvent: GameEvent = {
            message: `${this.colorLogName(data.winnerName)} a gagné et ${this.colorLogName(data.loserName)} a perdu le combat`,
            timestamp: new Date(),
            type: GameEventType.EndFight,
            player: [data.winnerName, data.loserName],
        };

        this.playerSocketService.emitLog(this.gameSessionManagerService.gameId(), gameEvent);
    }

    showLogEndFightNotification(data: dataForm.endFightNotification) {
        const gameEvent: GameEvent = {
            message: `${this.colorLogName(data.winnerName)} et ${this.colorLogName(data.loserName)} ont terminé le combat`,
            timestamp: new Date(),
            type: GameEventType.EndFight,
            player: [data.winnerName, data.loserName],
        };

        this.playerSocketService.emitLog(this.gameSessionManagerService.gameId(), gameEvent);
    }

    showLogTurnNotification() {
        const gameEvent: GameEvent = {
            message: `C'est le tour de : ${this.colorLogName(this.gameSessionManagerService.activePlayer().name)}`,
            timestamp: new Date(),
            type: GameEventType.StartTurn,
            player: [this.gameSessionManagerService.activePlayer().name],
        };

        this.playerSocketService.emitLog(this.gameSessionManagerService.gameId(), gameEvent);
    }

    showLogAbandonNotification(player: Player) {
        const gameEvent: GameEvent = {
            message: `${this.colorLogName(player.name)} a abandonné la partie`,
            timestamp: new Date(),
            type: GameEventType.AbandonGame,
            player: [player.name],
        };
        this.playerSocketService.emitLog(this.gameSessionManagerService.gameId(), gameEvent);
    }

    retrieveNumberOfPlayersInit(data: dataForm.StartGameData): void {
        this.numberOfPlayersInit = data.listOfPlayers.length;
    }

    showLogFlagNotification(data: dataForm.PickUpItemRes) {
        const gameEvent: GameEvent = {
            message: `${this.colorLogName(data.activePlayer.name)} a ramassé le drapeau`,
            timestamp: new Date(),
            type: GameEventType.AbandonGame,
            player: [data.activePlayer.name],
        };

        this.playerSocketService.emitLog(this.gameSessionManagerService.gameId(), gameEvent);
    }

    showLogItemNotification(data: dataForm.PickUpItemRes) {
        const gameEvent: GameEvent = {
            message: `${this.colorLogName(data.activePlayer.name)} a ramassé un item: ${data.pickedItem?.name}`,
            timestamp: new Date(),
            type: GameEventType.PickUpItem,
            player: [data.activePlayer.name],
        };

        this.playerSocketService.emitLog(this.gameSessionManagerService.gameId(), gameEvent);
    }

    setFilter(isFiltered: boolean, playerName: string) {
        this.isFiltered = isFiltered;
        this.playerName = playerName;
        this.updateFilteredEvents();
    }

    private updateFilteredEvents() {
        if (this.isFiltered) {
            this.filteredEvents = this.events.filter((event) => event.player.includes(this.playerName));
        } else {
            this.filteredEvents = [...this.events];
        }
    }

    private colorLogName(value: string | number, className = 'player-name'): string {
        return `<span class="${className}">${value}</span>`;
    }
}
