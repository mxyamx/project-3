import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { GameEventService } from '@app/services/game-event/game-event.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-event-log',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './event-log.component.html',
    styleUrl: './event-log.component.scss',
})
export class EventLogComponent implements OnInit, AfterViewInit {
    @ViewChild('scroll') private eventLogContainer: ElementRef;

    isFiltered: boolean;
    gameEventService = inject(GameEventService);
    userManager = inject(UserManagerService);

    ngOnInit() {
        this.isFiltered = true;
        this.filteredEventsButton();
    }
    ngAfterViewInit(): void {
        this.bottom();
    }

    replaceNewlines(message: string): string {
        return message.replace(/\n/g, '<br>');
    }

    bottom(): void {
        setTimeout(() => this.scrollToBottom(), 0);
    }

    filteredEventsButton() {
        this.isFiltered = !this.isFiltered;
        this.gameEventService.setFilter(this.isFiltered);
    }

    private scrollToBottom(): void {
        try {
            this.eventLogContainer.nativeElement.scrollTop = this.eventLogContainer.nativeElement.scrollHeight;
        } catch (err) {
            return;
        }
    }
}
