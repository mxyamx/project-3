import { getDirections, inBounds, isDefinedAndFinite } from './vp-path-board-game-helpers';
import { assert } from 'chai';

describe('vp-path-board-game-helpers', () => {
    describe('inBounds', () => {
        const rows = 3;
        const columns = 4;
        const mockTiles = Array(rows)
            .fill(0)
            .map(() => Array(columns).fill(0));

        it('should return true for valid coordinates inside bounds', () => {
            assert.isTrue(inBounds(2, rows, mockTiles));
        });

        it('should return false for x < 0', () => {
            assert.isFalse(inBounds(-1, 2, mockTiles));
        });

        it('should return false for x >= tiles.length', () => {
            assert.isFalse(inBounds(rows, 2, mockTiles));
        });

        it('should return false for y < 0', () => {
            assert.isFalse(inBounds(1, -1, mockTiles));
        });

        it('should return false for y >= tiles[0].length', () => {
            assert.isFalse(inBounds(1, columns, mockTiles));
        });
    });

    describe('getDirections', () => {
        it('should return the 4 cardinal directions', () => {
            const expected = [
                { x: -1, y: 0 },
                { x: 1, y: 0 },
                { x: 0, y: -1 },
                { x: 0, y: 1 },
            ];
            assert.deepEqual(getDirections(), expected);
        });
    });

    describe('isDefinedAndFinite', () => {
        const finiteNumber = 42;
        it('should return true for a finite number', () => {
            assert.isTrue(isDefinedAndFinite(finiteNumber));
        });

        it('should return false for undefined', () => {
            assert.isFalse(isDefinedAndFinite(undefined));
        });

        it('should return false for Infinity', () => {
            assert.isFalse(isDefinedAndFinite(Infinity));
        });
    });
});
