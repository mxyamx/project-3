/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable max-lines */
import { DynamicPlayerList } from '@app/classes/dynamic-player-list/dynamic-player-list';
import { ItemEffectApplicator } from '@app/classes/item-effect-applicator/item-effect-applicator';
import { StatisticsManager } from '@app/classes/statistics-manager/statistics-manager';
import { LARGE_DICE_VALUE, SMALL_DICE_VALUE, STANDARD_LIST_PLAYERS } from '@app/constants/development-constants';
import { CurrentGamesService } from '@app/services/current-games/current-games.service';
import { hasDuplicateNames, shuffleArray } from '@app/utils/functions/general-usage-functions';
import { BoardGame } from '@common/board-game';
import { CtfTeam } from '@common/enums/ctf-team';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameMode } from '@common/enums/game-mode';
import { ItemName } from '@common/enums/item-name';
import { ItemType } from '@common/enums/item-type';
import { PlayerLimits } from '@common/enums/players-limit';
import { TileType } from '@common/enums/tile-type';
import { Fight } from '@common/fight';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import { Tile } from '@common/tile';
import * as io from 'socket.io';
import { EventLogManager } from '../event-log-manager/event-log-manager';
import { PlayerSlotManager } from '../player-slot-manager/player-slot-manager';
export class GameSession {
    statisticsManager: StatisticsManager;
    playerSlotManager: PlayerSlotManager;
    eventLogManager: EventLogManager;

    private players: DynamicPlayerList;
    private activePlayer: Player;
    private ongoingFight: Fight | undefined;

    private staticPlayerMap: Map<string, Player>;

    private gameHasStarted: boolean;
    private gameIsOver: boolean;

    private defenseDice: number;
    private attackDice: number;

    private isDebugActivated: boolean;
    private droppingItems: boolean;

    private itemEffectApplicator: ItemEffectApplicator;

    private escapeMAp = new Map<string, number>();
    private originalBoardGame: BoardGame;

    private initialPlayerCount: number = 0;
    private abandonedPlayers: Set<string> = new Set();
    isRapidElim: boolean = false;

    constructor(
        gameService: CurrentGamesService,
        private boardGame: BoardGame,
        gameId: string,
        isRapidElim: boolean,
        sio: io.Server,
    ) {
        this.players = new DynamicPlayerList(isRapidElim);
        this.staticPlayerMap = new Map();
        this.statisticsManager = new StatisticsManager(boardGame.tiles);
        this.gameHasStarted = false;
        this.gameIsOver = false;
        this.defenseDice = 0;
        this.attackDice = 0;
        this.isDebugActivated = false;
        this.droppingItems = false;
        this.itemEffectApplicator = new ItemEffectApplicator();
        this.escapeMAp = new Map();
        this.originalBoardGame = structuredClone(boardGame);
        this.isRapidElim = isRapidElim;

        const maxPlayers = PlayerLimits[this.boardGame.size].maxPlayers;
        this.playerSlotManager = new PlayerSlotManager(maxPlayers, gameService, gameId);
        this.eventLogManager = new EventLogManager(sio, gameId);
    }

    get board(): BoardGame {
        return this.boardGame;
    }

    get listOfPlayers(): DynamicPlayerList {
        return this.players;
    }

    get fight(): Fight | undefined {
        return this.ongoingFight;
    }

    get activePlayerInstance(): Player {
        return this.activePlayer;
    }

    get staticMapOfPlayer(): Map<string, Player> {
        return this.staticPlayerMap;
    }

    get gameOver(): boolean {
        return this.gameIsOver;
    }

    get gameStarted(): boolean {
        return this.gameHasStarted;
    }

    get defenseDiceValue(): number {
        return this.defenseDice;
    }
    get attackDiceValue(): number {
        return this.attackDice;
    }

    get debugModeStatus(): boolean {
        return this.isDebugActivated;
    }

    get escapeMap(): Map<string, number> {
        return this.escapeMAp;
    }

