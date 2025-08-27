/* eslint-disable max-lines */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { STANDARD_VIRTUAL_PLAYERS } from '@app/constants/development-constants';
import { DEFAULT_BOARD, FROM_ITEM_NAME_TO_VP_PREFERENCE, FROM_ITEM_TO_IMAGE_ON_BOARD } from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { CanvasManagerService } from '@app/services/canvas-manager/canvas-manager.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { BoardGame } from '@common/board-game';
import { ActionType } from '@common/enums/action-type';
import { ItemType } from '@common/enums/item-type';
import { PlayerState } from '@common/enums/player-state';
import { TileType } from '@common/enums/tile-type';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import { Tile } from '@common/tile';
import { VirtualPlayer } from '@common/virtual-player';
import { PlayingBoardComponent } from './playing-board.component';

class TestPlayingBoardComponent extends PlayingBoardComponent {
    testIsAggressive(player: Player): boolean {
        return this.isAggressive(player);
    }

    testTransformItemType(item: Item): string {
        return this.transformItemType(item);
    }
}

describe('PlayingBoardComponent', () => {
    let component: TestPlayingBoardComponent;
    let fixture: ComponentFixture<TestPlayingBoardComponent>;
    let boardManagerSpy: jasmine.SpyObj<BoardGameManagerService>;
    let canvasManagerSpy: jasmine.SpyObj<CanvasManagerService>;
    let gameSessionManagerSpy: jasmine.SpyObj<GameSessionManagerService>;
    let standardBoard: BoardGame;
    let event: Event;

    const tilePosition: Position = { x: 0, y: 0 };

    beforeEach(async () => {
        boardManagerSpy = jasmine.createSpyObj('BoardGameManagerService', ['playingBoardGame']);
        standardBoard = DEFAULT_BOARD;
        standardBoard.tiles = [[{ type: TileType.Grass }]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (boardManagerSpy as any).playingBoardGame = {
            asReadonly: () => standardBoard,
        };
        canvasManagerSpy = jasmine.createSpyObj('CanvasManagerService', ['clearCanvas', 'drawLine']);
        gameSessionManagerSpy = jasmine.createSpyObj('GameSessionManagerService', [
            'playerState',
            'nbOfActions',
            'decrementAmountOfAction',
            'toggleDoorState',
            'startAttack',
            'movePlayer',
            'teleportPlayer',
            'playingBoardGame ',
            'debugModeStatus',
            'updateShowDropItemInterface',
            'dropItem',
            'listOfPlayers',
        ]);

        await TestBed.configureTestingModule({
            imports: [TestPlayingBoardComponent],
            providers: [
                { provide: BoardGameManagerService, useValue: boardManagerSpy },
                { provide: CanvasManagerService, useValue: canvasManagerSpy },
                { provide: GameSessionManagerService, useValue: gameSessionManagerSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TestPlayingBoardComponent);
        component = fixture.componentInstance;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any).boardgame = () => standardBoard;
        event = new MouseEvent('mousedown');
    });

    it('should call clearCanvas on mouse leave tile', () => {
        component.onMouseLeaveTile();
        expect(canvasManagerSpy.clearCanvas).toHaveBeenCalled();
    });

    it('should draw line on reachable tile when player is waiting for action', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForAction);
        standardBoard.tiles[0][0].reachable = true;
        component.onMouseEnterTile({ x: 0, y: 0 });
        expect(canvasManagerSpy.drawLine).toHaveBeenCalled();
    });

    it('should not draw line if player state is not WaitingForAction', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForTurn);
        component.onMouseEnterTile(tilePosition);
        expect(canvasManagerSpy.drawLine).not.toHaveBeenCalled();
    });

    it('should extract text after "Effet:" and trim it', () => {
        const mockItem: Item = {
            description: '- text - Effet: Voici effet',
        } as Item;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedDescription = (component as any).transformItemDescription(mockItem);
        expect(transformedDescription).toBe('Voici effet');
    });

    it('should return empty string if no "Effet:" is found', () => {
        const mockItem: Item = {
            description: 'No effect here',
        } as Item;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedDescription = (component as any).transformItemDescription(mockItem);
        expect(transformedDescription).toBe('');
    });

    it('should handle empty description', () => {
        const mockItem: Item = {
            description: '',
        } as Item;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedDescription = (component as any).transformItemDescription(mockItem);
        expect(transformedDescription).toBe('');
    });

    it('should handle click on tile with undefined tile position and open door action', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForAction);
        gameSessionManagerSpy.nbOfActions.and.returnValue(1);
        const tile: Tile = {
            type: TileType.Grass,
            availableAction: { type: ActionType.OpenDoor, description: '', target: tilePosition },
            position: undefined,
        };

        const mouseEvent = new MouseEvent('click');

        component.clickOnTile(mouseEvent, tile);

        expect(gameSessionManagerSpy.decrementAmountOfAction).toHaveBeenCalled();
        expect(gameSessionManagerSpy.toggleDoorState).toHaveBeenCalledWith(tilePosition);
    });

    it('should handle click on tile with undefined tile position and close door action', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForAction);
        gameSessionManagerSpy.nbOfActions.and.returnValue(1);
        const tile: Tile = {
            type: TileType.Grass,
            availableAction: { type: ActionType.CloseDoor, description: '', target: tilePosition },
            position: undefined,
        };

        const mouseEvent = new MouseEvent('click');

        component.clickOnTile(mouseEvent, tile);

        expect(gameSessionManagerSpy.decrementAmountOfAction).toHaveBeenCalled();
        expect(gameSessionManagerSpy.toggleDoorState).toHaveBeenCalledWith(tilePosition);
    });

    it('should handle click on tile with undefined tile position and attack action', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForAction);
        gameSessionManagerSpy.nbOfActions.and.returnValue(1);
        const tile: Tile = {
            type: TileType.Grass,
            availableAction: { type: ActionType.AttackPlayer, description: '', target: tilePosition },
            position: undefined,
        };

        const mouseEvent = new MouseEvent('click');

        component.clickOnTile(mouseEvent, tile);

        expect(gameSessionManagerSpy.decrementAmountOfAction).toHaveBeenCalled();
        expect(gameSessionManagerSpy.startAttack).toHaveBeenCalledWith(tilePosition);
    });

    it('should handle click on tile with available action', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForAction);
        gameSessionManagerSpy.nbOfActions.and.returnValue(1);
        const tile: Tile = {
            type: TileType.Grass,
            availableAction: { type: ActionType.OpenDoor, description: '', target: tilePosition },
            position: tilePosition,
        };

        const mouseEvent = new MouseEvent('click');

        component.clickOnTile(mouseEvent, tile);

        expect(gameSessionManagerSpy.decrementAmountOfAction).toHaveBeenCalled();
        expect(gameSessionManagerSpy.toggleDoorState).toHaveBeenCalledWith(tilePosition);
    });

    it('should move player if tile is reachable and has no action', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForAction);
        const tile: Tile = {
            type: TileType.Grass,
            reachable: true,
            shortestDistanceFromPosition: [{ x: 0, y: 0 }],
        };

        const mouseEvent = new MouseEvent('click');

        component.clickOnTile(mouseEvent, tile);

        expect(gameSessionManagerSpy.movePlayer).toHaveBeenCalledWith(tile.shortestDistanceFromPosition ?? []);
    });

    it('should move player if tile is reachable and has no action', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForAction);
        const tile: Tile = {
            type: TileType.Grass,
            reachable: true,
            shortestDistanceFromPosition: undefined,
        };

        const mouseEvent = new MouseEvent('click');

        component.clickOnTile(mouseEvent, tile);

        expect(gameSessionManagerSpy.movePlayer).toHaveBeenCalledWith(tile.shortestDistanceFromPosition ?? []);
    });

    it('should do nothing if player is not waiting for action', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForTurn);
        component.clickOnTile(event, {} as Tile);
        expect(gameSessionManagerSpy.nbOfActions).not.toHaveBeenCalled();
    });

    it('should do nothing if no available action and not reachable', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForAction);
        const tile: Tile = { type: TileType.Grass, reachable: false };
        component.clickOnTile(event, tile);
        expect(gameSessionManagerSpy.movePlayer).not.toHaveBeenCalled();
    });

    it('should do nothing if no actions left', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForAction);
        gameSessionManagerSpy.nbOfActions.and.returnValue(0);
        const tile: Tile = {
            type: TileType.Grass,
            availableAction: { type: ActionType.CloseDoor, description: '', target: tilePosition },
            position: tilePosition,
        };
        component.clickOnTile(event, tile);
        expect(gameSessionManagerSpy.decrementAmountOfAction).not.toHaveBeenCalled();
    });

    it('should handle CloseDoor action', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForAction);
        gameSessionManagerSpy.nbOfActions.and.returnValue(1);
        const tile: Tile = {
            type: TileType.Grass,
            availableAction: { type: ActionType.CloseDoor, description: '', target: tilePosition },
            position: tilePosition,
        };
        component.clickOnTile(event, tile);
        expect(gameSessionManagerSpy.decrementAmountOfAction).toHaveBeenCalled();
        expect(gameSessionManagerSpy.toggleDoorState).toHaveBeenCalledWith(tilePosition);
    });

    it('should handle OpenDoor action', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForAction);
        gameSessionManagerSpy.nbOfActions.and.returnValue(1);
        const tile: Tile = {
            type: TileType.Grass,
            availableAction: { type: ActionType.CloseDoor, description: '', target: tilePosition },
            position: tilePosition,
        };
        component.clickOnTile(event, tile);
        expect(gameSessionManagerSpy.toggleDoorState).toHaveBeenCalledWith(tilePosition);
    });

    it('should handle AttackPlayer action', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForAction);
        gameSessionManagerSpy.nbOfActions.and.returnValue(1);
        const tile: Tile = {
            type: TileType.Grass,
            availableAction: { type: ActionType.AttackPlayer, description: '', target: tilePosition },
            position: tilePosition,
        };
        component.clickOnTile(event, tile);
        expect(gameSessionManagerSpy.startAttack).toHaveBeenCalledWith(tilePosition);
    });

    it('should do nothing for unknown action type', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForAction);
        gameSessionManagerSpy.nbOfActions.and.returnValue(1);
        const tile: Tile = {
            type: TileType.Grass,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            availableAction: { type: 'test' } as any,
            position: tilePosition,
        };
        component.clickOnTile(event, tile);
        // Should decrement but not call any specific action
        expect(gameSessionManagerSpy.decrementAmountOfAction).toHaveBeenCalled();
        expect(gameSessionManagerSpy.toggleDoorState).not.toHaveBeenCalled();
        expect(gameSessionManagerSpy.startAttack).not.toHaveBeenCalled();
    });

    it('should move player if tile is reachable and no action', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.WaitingForAction);
        const path = [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
        ];
        const tile: Tile = {
            type: TileType.Grass,
            position: tilePosition,
            shortestDistanceFromPosition: path,
            reachable: true,
        };
        component.clickOnTile(event, tile);
        expect(gameSessionManagerSpy.movePlayer).toHaveBeenCalledWith(path);
    });
    it('should set selectedTile on right-click and show notification', () => {
        const mockEvent = new MouseEvent('mousedown', { button: 2 });
        const mockTile: Tile = { type: TileType.Grass };
        spyOn(mockEvent, 'preventDefault');

        component.mouseDownOnTile(mockEvent, { x: 0, y: 0 }, mockTile);

        expect(component.selectedTile).toEqual(mockTile);
        expect(component.showInfoNotification).toBeTrue();
    });
    it('should teleport player if debug mode is enabled', () => {
        const mockEvent = new MouseEvent('mousedown', { button: 2 });
        spyOn(mockEvent, 'preventDefault');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).playerState = () => {
            return PlayerState.WaitingForAction;
        };
        gameSessionManagerSpy.debugModeStatus.and.returnValue(true);

        component.mouseDownOnTile(mockEvent, { x: 1, y: 1 }, { type: TileType.Grass });

        expect(gameSessionManagerSpy.teleportPlayer).toHaveBeenCalledWith({ x: 1, y: 1 });
    });
    it('should return "inaccessible" for infinite weight tiles', () => {
        let mockTile: Tile = { type: TileType.Door, doorState: false };
        expect(component.tileCostInfo(mockTile)).toBe('inacessible');

        mockTile = { type: 'default' as TileType };
        expect(component.tileCostInfo(mockTile)).toBe('inacessible');

        mockTile = { type: TileType.Wall };
        expect(component.tileCostInfo(mockTile)).toBe('inacessible');
    });

    it('should return correct tile weight for accessible tiles', () => {
        let mockTile: Tile = { type: TileType.Grass };
        expect(component.tileCostInfo(mockTile)).toBe('1');

        mockTile = { type: TileType.Water };
        expect(component.tileCostInfo(mockTile)).toBe('2');

        mockTile = { type: TileType.Door, doorState: true };
        expect(component.tileCostInfo(mockTile)).toBe('1');

        mockTile = { type: TileType.Ice };
        expect(component.tileCostInfo(mockTile)).toBe('0');
    });

    it('should prevent default on context menu in the info popup', () => {
        const mockEvent = new MouseEvent('contextmenu', { button: 2 });

        const spy = spyOn(mockEvent, 'preventDefault');

        component.contextMenuOnInfoPopUp(mockEvent);

        expect(spy).toHaveBeenCalled();
    });
    it('should close the info notification', () => {
        component.showInfoNotification = true;
        component.closeInfoNotification();
        expect(component.showInfoNotification).toBeFalse();
    });
    it('should return the correct item-to-image mapping', () => {
        expect(component.imageCorrespondance).toEqual(FROM_ITEM_TO_IMAGE_ON_BOARD);
    });

    it('should return the GameSessionManagerService instance ', () => {
        expect(component.sessionManager).toBe(gameSessionManagerSpy);
    });

    it('should call dropItem and updateShowDropItemInterface when clickOnItemToDrop is called', () => {
        const mockItem: Item = { type: ItemType.AttributeEditor } as Item;

        component.clickOnItemToDrop(mockItem);

        expect(gameSessionManagerSpy.dropItem).toHaveBeenCalledWith(mockItem);
        expect(gameSessionManagerSpy.updateShowDropItemInterface).toHaveBeenCalledWith(false);
    });

    it('should return the virtual player profile', () => {
        const mockPlayer: Player = STANDARD_VIRTUAL_PLAYERS[0];
        expect(component.getVirtualPlayerProfile(mockPlayer)).toBe('agressif');
    });

    it('should return the correct item preference', () => {
        const mockItem: Item = { type: ItemType.AttributeEditor } as Item;
        const expectedPreference = FROM_ITEM_NAME_TO_VP_PREFERENCE[mockItem.name];
        expect(component.getItemPreference(mockItem)).toBe(expectedPreference);
    });

    it('should transform item description correctly when effect section exists', () => {
        const mockItem: Item = { type: ItemType.AttributeEditor, description: '- Effet: Heals 50 HP' } as Item;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((component as any).transformItemDescription(mockItem)).toBe('Heals 50 HP');
    });

    it('should return empty string when effect section does not exist', () => {
        const mockItem: Item = { type: ItemType.AttributeEditor, description: '' } as Item;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((component as any).transformItemDescription(mockItem)).toBe('');
    });

    describe('Protected Methods', () => {
        describe('isAggressive', () => {
            it('should return true for aggressive virtual player', () => {
                const aggressiveVirtualPlayer: Player = {
                    ...STANDARD_VIRTUAL_PLAYERS[0],
                    virtualPlayer: true,
                    profile: VirtualPlayerProfile.Agressive,
                } as VirtualPlayer;
                expect(component.testIsAggressive(aggressiveVirtualPlayer)).toBeTrue();
            });

            it('should return false for defensive virtual player', () => {
                const defensiveVirtualPlayer: Player = {
                    ...STANDARD_VIRTUAL_PLAYERS[0],
                    virtualPlayer: true,
                    profile: VirtualPlayerProfile.Defensive,
                } as VirtualPlayer;
                expect(component.testIsAggressive(defensiveVirtualPlayer)).toBeFalse();
            });

            it('should return false for non-virtual player', () => {
                const regularPlayer: Player = {
                    ...STANDARD_VIRTUAL_PLAYERS[0],
                    virtualPlayer: false,
                };
                expect(component.testIsAggressive(regularPlayer)).toBeFalse();
            });
        });

        describe('transformItemType', () => {
            it('should extract type from item description', () => {
                const item: Item = {
                    type: ItemType.AttributeEditor,
                    description: '- Type: Weapon - Effect: Deals damage',
                } as Item;
                expect(component.testTransformItemType(item)).toBe('Weapon');
            });

            it('should return empty string if no type section exists', () => {
                const item: Item = {
                    type: ItemType.AttributeEditor,
                    description: '- Effect: Deals damage',
                } as Item;
                expect(component.testTransformItemType(item)).toBe('');
            });

            it('should return empty string if description is empty', () => {
                const item: Item = {
                    type: ItemType.AttributeEditor,
                    description: '',
                } as Item;
                expect(component.testTransformItemType(item)).toBe('');
            });
        });
    });

    describe('hasVirtualPlayers', () => {
        it('should return true when there are virtual players', () => {
            const mockPlayers = [
                { ...STANDARD_VIRTUAL_PLAYERS[0], virtualPlayer: true },
                { ...STANDARD_VIRTUAL_PLAYERS[0], virtualPlayer: false },
            ];
            gameSessionManagerSpy.listOfPlayers.and.returnValue(mockPlayers);
            expect(component.hasVirtualPlayers()).toBeTrue();
        });

        it('should return false when there are no virtual players', () => {
            const mockPlayers = [
                { ...STANDARD_VIRTUAL_PLAYERS[0], virtualPlayer: false },
                { ...STANDARD_VIRTUAL_PLAYERS[0], virtualPlayer: false },
            ];
            gameSessionManagerSpy.listOfPlayers.and.returnValue(mockPlayers);
            expect(component.hasVirtualPlayers()).toBeFalse();
        });

        it('should return false when players list is empty', () => {
            gameSessionManagerSpy.listOfPlayers.and.returnValue([]);
            expect(component.hasVirtualPlayers()).toBeFalse();
        });
    });
});
