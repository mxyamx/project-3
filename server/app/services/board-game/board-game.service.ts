import { HttpException } from '@app/classes/http-exception/http.exception';
import { DATABASE_COLLECTION } from '@app/constants/development-constants';
import { DatabaseService } from '@app/services/database/database.service';
import { BoardGame } from '@common/board-game';
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

    async getAllBoards(): Promise<BoardGame[]> {
        return this.collection
            .find({})
            .toArray()
            .then((boards: BoardGame[]) => {
                return boards;
            });
    }

    async getBoard(id: string): Promise<BoardGame> {
        const boardGame = await this.collection.findOne({ id });
        if (boardGame) {
            return boardGame;
        }
        throw new Error('Le jeu est introuvable.');
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

    async deleteBoard(id: string): Promise<void> {
        return this.collection
            .findOneAndDelete({ id })
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
                    visibility: board.visibility,
                    lastModified: new Date(),
                    itemInfos: board.itemInfos,
                },
            },
        );

        if (result.matchedCount === 0 || result.modifiedCount === 0) {
            throw new Error('Échec lors de la mise à jour du jeu.');
        }
    }
}