    dropItem(player: Player, item: Item): void {
        if (!this.playerHasItem(player, item)) {
            return;
        }
        if (player.name !== this.activePlayer.name) {
            return;
        }
        let position = this.activePlayer.position;
        if (this.boardGame.tiles[position.x][position.y].containedItem) {
            this.droppingItems = true;
            position = this.findNearestValidTile(position);
            this.droppingItems = false;
        }
        const newInventory = structuredClone(this.activePlayer.inventory).filter((i) => {
            return i.name !== item.name;
        });
        this.itemEffectApplicator.removeEffect(this.activePlayer, item.name);
        this.activePlayer.inventory = newInventory;
        this.boardGame.tiles[position.x][position.y].containedItem = item;
    }

    pickUpItem(player: Player): void {
        const position = player.position;
        if (!this.boardGame.tiles[position.x][position.y].containedItem) {
            return;
        }
        if (
            this.boardGame.tiles[position.x][position.y].containedItem.type === ItemType.StartingPoint ||
            this.boardGame.tiles[position.x][position.y].containedItem.type === ItemType.RandomItem
        ) {
            return;
        }
        if (player.name !== this.activePlayer.name) {
            return;
        }

        const item = this.boardGame.tiles[position.x][position.y].containedItem;
        this.activePlayer.inventory.push(item);
        this.itemEffectApplicator.applyEffect(this.activePlayer, item.name);
        this.boardGame.tiles[position.x][position.y].containedItem = undefined;
    }

    validItemPresent(position: Position): boolean {
        const item = this.boardGame.tiles[position.x][position.y].containedItem;
        if (!item) return false;

        if (item.type === ItemType.StartingPoint || item.type === ItemType.RandomItem) return false;

        return true;
    }

    findRemainingItems(): Item[] {
        const remainingItems: Item[] = [];
        for (const itemInfoContainer of this.boardGame.itemInfos) {
            if (
                itemInfoContainer.available > 0 &&
                itemInfoContainer.item.type !== ItemType.StartingPoint &&
                itemInfoContainer.item.type !== ItemType.RandomItem
            ) {
                remainingItems.push(structuredClone(itemInfoContainer.item));
            }
        }
        return remainingItems;
    }

    movePlayer(oldPosition: Position, newPosition: Position): void {
        const player: Player = this.board.tiles[oldPosition.x][oldPosition.y].containedPlayer;

        if (!player) {
            return;
        }

        this.boardGame.tiles[oldPosition.x][oldPosition.y].containedPlayer = undefined;
        this.boardGame.tiles[newPosition.x][newPosition.y].containedPlayer = player;
        this.activePlayer.position = newPosition;
        this.activePlayer.attributes.speedValue -= this.weightFunction(
            this.boardGame.tiles[this.activePlayer.position.x][this.activePlayer.position.y],
        );
        this.statisticsManager.updateTilePercentage(newPosition);
        this.statisticsManager.updatePlayerTilePercentage(player.userId, newPosition);
    }

    changeActivePlayer(): void {
        this.resetSpeed(this.activePlayer);
        this.resetHealth(this.activePlayer);
        this.resetDefense(this.activePlayer);
        this.resetAttack(this.activePlayer);
        for (const item of this.activePlayer.inventory) {
            this.itemEffectApplicator.applyEffect(this.activePlayer, item.name);
        }

        this.players.moveFirstToBack();
        this.activePlayer = this.players.getFirst();
    }

    startGame(): void {
        this.gameHasStarted = true;
        this.activePlayer = this.players.getFirst();
        this.initialPlayerCount = this.players.getValues().length;

        this.placeItems();
        this.placePlayers();
        this.initializePlayerStatistics();
        this.statisticsManager.setStartTime();

        if (hasDuplicateNames(this.players.getValues())) {
            this.endGame();
            throw new Error('deux joueurs ont le meme nom');
        }

        if (this.board.gameMode === GameMode.CTF && this.players.getValues().length % 2 !== 0) {
            this.endGame();
            throw new Error('nombre de joueur impair en ctf');
        }
    }

    toggleDoorState(doorPosition: Position): boolean {
        const tile: Tile = this.boardGame.tiles[doorPosition.x][doorPosition.y];
        if (tile.type === TileType.Door) {
            tile.doorState = !tile.doorState;
        }
        return tile.doorState;
    }

    deactivateDebugMode(): void {
        this.isDebugActivated = false;
    }

