import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FROM_ITEM_NAME_TO_DESCRIPTION, ITEM_NAMES } from '@app/constants/objects-constants';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { BoardGame } from '@common/board-game';
import { CurrentGame } from '@common/current-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Player } from '@common/player';

describe('CurrentGameManagerService', () => {
    let service: CurrentGameManagerService;
    let standardBoardGame: BoardGame;
    let testPlayer: Player;
    let standardCurrentGame: CurrentGame;

    beforeEach(() => {
        TestBed.configureTestingModule({});

        standardBoardGame = {
            id: '',
            name: 'Default Board',
            description: 'This is a default description for the board game.',
            size: BoardGameSize.Medium,
            gameMode: GameMode.Normal,
            tiles: [
                [
                    { type: TileType.Wall },
                    { type: TileType.Door },
                    {
                        type: TileType.Grass,
                        containedItem: {
                            type: ItemType.AttributeEditor,
                            name: ITEM_NAMES.attributeEditor2,
                            description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.attributeEditor2],
                        },
                    },
                ],
            ],
            previewImage: 'assets/preview.png',
            visibility: true,
            lastModified: new Date(),
            itemInfos: [],
        };

        testPlayer = {
            name: 'Default Player',
            character: 'character.png',
            attributes: {
                attackValue: 5,
                defenseValue: 5,
                speedValue: 5,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: true,
            virtualPlayer: false,
            victories: 0,
        };

        standardCurrentGame = {
            id: '1234',
            players: [testPlayer],
            boardGame: standardBoardGame,
            locked: false,
            adminId: '',
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spyCurrentGame: any = signal<CurrentGame>(standardCurrentGame);
        service = TestBed.inject(CurrentGameManagerService);
        service.displayedCurrentGame = spyCurrentGame;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should update correctly the current game', () => {
        standardCurrentGame.name = 'test1';

        service.updateCurrentGame(standardCurrentGame);

        expect(service.displayedCurrentGame()).toEqual(standardCurrentGame);
    });

    it('should add a player to the current game correctly', () => {
        standardCurrentGame.players = [testPlayer];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).displayedCurrentGame = signal({
            id: '1234',
            players: [],
            boardGame: standardBoardGame,
            locked: false,
            adminId: '',
        });

        service.addPlayer(testPlayer);

        expect(service.displayedCurrentGame()).toEqual(standardCurrentGame);
    });

    it('should remove a player to the current game correctly', () => {
        const secondPlayer: Player = { ...testPlayer, name: 'Second Player' };
        service.addPlayer(secondPlayer);
        service.removePlayer(secondPlayer);

        const currentGame = service.displayedCurrentGame();
        expect(currentGame.players.length).toBe(1);
    });

    it('should update the board-game of the current game correctly', () => {
        standardCurrentGame.boardGame.name = 'test1';

        service.updatePickedBoardGame(standardBoardGame);

        expect(service.displayedCurrentGame()).toEqual(standardCurrentGame);
    });

    it('should reset the current game to its initial state', () => {
        service.reset();
        const initialGame: CurrentGame = {
            id: '',
            players: [],
            boardGame: service.pickedBoardGame,
            locked: false,
            adminId: '',
        };
        expect(service.displayedCurrentGame()).toEqual(initialGame);
    });

    it('should generate a unique player name when the name already exists', () => {
        const players: Player[] = [{ ...testPlayer, name: 'Default Player' }];
        const uniqueName = service.verifyUniquePlayerName('Default Player', players);
        expect(uniqueName).toBe('Default Player-2');
    });

    it('should return the same name if it is unique', () => {
        const players: Player[] = [{ ...testPlayer, name: 'Default Player' }];
        const uniqueName = service.verifyUniquePlayerName('Unique Player', players);
        expect(uniqueName).toBe('Unique Player');
    });
});
