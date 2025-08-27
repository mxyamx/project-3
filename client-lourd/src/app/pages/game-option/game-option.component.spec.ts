/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Routes } from '@angular/router';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { GameMode } from '@common/enums/game-mode';
import { GameOptionComponent } from './game-option.component';
import SpyObj = jasmine.SpyObj;

const routes: Routes = [];

describe('GameOptionComponent', () => {
    let component: GameOptionComponent;
    let fixture: ComponentFixture<GameOptionComponent>;
    let boardGameManagerServiceSpy: SpyObj<BoardGameManagerService>;
    let editorLink: string[];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameOptionComponent, ReactiveFormsModule],
            providers: [provideRouter(routes)],
        }).compileComponents();

        boardGameManagerServiceSpy = jasmine.createSpyObj('BoardGameManagerService', [
            'updateDisplayedBoardGame',
            'tileGenerator',
            'itemInfoGenerator',
            'updateLoadedBoardGame',
        ]);
        editorLink = ['/editor'];

        TestBed.overrideProvider(BoardGameManagerService, { useValue: boardGameManagerServiceSpy });

        fixture = TestBed.createComponent(GameOptionComponent);
        component = fixture.componentInstance;
        (component as any).router = jasmine.createSpyObj('router', ['navigate']);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should not allow the creation of a new board if the size is not selected', () => {
        component.settingsForm.value.boardSize = undefined;
        component.onSubmit();

        expect(boardGameManagerServiceSpy.updateDisplayedBoardGame).not.toHaveBeenCalled();
    });

    it('should not allow the creation of a new board if the mode is not selected', () => {
        component.settingsForm.value.gameMode = undefined;
        component.onSubmit();

        expect(boardGameManagerServiceSpy.updateDisplayedBoardGame).not.toHaveBeenCalled();
    });

    it('should create the correct board on submission and redirect to right page', () => {
        const boardSizes: string[] = ['10x10', '20x20', '15x15'];
        for (const size of boardSizes) {
            component.settingsForm.value.boardSize = size;
            for (const mode of Object.values(GameMode)) {
                component.settingsForm.value.gameMode = mode;

                component.onSubmit();

                expect(boardGameManagerServiceSpy.tileGenerator).toHaveBeenCalledWith((component as any).sizeHashMap[size]);
                expect(boardGameManagerServiceSpy.itemInfoGenerator).toHaveBeenCalledWith(
                    (component as any).sizeHashMap[size],
                    mode === GameMode.CTF,
                );
                expect((component as any).router.navigate).toHaveBeenCalledWith(editorLink);
            }
        }
    });
});