    startFight(player1: Player, player2: Player): void {
        this.escapeMAp = new Map();
        this.escapeMAp.set(player1.name, 0);
        this.escapeMAp.set(player2.name, 0);
        this.initiateFight(player1, player2);
    }

    executeAttack(attacker: Player, defender: Player): void {
        const attackRoll: number = this.isDebugActivated
            ? this.giveDiceValue(attacker.attributes.bonusAttack)
            : this.rollDice(this.giveDiceValue(attacker.attributes.bonusAttack));

        const defenseRoll = this.isDebugActivated ? 1 : this.rollDice(this.giveDiceValue(defender.attributes.bonusDefense));

        this.attackDice = attackRoll;
        this.defenseDice = defenseRoll;
        let attackValue = attacker.attributes.attackValue + attackRoll;
        let defenseValue = defender.attributes.defenseValue + defenseRoll;

        if (this.isOnIce(attacker)) attackValue -= 2;
        if (this.isOnIce(defender)) defenseValue -= 2;

        const damage = Math.max(0, attackValue - defenseValue);
        defender.attributes.healthValue = Math.max(0, defender.attributes.healthValue - damage);
        if (this.itemEffectApplicator.hasItem(defender, ItemName.ConditionBased1)) {
            this.itemEffectApplicator.applyEffect(defender, ItemName.ConditionBased1);
        }
    }
    switchTurn(): void {
        if (!this.ongoingFight) return;
        const temp = this.ongoingFight.attackingPlayer;
        this.ongoingFight.attackingPlayer = this.ongoingFight.defendingPlayer;
        this.ongoingFight.defendingPlayer = temp;
    }
    attemptEscape(): boolean {
        const oldEscapeAttempts = this.escapeMAp.get(this.ongoingFight.attackingPlayer.name);

        this.escapeMAp.set(this.ongoingFight.attackingPlayer.name, oldEscapeAttempts + 1);

        const SUCCESSFUL_ESCAPE_ATTEMPT = 0.3;
        const escapeRoll = Math.random();
        const escapeSuccess = escapeRoll < SUCCESSFUL_ESCAPE_ATTEMPT;
        return escapeSuccess;
    }

    repositionPlayer(player: Player): void {
        this.dropAllItems(player);
        const playerCopy: Player = this.staticPlayerMap.get(player.name);
        let position: Position | undefined = playerCopy.position;

        if (position) {
            if ((this.boardGame.tiles[position.x][position.y].containedPlayer ?? STANDARD_LIST_PLAYERS[0]).name !== player.name) {
                position = this.isValidPosition(position) ? position : this.findNearestValidTile(position);
            }
            this.boardGame.tiles[player.position.x][player.position.y].containedPlayer = undefined;
            this.boardGame.tiles[position.x][position.y].containedPlayer = player;
            player.position.x = position.x;
            player.position.y = position.y;
        }
    }

    endFight(): void {
        this.escapeMAp = new Map();
        const attackingPlayer = this.ongoingFight.attackingPlayer;
        const defendingPlayer = this.ongoingFight.defendingPlayer;
        this.resetHealth(attackingPlayer);
        this.resetHealth(defendingPlayer);
        this.resetDefense(attackingPlayer);
        this.resetDefense(defendingPlayer);
        this.ongoingFight = undefined;
        if (this.itemEffectApplicator.hasItem(attackingPlayer, ItemName.AttributeEditor2)) {
            this.itemEffectApplicator.applyEffect(attackingPlayer, ItemName.AttributeEditor2);
        }
        if (this.itemEffectApplicator.hasItem(defendingPlayer, ItemName.AttributeEditor2)) {
            this.itemEffectApplicator.applyEffect(defendingPlayer, ItemName.AttributeEditor2);
        }
    }

    registerVictory(player: Player): void {
        this.statisticsManager.updateVictoryAmount(player.userId);

        player.victories = this.statisticsManager.getVictoryAmount(player.userId);

        if (this.itemEffectApplicator.hasItem(player, ItemName.ConditionBased2)) {
            this.itemEffectApplicator.applyEffect(player, ItemName.ConditionBased2);
        }
    }

    getPlayerAmountOfVic(player: Player): number {
        return this.statisticsManager.getVictoryAmount(player.userId);
    }

