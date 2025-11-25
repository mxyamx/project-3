import { inject, Injectable } from '@angular/core';
import { EventLog } from '@common/game-event';
import * as dataForm from '@common/socket-data-forms';
import { UserManagerService } from '../user-manager/user-manager.service';

@Injectable({
    providedIn: 'root',
})
export class GameEventService {
    events: EventLog[] = [];
    filteredEvents: EventLog[] = [];
    isFiltered: boolean;
    numberOfPlayersInit: number = 0;

    private userManager = inject(UserManagerService);

    addLog(event: EventLog) {
        this.events.push(event);
        this.updateFilteredEvents();
    }

    setLogs(events: EventLog[]) {
        this.events = events;
        this.updateFilteredEvents();
    }

    retrieveNumberOfPlayersInit(data: dataForm.StartGameData): void {
        this.numberOfPlayersInit = data.listOfPlayers.length;
    }

    setFilter(isFiltered: boolean) {
        this.isFiltered = isFiltered;
        this.updateFilteredEvents();
    }

    private updateFilteredEvents() {
        if (this.isFiltered) {
            this.filteredEvents = this.events.filter((event) => event.playerIds.includes(this.userManager.currentUser().id));
        } else {
            this.filteredEvents = [...this.events];
        }
    }
}
