export function inBounds(x: number, y: number, tiles: unknown[][]): boolean {
    return x >= 0 && x < tiles.length && y >= 0 && y < tiles[0].length;
}

export function getDirections(): { x: number; y: number }[] {
    return [
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: 1 },
    ];
}

export function isDefinedAndFinite(value: number | undefined): boolean {
    return value !== undefined && value !== Infinity;
}