    removePlayer(player: Player): void {
        this.dropAllItems(player);
        this.players.remove(player);

        if (player.position) {
            this.boardGame.tiles[player.position.x][player.position.y].containedPlayer = undefined;
        }
    }

    eliminatePlayer(player: Player): void {
        this.dropAllItems(player);

        if (player.position) {
            this.boardGame.tiles[player.position.x][player.position.y].containedPlayer = undefined;
        }

        this.players.markEliminated(player.userId);
        this.playerSlotManager.markEliminated(player.userId);
    }

    playerIsInSession(player: Player): boolean {
        return this.players.getValues().find((element: Player) => {
            return element.name === player.name;
        })
            ? true
            : false;
    }

    endGame(): void {
        this.gameIsOver = true;
        this.statisticsManager.setEndTime();
    }

    teleport(oldPosition: Position, newPosition: Position): void {
        const player: Player = this.board.tiles[oldPosition.x][oldPosition.y].containedPlayer;

        if (!player) {
            return;
        }

        if (!this.isValidPosition(newPosition)) return;

        this.boardGame.tiles[oldPosition.x][oldPosition.y].containedPlayer = undefined;
        this.boardGame.tiles[newPosition.x][newPosition.y].containedPlayer = player;
        player.position = newPosition;
    }

    toggleDebugMode(): void {
        this.isDebugActivated = !this.isDebugActivated;
    }

    ctfIsOver(): boolean {
        if (this.board.gameMode !== GameMode.CTF) return false;
        return this.activePlayerHasFlag() && JSON.stringify(this.activePlayer.position) === JSON.stringify(this.activePlayer.startPosition);
    }
    private activePlayerHasFlag(): boolean {
        return this.activePlayer.inventory.find((i: Item) => {
            return i.type === ItemType.Flag;
        })
            ? true
            : false;
    }

