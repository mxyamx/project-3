import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CombatNotification, CombatNotificationService } from '@app/services/combat-notification/combat-notification.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-combat-notification',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './combat-notification.component.html',
    styleUrl: './combat-notification.component.scss',
})
export class CombatNotificationComponent implements OnInit, OnDestroy {
    notifications: CombatNotification[] = [];
    private subscription: Subscription | null = null;

    private notificationService: CombatNotificationService = inject(CombatNotificationService);
    ngOnInit(): void {
        this.subscription = this.notificationService.notifications$.subscribe((notifications) => {
            this.notifications = notifications;
        });
    }

    ngOnDestroy(): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}
