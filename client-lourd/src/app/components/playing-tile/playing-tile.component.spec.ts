import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FROM_TILE_TYPE_TO_IMAGE } from '@app/constants/objects-constants';
import { TileType } from '@common/enums/tile-type';
import { Tile } from '@common/tile';
import { PlayingTileComponent } from './playing-tile.component';

describe('PlayingTileComponent', () => {
    let component: PlayingTileComponent;
    let fixture: ComponentFixture<PlayingTileComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PlayingTileComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayingTileComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should find the right image for the right tile', () => {
        const tileTypes: Tile[] = [
            { type: TileType.Grass, doorState: undefined },
            { type: TileType.Water, doorState: undefined },
            { type: TileType.Ice, doorState: undefined },
            { type: TileType.Wall, doorState: undefined },
            { type: TileType.Door, doorState: true },
            { type: TileType.Door, doorState: false },
        ];

        const tileImages: { [key: string]: string } = {};

        tileTypes.forEach(({ type, doorState }) => {
            const key = doorState === undefined ? type : `${type}-${doorState}`;
            tileImages[key] = component.getTileImage({ type, doorState });
        });

        const tileTypesWithStates: TileType[] = [TileType.Grass, TileType.Water, TileType.Ice, TileType.Wall];

        tileTypesWithStates.forEach((tile) => {
            expect(tileImages[tile]).toEqual(FROM_TILE_TYPE_TO_IMAGE[tile]);
        });
        expect(tileImages[`${TileType.Door}-${true}`]).toEqual('assets/tiles/porteOuverte.jpg');
        expect(tileImages[`${TileType.Door}-${false}`]).toEqual('assets/tiles/porteFermee.jpg');
    });
    it(' should restrict the event when right button is clicked ', () => {
        const mouseDownOnItem: MouseEvent = new MouseEvent('mousedown', {
            bubbles: false,
            cancelable: true,
            button: 2,
        });

        const spy = spyOn(mouseDownOnItem, 'preventDefault').and.callFake(() => {
            return;
        });
        component.mouseDownOnItem(mouseDownOnItem);
        expect(spy).toHaveBeenCalled();
    });
    it(' should restrict the event when right button is clicked on player ', () => {
        const mouseDownOnPlayer: MouseEvent = new MouseEvent('mousedown', {
            bubbles: false,
            cancelable: true,
            button: 2,
        });

        const spy = spyOn(mouseDownOnPlayer, 'preventDefault').and.callFake(() => {
            return;
        });
        component.mouseDownOnPlayer(mouseDownOnPlayer);
        expect(spy).toHaveBeenCalled();
    });

    it('should return the stringified tile starting position', () => {
        const spy = spyOn(component, 'tileIsStartingPosition').and.callThrough();
        component.tileIsStartingPosition();
        expect(spy).toHaveBeenCalled();
    });
});
