import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CodeInputComponent } from '@app/components/code-input-component/code-input-component';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { EnteringCurrentGamePageComponent } from './entering-current-game-page';
import { UrlPage } from '@common/enums/url-page';

describe('EnteringCurrentGamePageComponent', () => {
    let component: EnteringCurrentGamePageComponent;
    let fixture: ComponentFixture<EnteringCurrentGamePageComponent>;
    let mockPlayerSocketService: jasmine.SpyObj<PlayerSocketService>;
    let router: Router;

    beforeEach(async () => {
        mockPlayerSocketService = jasmine.createSpyObj('PlayerSocketService', ['emitJoinAvatarRoom', 'connect']);

        await TestBed.configureTestingModule({
            imports: [EnteringCurrentGamePageComponent, CodeInputComponent],
            providers: [{ provide: PlayerSocketService, useValue: mockPlayerSocketService }, provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(EnteringCurrentGamePageComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should navigate to avatar page and emit join avatar room when canJoinGame is called with true', () => {
        spyOn(router, 'navigate');
        component.gameId = '1234';

        component.canJoinGame(true);

        expect(router.navigate).toHaveBeenCalledWith([UrlPage.Avatar]);
        expect(mockPlayerSocketService.emitJoinAvatarRoom).toHaveBeenCalledWith('1234');
    });

    it('should do nothing when canJoinGame is called with false', () => {
        spyOn(router, 'navigate');

        component.canJoinGame(false);

        expect(router.navigate).not.toHaveBeenCalled();
        expect(mockPlayerSocketService.emitJoinAvatarRoom).not.toHaveBeenCalled();
    });
});
