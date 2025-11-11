/* eslint-disable no-console */
/* eslint-disable no-dupe-keys */
/* eslint-disable no-undef */
import { HttpException } from '@app/classes/http-exception/http.exception';
import { DATABASE_COLLECTION, USER_COLLECTION } from '@app/constants/development-constants';
import { DatabaseService } from '@app/services/database/database.service';
import { InterfaceTheme } from '@common/enums/interfaceTheme';
import { Language } from '@common/enums/language';
import { User } from '@common/user';
import httpStatus from 'http-status-codes';
import { Collection } from 'mongodb';
import { Service } from 'typedi';

export type UserUpdateDTO = Partial<Pick<User, 'username' | 'email' | 'avatar'>>;
@Service()
export class UsersService {
    constructor(private databaseService: DatabaseService) {}
    get collection(): Collection<User> {
        return this.databaseService.database.collection(USER_COLLECTION);
    }

    async getAllUsers(): Promise<User[]> {
        return this.collection
            .find({})
            .toArray()
            .then((users: User[]) => {
                return users;
            });
    }

    async getUser(id: string): Promise<User> {
        const user = await this.collection.findOne({ id });
        if (user) {
            return user;
        }
        throw new Error("L'utilisateur est introuvable.");
    }

    async createUser(user: User): Promise<void> {
        const existingUsername = await this.collection.findOne({
            $and: [{ username: user.username }, { username: { $ne: '[supprimé]' } }],
        });
        if (existingUsername) {
            throw new HttpException('Pseudonyme déjà utilisé', httpStatus.BAD_REQUEST);
        }

        if (!user.parameters) user.parameters = { language: Language.french, theme: InterfaceTheme.Light };

        await this.collection.insertOne(user);
    }

    async deleteUser(userId: string): Promise<void> {
        await this.databaseService.database.collection(DATABASE_COLLECTION).deleteMany({ ownerId: userId });
        const result = await this.collection.updateOne({ id: userId }, { $set: { username: '[supprimé]' } });

        if (result.matchedCount === 0) {
            throw new Error('Utilisateur introuvable');
        }
    }

    async updateUser(user: User): Promise<void> {
        const existingUser = await this.collection.findOne({ username: user.username, id: { $ne: user.id } });
        if (existingUser) {
            throw new HttpException('Le pseudonyme est déjà utilisé', httpStatus.BAD_REQUEST);
        }

        const result = await this.collection.updateOne(
            { id: user.id },
            {
                $set: {
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    friends: user.friends,
                    blocked: user.blocked,
                    inventory: user.inventory,
                    money: user.money,
                    parameters: user.parameters,
                    statistics: user.statistics,
                    status: user.status,
                },
            },
        );

        if (result.matchedCount === 0) {
            throw new Error("Échec lors de la mise à jour de l'utilisateur.");
        }
    }
}