    private placeItems(): void {
        const remainingItems: Item[] = shuffleArray<Item>(structuredClone(this.findRemainingItems()));
        for (let i = 0; i < this.boardGame.size; ++i) {
            for (let j = 0; j < this.boardGame.size; ++j) {
                const containedItem: Item | undefined = this.boardGame.tiles[i][j].containedItem;
                if (!containedItem) continue;
                if (containedItem.type === ItemType.RandomItem) {
                    if (remainingItems.length > 0) {
                        this.boardGame.tiles[i][j].containedItem = structuredClone(remainingItems.pop());
                    } else {
                        this.boardGame.tiles[i][j].containedItem.disabled = true;
                    }
                }
            }
        }
    }
    placeAndAddActivePlayer(player: Player): void {
        let firstTeamPlayerCount = 0;
        let secondTeamPlayerCount = 0;

        const usedStartPos: Position[] = this.listOfPlayers.getValues().map((player) => {
            if (player?.ctfTeam) {
                firstTeamPlayerCount = player.ctfTeam === CtfTeam.FirstTeam ? firstTeamPlayerCount + 1 : 0;
                secondTeamPlayerCount = player.ctfTeam === CtfTeam.SecondTeam ? secondTeamPlayerCount + 1 : 0;
            }

            return player?.startPosition;
        });

        const leavingKey = this.listOfPlayers.getValues().length;

        loop1: for (let i = 0; i < this.originalBoardGame.size; ++i) {
            for (let j = 0; j < this.originalBoardGame.size; ++j) {
                const containedItem: Item | undefined = this.originalBoardGame.tiles[i][j].containedItem;
                if (!containedItem) continue;

                if (containedItem.type === ItemType.StartingPoint && !usedStartPos.find((pos) => pos.x === i && pos.y === j)) {
                    const startPos: Position = { x: i, y: j };
                    const spawnPos = this.isValidPosition(startPos) ? startPos : this.findNearestValidTile(startPos);
                    this.boardGame.tiles[spawnPos.x][spawnPos.y].containedPlayer = player;
                    player.position = spawnPos;
                    player.inventory = [];
                    player.leavingKey = leavingKey;
                    const teams: CtfTeam[] = [CtfTeam.FirstTeam, CtfTeam.SecondTeam];
                    player.ctfTeam =
                        firstTeamPlayerCount > secondTeamPlayerCount
                            ? CtfTeam.SecondTeam
                            : firstTeamPlayerCount === secondTeamPlayerCount
                              ? teams[Math.floor(Math.random() * teams.length)]
                              : CtfTeam.FirstTeam;
                    player.startPosition = startPos;

                    if (this.statisticsManager.playerStatisticsMap.has(player.userId)) {
                        player.victories = this.statisticsManager.getVictoryAmount(player.userId);
                        this.statisticsManager.playerStatisticsMap.set(player.userId, {
                            ...this.statisticsManager.playerStatisticsMap.get(player.userId),
                            name: player.name,
                        });
                    } else {
                        this.statisticsManager.initializePlayerStatistics(player);
                    }
                    this.listOfPlayers.addToBack(player);
                    const playerCopy = structuredClone(player);
                    playerCopy.position = startPos;
                    this.staticPlayerMap.set(playerCopy.name, playerCopy);
                    this.playerSlotManager.markDropIn(playerCopy);
                    break loop1;
                }
            }
        }
    }
    private placePlayers(): void {
        const stackOfPlayers: Player[] = shuffleArray<Player>(this.players.getValues());
        let positionInListOfPlayers = 0;
        let playerIsInFirstTeam = true;

        for (let i = 0; i < this.boardGame.size; ++i) {
            for (let j = 0; j < this.boardGame.size; ++j) {
                const containedItem: Item | undefined = this.boardGame.tiles[i][j].containedItem;
                if (!containedItem) continue;
                if (containedItem.type === ItemType.StartingPoint) {
                    containedItem.disabled = true;
                    if (stackOfPlayers.length > 0) {
                        ++positionInListOfPlayers;
                        const player: Player = stackOfPlayers.pop();
                        this.boardGame.tiles[i][j].containedPlayer = player;

                        player.position = { x: i, y: j };
                        player.inventory = [];
                        player.leavingKey = positionInListOfPlayers;
                        player.ctfTeam = playerIsInFirstTeam ? CtfTeam.FirstTeam : CtfTeam.SecondTeam;
                        player.startPosition = { x: i, y: j };

                        (this.staticPlayerMap.get(player.name) ?? STANDARD_LIST_PLAYERS[0]).leavingKey = positionInListOfPlayers;
                        (this.staticPlayerMap.get(player.name) ?? STANDARD_LIST_PLAYERS[0]).position = { x: i, y: j };
                        (this.staticPlayerMap.get(player.name) ?? STANDARD_LIST_PLAYERS[0]).inventory = [];
                        (this.staticPlayerMap.get(player.name) ?? STANDARD_LIST_PLAYERS[0]).ctfTeam = playerIsInFirstTeam
                            ? CtfTeam.FirstTeam
                            : CtfTeam.SecondTeam;
                        (this.staticPlayerMap.get(player.name) ?? STANDARD_LIST_PLAYERS[0]).startPosition = { x: i, y: j };

                        playerIsInFirstTeam = !playerIsInFirstTeam;

                        this.playerSlotManager.registerInitialPlayer(player);
                    }
                }
            }
        }
    }

    private initiateFight(attacker: Player, defender: Player): void {
        const firstPlayer = this.determineFirstAttacker(attacker, defender);
        this.ongoingFight = {
            attackingPlayer: firstPlayer,
            defendingPlayer: firstPlayer === attacker ? defender : attacker,
            attackerEscapeAttempts: 0,
            defenderEscapeAttempts: 0,
        };
    }

    private determineFirstAttacker(player1: Player, player2: Player): Player {
        const playerCopy1: Player = this.staticPlayerMap.get(player1.name);
        const playerCopy2: Player = this.staticPlayerMap.get(player2.name);
        if (playerCopy1.attributes.speedValue > playerCopy2.attributes.speedValue) return player1;
        if (playerCopy2.attributes.speedValue > playerCopy1.attributes.speedValue) return player2;
        return this.activePlayer;
    }

    private isOnIce(player: Player): boolean {
        const position = player.position;
        if (!position) return false;
        const tile = this.boardGame.tiles[position.x][position.y];
        return tile.type === TileType.Ice;
    }
    private resetHealth(player: Player) {
        const playerCopy: Player = this.staticPlayerMap.get(player.name);
        if (playerCopy) {
            player.attributes.healthValue = playerCopy.attributes.healthValue;
        }
    }
    private resetSpeed(player: Player) {
        const playerCopy: Player = this.staticPlayerMap.get(player.name);
        if (playerCopy) {
            player.attributes.speedValue = playerCopy.attributes.speedValue;
        }
    }

