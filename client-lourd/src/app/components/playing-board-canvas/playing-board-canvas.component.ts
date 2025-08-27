import { AfterViewInit, Component, Input, inject } from '@angular/core';
import { CanvasManagerService } from '@app/services/canvas-manager/canvas-manager.service';

@Component({
    selector: 'app-playing-board-canvas',
    imports: [],
    templateUrl: './playing-board-canvas.component.html',
    styleUrl: './playing-board-canvas.component.scss',
})
export class PlayingBoardCanvasComponent implements AfterViewInit {
    @Input() canvasElement!: HTMLCanvasElement;

    private canvasManager: CanvasManagerService = inject(CanvasManagerService);

    ngAfterViewInit() {
        if (this.canvasElement) {
            this.canvasManager.init(this.canvasElement);
        }
    }
}
