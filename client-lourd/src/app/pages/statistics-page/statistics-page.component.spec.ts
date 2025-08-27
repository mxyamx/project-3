import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { StatisticsPageComponent } from './statistics-page.component';

describe('StatisticsPageComponent', () => {
    let component: StatisticsPageComponent;
    let fixture: ComponentFixture<StatisticsPageComponent>;
    let mockChatComponent: jasmine.SpyObj<ChatComponent>;
    let mockSocketService: jasmine.SpyObj<SocketClientService>;

    beforeEach(async () => {
        mockChatComponent = jasmine.createSpyObj('ChatComponent', ['joinRoom']);
        mockSocketService = jasmine.createSpyObj('SocketClientService', ['isSocketAlive', 'connect', 'emit', 'on']);
        await TestBed.configureTestingModule({
            imports: [StatisticsPageComponent],
            providers: [
                { provide: ActivatedRoute, useValue: {} },
                { provide: ChatComponent, useValue: mockChatComponent },
                { provide: SocketClientService, useValue: mockSocketService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(StatisticsPageComponent);
        component = fixture.componentInstance;

        component.chat = mockChatComponent;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
