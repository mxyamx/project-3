import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CanvasManagerService } from '@app/services/canvas-manager/canvas-manager.service';
import { PlayingBoardCanvasComponent } from './playing-board-canvas.component';

describe('PlayingBoardCanvasComponent', () => {
    let component: PlayingBoardCanvasComponent;
    let fixture: ComponentFixture<PlayingBoardCanvasComponent>;
    let canvasManagerSpy: jasmine.SpyObj<CanvasManagerService>;

    beforeEach(async () => {
        canvasManagerSpy = jasmine.createSpyObj('CanvasManagerService', ['init']);

        await TestBed.configureTestingModule({
            imports: [PlayingBoardCanvasComponent],
            providers: [{ provide: CanvasManagerService, useValue: canvasManagerSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayingBoardCanvasComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call canvasManager.init with canvasElement on ngAfterViewInit', () => {
        // Create a mock canvas element
        const canvas = document.createElement('canvas');
        component.canvasElement = canvas;

        component.ngAfterViewInit();

        expect(canvasManagerSpy.init).toHaveBeenCalledWith(canvas);
    });

    it('should not call init if canvasElement is undefined', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component.canvasElement = undefined as any;
        component.ngAfterViewInit();
        expect(canvasManagerSpy.init).not.toHaveBeenCalled();
    });
});