    private resetDefense(player: Player) {
        const playerCopy: Player = this.staticPlayerMap.get(player.name);
        if (playerCopy) {
            player.attributes.defenseValue = playerCopy.attributes.defenseValue;
        }
    }

    private resetAttack(player: Player) {
        const playerCopy: Player = this.staticPlayerMap.get(player.name);
        if (playerCopy) {
            player.attributes.attackValue = playerCopy.attributes.attackValue;
        }
    }
    private isValidPosition(pos: Position): boolean {
        if (pos.x >= this.boardGame.size || pos.x < 0 || pos.y >= this.boardGame.size || pos.y < 0) return false;

        const tile = this.boardGame.tiles[pos.x][pos.y];
        if (tile.containedPlayer) return false;

        if (tile.type === TileType.Wall) return false;
        if (tile.type === TileType.Door) {
            return this.droppingItems ? false : tile.doorState;
        }

        const containedItem = tile.containedItem;

        if (containedItem) {
            const startingPointCondition: boolean = this.droppingItems ? true : containedItem.type !== ItemType.StartingPoint;
            const disableCondition: boolean = this.droppingItems ? true : !containedItem.disabled;
            if (startingPointCondition && disableCondition && containedItem.type !== ItemType.RandomItem) {
                return false;
            }
        }

        return true;
    }

    private findNearestValidTile(start: Position): Position {
        let radius = 1;
        while (radius < this.boardGame.size) {
            const directions = [
                { x: start.x + radius, y: start.y },
                { x: start.x - radius, y: start.y },
                { x: start.x, y: start.y + radius },
                { x: start.x, y: start.y - radius },
            ];

            for (const newPos of directions) {
                if (this.isValidPosition(newPos)) {
                    return newPos;
                }
            }

            ++radius;
        }

        return start;
    }

    private dropAllItems(player: Player): void {
        const inventory = player.inventory;
        const position = player.position;
        const registeredPlayer = this.listOfPlayers.getValues().find((searchedPlayer) => {
            return searchedPlayer.name === player.name;
        });
        if (!inventory || !position || !registeredPlayer) return;
        this.droppingItems = true;

        for (const item of inventory) {
            const newPosition = this.findNearestValidTile(position);
            this.itemEffectApplicator.removeEffect(player, item.name);
            this.boardGame.tiles[newPosition.x][newPosition.y].containedItem = item;
        }
        registeredPlayer.inventory = [];
        this.droppingItems = false;
    }

    private initializePlayerStatistics(): void {
        for (const player of this.players.getValues()) {
            this.statisticsManager.initializePlayerStatistics(player);
        }
    }
    private weightFunction(tile: Tile): number {
        switch (tile.type) {
            case TileType.Ice:
                return 0;
            case TileType.Water:
                return 2;
            case TileType.Grass:
                return 1;
            case TileType.Door:
                if (tile.doorState) return 1;
                return Infinity;
            default:
                return Infinity;
        }
    }
    private rollDice(max: number) {
        return Math.floor(Math.random() * max) + 1;
    }

    private giveDiceValue(diceDescription: DiceBonus): number {
        if (diceDescription === DiceBonus.FourSideBonus) {
            return SMALL_DICE_VALUE;
        } else {
            return LARGE_DICE_VALUE;
        }
    }

    private playerHasItem(player: Player, item: Item): boolean {
        const inventory = player.inventory;
        if (inventory) {
            return inventory.find((i) => {
                return item.name === i.name;
            })
                ? true
                : false;
        }
        return false;
    }

    get initialPlayers(): number {
        return this.initialPlayerCount;
    }

    markPlayerAsAbandoned(userId: string): void {
        this.abandonedPlayers.add(userId);
    }

    hasPlayerAbandoned(userId: string): boolean {
        return this.abandonedPlayers.has(userId);
    }

    getActivePlayers(): Player[] {
        return this.players.getValues().filter((player) => !this.abandonedPlayers.has(player.userId));
    }
}
