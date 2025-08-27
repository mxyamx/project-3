import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { GameEventService } from '@app/services/game-event/game-event.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { GameEventType } from '@common/enums/game-event-type';
import { GameEvent } from '@common/game-event';
import { Player } from '@common/player';

@Component({
    selector: 'app-event-log',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './event-log.component.html',
    styleUrl: './event-log.component.scss',
})
export class EventLogComponent implements OnInit {
    @ViewChild('scroll') private eventLogContainer: ElementRef;

    currentPlayer: Player;
    playerList: Player[] = [];
    isFiltered: boolean;
    gameEventService = inject(GameEventService);
    private gameSessionManager = inject(GameSessionManagerService);
    private playerSocketService = inject(PlayerSocketService);

    ngOnInit() {
        this.isFiltered = true;
        this.currentPlayer = this.gameSessionManager.chosenPlayer();
        this.playerList = this.gameSessionManager.listOfPlayers();

        this.playerSocketService.emitJoinLogRoom(this.gameSessionManager.gameId());
        this.configureBaseSocketFeatures();
        this.filteredEventsButton();
    }

    replaceNewlines(message: string): string {
        return message.replace(/\n/g, '<br>');
    }

    configureBaseSocketFeatures() {
        this.playerSocketService.onChangeLog((gameEvent: GameEvent) => {
            if (gameEvent.type !== GameEventType.Fight && gameEvent.type !== GameEventType.Escape) {
                this.gameEventService.addLog(gameEvent);
                setTimeout(() => this.scrollToBottom(), 0);
            }
        });

        this.playerSocketService.onCombatLog((gameEvent: GameEvent) => {
            if (gameEvent.player.includes(this.currentPlayer.name)) {
                this.gameEventService.addLog(gameEvent);
                setTimeout(() => this.scrollToBottom(), 0);
            }
        });
    }
    filteredEventsButton() {
        this.isFiltered = !this.isFiltered;
        const currentPlayerName = this.gameSessionManager.chosenPlayer().name;
        this.gameEventService.setFilter(this.isFiltered, currentPlayerName);
    }

    private scrollToBottom(): void {
        try {
            this.eventLogContainer.nativeElement.scrollTop = this.eventLogContainer.nativeElement.scrollHeight;
        } catch (err) {
            return;
        }
    }
}
