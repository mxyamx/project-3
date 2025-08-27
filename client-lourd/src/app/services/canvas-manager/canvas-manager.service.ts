import { inject, Injectable } from '@angular/core';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { Position } from '@common/position';

@Injectable({
    providedIn: 'root',
})
export class CanvasManagerService {
    private boardgameManager: BoardGameManagerService = inject(BoardGameManagerService);

    private ctx: CanvasRenderingContext2D | null;
    private canvas: HTMLCanvasElement | null;
    private breakPoints: Position[];

    constructor() {
        this.breakPoints = [];
        this.ctx = null;
        this.canvas = null;
    }

    init(canvas: HTMLCanvasElement | null): void {
        this.canvas = canvas;
        if (this.canvas) this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D | null;
    }

    drawLine(tilePosition: Position): void {
        if (this.ctx && this.canvas) {
            this.findBreakPoints(tilePosition);
            const scale = window.devicePixelRatio;

            this.canvas.width = this.canvas.getBoundingClientRect().width * scale;
            this.canvas.height = this.canvas.getBoundingClientRect().height * scale;

            this.ctx.scale(scale, scale);

            const firstPoint = this.breakPoints.shift();
            if (firstPoint) {
                this.ctx.moveTo(firstPoint.x, firstPoint.y);
                this.breakPoints.forEach((breakPoint: Position) => {
                    this.ctx?.lineTo(breakPoint.x, breakPoint.y);
                });

                this.configureLine();
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
    }

    clearCanvas(): void {
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    private configureLine(): void {
        if (this.ctx) {
            const dotLength = 2;
            const dotWidth = 7;

            this.ctx.setLineDash([dotLength, dotLength * dotWidth]);
            this.ctx.strokeStyle = 'white';
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.lineWidth = 7;
        }
    }

    private convertPointToCanvasPos(point: Position): Position {
        const result: Position = { x: 0, y: 0 };
        const boardSize = this.boardgameManager.playingBoardGame().size;

        if (this.canvas) {
            const width: number = this.canvas.getBoundingClientRect().width;
            const height: number = this.canvas.getBoundingClientRect().height;

            const tileHeight: number = height / boardSize;
            const tileWidth: number = width / boardSize;
            result.x = point.y * tileWidth + tileWidth / 2;
            result.y = point.x * tileHeight + tileHeight / 2;
        }
        return result;
    }

    private findBreakPoints(tilePosition: Position): void {
        const pathLine: Position[] | undefined =
            this.boardgameManager.playingBoardGame().tiles[tilePosition.x][tilePosition.y].shortestDistanceFromPosition;

        this.breakPoints = [];
        pathLine?.forEach((point: Position) => {
            this.breakPoints?.push(this.convertPointToCanvasPos(point));
        });
    }
}
