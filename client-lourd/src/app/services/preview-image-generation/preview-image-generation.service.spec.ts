import { TestBed } from '@angular/core/testing';

import { FROM_TILE_TYPE_TO_IMAGE } from '@app/constants/objects-constants';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Tile } from '@common/tile';
import { PreviewImageGenerationService } from './preview-image-generation.service';

describe('PreviewImageGenerationService', () => {
    let service: PreviewImageGenerationService;
    let mockCanvas: HTMLCanvasElement;
    let mockCanvasContext: CanvasRenderingContext2D;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(PreviewImageGenerationService);

        mockCanvas = document.createElement('canvas');
        mockCanvasContext = mockCanvas.getContext('2d') as CanvasRenderingContext2D;

        spyOn(document, 'createElement').and.returnValue(mockCanvas);
        spyOn(mockCanvasContext, 'drawImage');
        spyOn(mockCanvasContext, 'clearRect');
        spyOn(mockCanvas, 'toDataURL').and.returnValue('mockDataUrl');
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should return an empty string if context does not exist', async () => {
        spyOn(mockCanvas, 'getContext').and.returnValue(null);

        const rows = 10;
        const cols = 10;

        const tiles: Tile[][] = Array(rows)
            .fill(null)
            .map(() =>
                Array(cols)
                    .fill(null)
                    .map(() => ({ type: TileType.Water })),
            );

        const result = await service.generatePreviewImage(tiles);

        expect(result).toBe('');
    });

    it('should return a data URL when all images are loaded successfully', async () => {
        const rows = 10;
        const cols = 10;

        const tiles: Tile[][] = Array(rows)
            .fill(null)
            .map(() =>
                Array(cols)
                    .fill(null)
                    .map(() => ({ type: TileType.Grass })),
            );

        tiles[0][1] = {
            type: TileType.Grass,
            containedItem: {
                type: ItemType.StartingPoint,
                name: 'Point de depart',
                description: 'test',
                xPosition: 0,
                yPosition: 1,
            },
            isEntryPoint: true,
        };

        spyOn(window, 'Image').and.callFake(function () {
            return {
                set src(value: string) {
                    setTimeout(() => {
                        this.onload?.();
                    }, 0);
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any as HTMLImageElement;
        });

        const result = await service.generatePreviewImage(tiles);

        expect(mockCanvasContext.drawImage).toHaveBeenCalled();
        expect(result).toBe('mockDataUrl');
    });

    it('should return a data URL when all images are loaded successfully by using the i and j as positions', async () => {
        const rows = 10;
        const cols = 10;

        const tiles: Tile[][] = Array(rows)
            .fill(null)
            .map(() =>
                Array(cols)
                    .fill(null)
                    .map(() => ({ type: TileType.Grass })),
            );

        tiles[0][1] = {
            type: TileType.Grass,
            containedItem: {
                type: ItemType.StartingPoint,
                name: 'Point de depart',
                description: 'test',
            },
            isEntryPoint: true,
        };

        spyOn(window, 'Image').and.callFake(function () {
            return {
                set src(value: string) {
                    setTimeout(() => {
                        this.onload?.();
                    }, 0);
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any as HTMLImageElement;
        });

        const result = await service.generatePreviewImage(tiles);

        expect(mockCanvasContext.drawImage).toHaveBeenCalled();
        expect(result).toBe('mockDataUrl');
    });

    it('should return empty string if drawTiles fails', async () => {
        const tiles: Tile[][] = [[{ type: TileType.Water }]];
        FROM_TILE_TYPE_TO_IMAGE[TileType.Water] = 'mockImageUrl';

        spyOn(window, 'Image').and.callFake(function () {
            return {
                set src(value: string) {
                    setTimeout(() => {
                        this.onerror?.();
                    }, 0);
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any as HTMLImageElement;
        });

        const result = await service.generatePreviewImage(tiles);

        expect(result).toBe('');
    });
    it('should return empty string if drawTiles fails', async () => {
        const tiles: Tile[][] = [[{ type: TileType.Water }]];
        FROM_TILE_TYPE_TO_IMAGE[TileType.Water] = 'mockImageUrl';

        spyOn(window, 'Image').and.callFake(function () {
            return {
                set src(value: string) {
                    setTimeout(() => {
                        this.onerror?.();
                    }, 0);
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any as HTMLImageElement;
        });

        const result = await service.generatePreviewImage(tiles);

        expect(result).toBe('');
    });

    it('should return empty string if drawTiles succeeds but drawItems fails', async () => {
        const rows = 10;
        const cols = 10;

        const tiles: Tile[][] = Array(rows)
            .fill(null)
            .map(() =>
                Array(cols)
                    .fill(null)
                    .map(() => ({ type: TileType.Grass })),
            );

        tiles[0][1] = {
            type: TileType.Grass,
            containedItem: {
                type: ItemType.StartingPoint,
                name: 'Point de depart',
                description: 'test',
                xPosition: 0,
                yPosition: 1,
            },
            isEntryPoint: true,
        };

        spyOn(window, 'Image').and.callFake(function () {
            const img = {
                set src(value: string) {
                    if (value === FROM_TILE_TYPE_TO_IMAGE[TileType.Grass]) {
                        setTimeout(() => {
                            this.onload?.();
                        }, 0);
                    } else {
                        setTimeout(() => {
                            this.onerror?.();
                        }, 0);
                    }
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any as HTMLImageElement;
            return img;
        });

        const result = await service.generatePreviewImage(tiles);
        expect(result).toBe('');
    });

    it('should handle empty tiles', async () => {
        const tiles: Tile[][] = [[]];

        const result = await service.generatePreviewImage(tiles);

        expect(result).toBeTruthy();
    });
});
