import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CombatNotification, CombatNotificationService } from '@app/services/combat-notification/combat-notification.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import { CombatNotificationComponent } from './combat-notification.component';

describe('CombatNotificationComponent', () => {
    let component: CombatNotificationComponent;
    let fixture: ComponentFixture<CombatNotificationComponent>;
    let notificationServiceSpy: jasmine.SpyObj<CombatNotificationService>;
    let notificationsSubject: BehaviorSubject<CombatNotification[]>;

    beforeEach(async () => {
        notificationsSubject = new BehaviorSubject<CombatNotification[]>([]);

        notificationServiceSpy = jasmine.createSpyObj('CombatNotificationService', [], {
            notifications$: notificationsSubject.asObservable(),
        });

        await TestBed.configureTestingModule({
            imports: [CombatNotificationComponent],
            providers: [{ provide: CombatNotificationService, useValue: notificationServiceSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(CombatNotificationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should subscribe to notifications$ on init', () => {
        expect(component.notifications).toEqual([]);

        const mockNotifications: CombatNotification[] = [
            {
                id: 'test-id',
                message: 'Test message',
                icon: 'test-icon',
                type: 'victory',
                isVisible: true,
                position: 'top',
            },
        ];
        notificationsSubject.next(mockNotifications);

        expect(component.notifications).toEqual(mockNotifications);
    });

    it('should unsubscribe when destroyed', () => {
        const subscription = component['subscription'] as Subscription;
        const subscriptionSpy = spyOn(subscription, 'unsubscribe');

        component.ngOnDestroy();

        expect(subscriptionSpy).toHaveBeenCalled();
    });

    it('should handle undefined subscription on destroy', () => {
        component['subscription'] = null;

        expect(() => component.ngOnDestroy()).not.toThrow();
    });
});
