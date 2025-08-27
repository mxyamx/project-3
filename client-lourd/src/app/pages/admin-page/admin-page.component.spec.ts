import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AdminPageManagerService } from '@app/services/admin-page-manager/admin-page-manager.service';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { of } from 'rxjs';
import { AdminPageComponent } from './admin-page.component';

const mockBoardGame1: BoardGame = {
    id: '1',
    name: 'Chess',
    description: 'A classic game of strategy.',
    size: BoardGameSize.Medium,
    gameMode: GameMode.Normal,
    tiles: [[]],
    previewImage: 'assets/chess.png',
    visibility: true,
    lastModified: new Date(),
    itemInfos: [],
};

const mockBoardGame2: BoardGame = {
    id: '2',
    name: 'Monopoly',
    description: 'A game of finance and real estate.',
    size: BoardGameSize.Large,
    gameMode: GameMode.Normal,
    tiles: [[]],
    previewImage: 'assets/monopoly.png',
    visibility: false,
    lastModified: new Date(),
    itemInfos: [],
};

class MockAdminPageManagerService {
    loadGames = jasmine.createSpy('loadGames').and.returnValue(of([mockBoardGame1, mockBoardGame2]));
    setDisplayedObject = jasmine.createSpy('setDisplayedObject');
    confirmDelete = jasmine.createSpy('confirmDelete');
    cancelDelete = jasmine.createSpy('cancelDelete');
    hideAlert = jasmine.createSpy('hideAlert');
    updateObjectVisibility = jasmine.createSpy('updateObjectVisibility').and.returnValue(of(mockBoardGame1));
    deleteGame = jasmine.createSpy('deleteGame').and.returnValue(of(true));
    editGame = jasmine.createSpy('editGame').and.returnValue(true);

    readonly showDeleteConfirmation$ = of(false);
    readonly showAlertConfirmation$ = of(false);

    get gamesList(): BoardGame[] {
        return [mockBoardGame1, mockBoardGame2];
    }

    get displayedObject(): BoardGame | null {
        return mockBoardGame1;
    }
}

describe('AdminPageComponent', () => {
    let component: AdminPageComponent;
    let fixture: ComponentFixture<AdminPageComponent>;
    let adminPageManagerService: MockAdminPageManagerService;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AdminPageComponent, RouterModule.forRoot([])],
            providers: [
                { provide: AdminPageManagerService, useClass: MockAdminPageManagerService },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: { paramMap: { get: () => '1' } },
                        queryParams: of({ id: '1' }),
                    },
                },
                { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AdminPageComponent);
        component = fixture.componentInstance;
        adminPageManagerService = TestBed.inject(AdminPageManagerService) as unknown as MockAdminPageManagerService;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should load games on initialization', () => {
        component.ngOnInit();
        expect(adminPageManagerService.loadGames).toHaveBeenCalled();
    });

    it('should get gamesList from service', () => {
        expect(component.gamesList).toEqual([mockBoardGame1, mockBoardGame2]);
    });

    it('should get displayedObject from service', () => {
        expect(component.displayedObject).toEqual(mockBoardGame1);
    });

    it('should call setDisplayedObject on service', () => {
        component.setDisplayedObject(mockBoardGame2);
        expect(adminPageManagerService.setDisplayedObject).toHaveBeenCalledWith(mockBoardGame2);
    });

    it('should call confirmDelete on service', () => {
        component.confirmDelete();
        expect(adminPageManagerService.confirmDelete).toHaveBeenCalled();
    });

    it('should call cancelDelete on service', () => {
        component.cancelDelete();
        expect(adminPageManagerService.cancelDelete).toHaveBeenCalled();
    });

    it('should call hideAlert on service', () => {
        component.hideAlert();
        expect(adminPageManagerService.hideAlert).toHaveBeenCalled();
    });

    it('should call updateObjectVisibility on service', () => {
        component.updateDisplayedObjectVisibility();
        expect(adminPageManagerService.updateObjectVisibility).toHaveBeenCalled();
    });

    it('should call deleteGame on service', () => {
        component.deleteGame();
        expect(adminPageManagerService.deleteGame).toHaveBeenCalled();
    });

    it('should call editGame on service', () => {
        component.editGame();
        expect(adminPageManagerService.editGame).toHaveBeenCalled();
    });

    // it('should return the game id in trackById', () => {
    //     const result = component.trackById(0, mockBoardGame1);
    //     expect(result).toBe('1');
    // });
});
