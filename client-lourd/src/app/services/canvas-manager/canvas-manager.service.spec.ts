import { TestBed } from '@angular/core/testing';

import { DEFAULT_BOARD } from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { TileType } from '@common/enums/tile-type';
import { Tile } from '@common/tile';
import { CanvasManagerService } from './canvas-manager.service';

describe('CanvasManagerService', () => {
    let service: CanvasManagerService;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let canvasSizes: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let context: any;

    let boardGameManagerSpy: jasmine.SpyObj<BoardGameManagerService>;

    let canvas: HTMLCanvasElement;
    let tileTest: Tile;
    const standardBoard = DEFAULT_BOARD;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvasSizes = { width: 500, height: 500 };
        boardGameManagerSpy = jasmine.createSpyObj(BoardGameManagerService, ['playingBoardGame']);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        context = {
            clearRect: jasmine.createSpy('clearRect'),
            scale: jasmine.createSpy('scale'),
            moveTo: jasmine.createSpy('moveTo'),
            lineTo: jasmine.createSpy('lineTo'),
            stroke: jasmine.createSpy('stroke'),
            setLineDash: jasmine.createSpy('setLineDash'),
        };

        spyOn(canvas, 'getContext').and.returnValue(context);
        spyOn(canvas, 'getBoundingClientRect').and.returnValue(canvasSizes);

        TestBed.configureTestingModule({
            providers: [CanvasManagerService, { provide: BoardGameManagerService, useValue: boardGameManagerSpy }],
        });

        service = TestBed.inject(CanvasManagerService);

        service.init(canvas);
        boardGameManagerSpy.playingBoardGame.and.returnValue(standardBoard);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should clear the canvas correctly', () => {
        service.clearCanvas();
        expect(context.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
    });

    it('should draw the line correctly if context is defined', () => {
        tileTest = {
            type: TileType.Grass,
            shortestDistanceFromPosition: [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
            ],
        };
        standardBoard.tiles = [[tileTest]];

        const scale = window.devicePixelRatio || 1;
        service.drawLine({ x: 0, y: 0 });

        expect(context.scale).toHaveBeenCalledWith(scale, scale);

        const dotGap = 7;
        expect(context.setLineDash).toHaveBeenCalledWith([2, 2 * dotGap]);
        expect(context.strokeStyle).toEqual('white');
        expect(context.lineCap).toEqual('round');

        expect(context.lineJoin).toEqual('round');
        expect(context.lineWidth).toEqual(dotGap);

        expect(context.stroke).toHaveBeenCalled();
        expect(context.setLineDash).toHaveBeenCalledWith([]);
    });

    it('should set canvas dimensions based on devicePixelRatio', () => {
        spyOnProperty(window, 'devicePixelRatio', 'get').and.returnValue(2);

        tileTest = {
            type: TileType.Grass,
            shortestDistanceFromPosition: [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
            ],
        };
        standardBoard.tiles = [[tileTest]];

        service.drawLine({ x: 0, y: 0 });

        expect(canvas.width).toBe(canvasSizes.width * 2);
        expect(canvas.height).toBe(canvasSizes.height * 2);

        expect(context.scale).toHaveBeenCalledWith(2, 2);
    });
    it('should call moveTo with the first breakPoint or default {x:0, y:0}', () => {
        tileTest = {
            type: TileType.Grass,
            shortestDistanceFromPosition: [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
            ],
        };
        standardBoard.tiles = [[tileTest]];

        service.drawLine({ x: 0, y: 0 });

        expect(context.moveTo).toHaveBeenCalledWith(jasmine.any(Number), jasmine.any(Number));
    });
});
