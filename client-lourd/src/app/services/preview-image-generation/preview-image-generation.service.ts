import { Injectable } from '@angular/core';
import { FROM_ITEM_TO_IMAGE_ON_BOARD, FROM_TILE_TYPE_TO_IMAGE, getTorchImageOnBoard, PREVIEW_IMAGE_SIZE } from '@app/constants/objects-constants';
import { ItemName } from '@common/enums/item-name';
import { Tile } from '@common/tile';

// sources utilisees: https://www.w3schools.com/graphics/canvas_images.asp
// https://stackoverflow.com/questions/52059596/loading-an-image-on-web-browser-using-promise
// https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Using_images
// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
// https://stackoverflow.com/questions/34077757/combine-array-of-images-with-javascript-with-or-without-canvas

@Injectable({
    providedIn: 'root',
})
export class PreviewImageGenerationService {
    async generatePreviewImage(tiles: Tile[][]): Promise<string> {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return '';
        }

        const canvasSize = PREVIEW_IMAGE_SIZE;
        canvas.width = canvasSize;
        canvas.height = canvasSize;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const rows = tiles.length;
        const cols = tiles[0].length;
        const scaledTileSize = canvasSize / Math.max(rows, cols);

        try {
            await this.drawTiles(ctx, tiles, scaledTileSize);
            await this.drawItems(ctx, tiles, scaledTileSize);
        } catch (error) {
            return '';
        }

        const imageDataUrl = canvas.toDataURL('image/png');

        return imageDataUrl;
    }

    private async drawTiles(ctx: CanvasRenderingContext2D, tiles: Tile[][], scaledTileSize: number): Promise<void> {
        const imagePromises: Promise<void>[] = [];

        for (let i = 0; i < tiles.length; i++) {
            for (let j = 0; j < tiles[i].length; j++) {
                const tile = tiles[i][j];
                if (tile && tile.type) {
                    const imageUrl = FROM_TILE_TYPE_TO_IMAGE[tile.type];
                    if (imageUrl) {
                        const img = new Image();
                        img.src = imageUrl;

                        const promise = new Promise<void>((resolve, reject) => {
                            img.onload = () => {
                                ctx.drawImage(img, j * scaledTileSize, i * scaledTileSize, scaledTileSize, scaledTileSize);
                                resolve();
                            };
                            img.onerror = () => {
                                reject();
                            };
                        });

                        imagePromises.push(promise);
                    }
                }
            }
        }

        await Promise.all(imagePromises);
    }

    private async drawItems(ctx: CanvasRenderingContext2D, tiles: Tile[][], scaledTileSize: number): Promise<void> {
        const objectImagePromises: Promise<void>[] = [];

        for (let i = 0; i < tiles.length; i++) {
            for (let j = 0; j < tiles[i].length; j++) {
                const tile = tiles[i][j];
                if (tile.containedItem && tile.containedItem.type) {
                    const containedItem = tile.containedItem;

                    let objectImageUrl: string;
                    if (containedItem.name === ItemName.Torch) {
                        objectImageUrl = getTorchImageOnBoard(containedItem.name, tile.type);
                    } else {
                        objectImageUrl = FROM_ITEM_TO_IMAGE_ON_BOARD[containedItem.name];
                    }

                    if (objectImageUrl) {
                        const img = new Image();
                        img.src = objectImageUrl;

                        const promise = new Promise<void>((resolve, reject) => {
                            img.onload = () => {
                                const y = (containedItem.yPosition ?? j) * scaledTileSize;
                                const x = (containedItem.xPosition ?? i) * scaledTileSize;

                                ctx.drawImage(img, y, x, scaledTileSize, scaledTileSize);
                                resolve();
                            };
                            img.onerror = () => {
                                reject();
                            };
                        });

                        objectImagePromises.push(promise);
                    }
                }
            }
        }

        await Promise.all(objectImagePromises);
    }
}
