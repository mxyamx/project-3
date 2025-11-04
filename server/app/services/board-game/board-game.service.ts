import { HttpException } from '@app/classes/http-exception/http.exception';
import { DATABASE_COLLECTION } from '@app/constants/development-constants';
import { DatabaseService } from '@app/services/database/database.service';
import { BoardGame, BoardGameDTO } from '@common/board-game';
import { GamePrivacy } from '@common/enums/game-visibility';
import httpStatus from 'http-status-codes';
import { Collection, WithId } from 'mongodb';
import { Service } from 'typedi';
import { BoardGameValidation } from './board-game-validation';

@Service()
export class BoardGameService {
    constructor(private databaseService: DatabaseService) {}
    get collection(): Collection<BoardGame> {
        return this.databaseService.database.collection(DATABASE_COLLECTION);
    }

    async getManageableBoards(userId: string): Promise<BoardGameDTO[]> {
        const match = {
            $or: [{ privacy: GamePrivacy.Public }, { ownerId: userId }],
        };

        const pipeline = this.withOwnerLookup(match);
        const results = await this.databaseService.database.collection(DATABASE_COLLECTION).aggregate<BoardGameDTO>(pipeline).toArray();

        return results;
    }
    async getPlayableBoards(userId: string): Promise<BoardGame[]> {
        const match = {
            $or: [{ privacy: GamePrivacy.Public }, { privacy: GamePrivacy.PrivateShared }, { ownerId: userId }],
        };

        const pipeline = this.withOwnerLookup(match);
        const results = await this.databaseService.database.collection(DATABASE_COLLECTION).aggregate<BoardGameDTO>(pipeline).toArray();

        return results;
    }

    async getBoard(id: string): Promise<BoardGameDTO> {
        const pipeline = [
            { $match: { id } },
            {
                $lookup: {
                    from: 'users',
                    let: { ownerId: '$ownerId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$id', '$$ownerId'] },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                username: 1,
                            },
                        },
                    ],
                    as: 'ownerData',
                },
            },
            {
                $addFields: {
                    ownerName: { $arrayElemAt: ['$ownerData.username', 0] },
                },
            },
            {
                $project: { ownerData: 0 },
            },
        ];

        const results = await this.collection.aggregate<BoardGameDTO>(pipeline).toArray();
        const boardGame = results[0];

        if (!boardGame) {
            throw new Error('Le jeu est introuvable.');
        }

        return boardGame;
    }

    async createBoard(board: BoardGame): Promise<void> {
        if (!board || !Array.isArray(board.tiles) || board.tiles.length === 0) {
            throw new HttpException('Les données du jeu sont manquantes.', httpStatus.BAD_REQUEST);
        }
        const existingBoard = await this.collection.findOne({ name: board.name });
        const validation = BoardGameValidation.validateBoard(board, existingBoard);
        if (!validation.valid) {
            throw new HttpException(validation.errors.join(' '), httpStatus.BAD_REQUEST);
        }
        board.id = crypto.randomUUID();
        await this.collection.insertOne(board);
    }

    async duplicateBoard(board: BoardGame): Promise<BoardGame> {
        if (!board || !Array.isArray(board.tiles) || board.tiles.length === 0) {
            throw new HttpException('Les données du jeu sont manquantes.', httpStatus.BAD_REQUEST);
        }

        let existingBoard;
        let name;
        let i = 0;
        do {
            name = i === 0 ? board.name + '_copie' : board.name + `_copie${i}`;
            existingBoard = await this.collection.findOne({ name: name });
            i++;
        } while (existingBoard);
        board.name = name;
        board.id = crypto.randomUUID();
        if ('_id' in board) {
            delete (board as any)._id;
        }
        await this.collection.insertOne(board);
        return board;
    }

    async deleteBoard(userId: string, id: string): Promise<void> {
        return this.collection
            .findOneAndDelete({
                $and: [
                    { id },
                    {
                        $or: [
                            {
                                privacy: GamePrivacy.Public,
                            },
                            { ownerId: userId },
                        ],
                    },
                ],
            })
            .then((res: WithId<BoardGame>) => {
                if (!res) {
                    throw new Error('Le jeu n a pas été trouvé.');
                }
            })
            .catch(() => {
                throw new Error('Échec lors de la suppression du jeu.');
            });
    }

    async updateBoard(board: BoardGame): Promise<void> {
        const existingBoard = await this.collection.findOne({ name: board.name });
        const validation = BoardGameValidation.validateBoard(board, existingBoard);
        if (!validation.valid) {
            throw new HttpException(validation.errors.join(' '), httpStatus.BAD_REQUEST);
        }
        const result = await this.collection.updateOne(
            { id: board.id },
            {
                $set: {
                    name: board.name,
                    description: board.description,
                    size: board.size,
                    gameMode: board.gameMode,
                    tiles: board.tiles,
                    previewImage: board.previewImage,
                    lastModified: new Date(),
                    itemInfos: board.itemInfos,
                    privacy: board.privacy,
                },
            },
        );

        if (result.matchedCount === 0 || result.modifiedCount === 0) {
            throw new Error('Échec lors de la mise à jour du jeu.');
        }
    }
    private withOwnerLookup(matchStage: any) {
        return [
            { $match: matchStage },
            {
                $lookup: {
                    from: 'users',
                    let: { ownerId: '$ownerId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$id', '$$ownerId'] },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                username: 1,
                            },
                        },
                    ],
                    as: 'ownerData',
                },
            },
            {
                $addFields: {
                    ownerName: { $arrayElemAt: ['$ownerData.username', 0] },
                },
            },
            {
                $project: {
                    ownerData: 0,
                },
            },
        ];
    }
}
