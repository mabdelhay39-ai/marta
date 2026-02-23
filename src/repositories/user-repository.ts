import { inject, injectable } from 'inversify';
import { Repository } from 'typeorm';
import { User } from '../entities/user';
import { CreateUserDto, UpdateUserDto } from '../lib/user-dtos';
import { DataSource } from 'typeorm';
import { TYPES } from '../lib';

export interface UserRepository {
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    create(userData: CreateUserDto): Promise<User>;
    update(id: string, userData: UpdateUserDto): Promise<User | null>;
    updateRefreshToken(id: string, refreshToken: string): Promise<User>;
}

@injectable()
export class UserRepositoryImpl implements UserRepository {
    private repo: Repository<User>;
    constructor(@inject(TYPES.DB) private dataSource: DataSource) {
        this.repo = this.dataSource.getRepository(User);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.repo.findOne({
            where: { email: email.trim().toLowerCase() },
        });
    }

    async findById(id: string): Promise<User | null> {
        return this.repo.findOne({ where: { id } });
    }

    async create(userData: CreateUserDto): Promise<User> {
        const user = this.repo.create(userData);
        return this.repo.save(user);
    }

    async update(id: string, userData: UpdateUserDto): Promise<User | null> {
        const user = await this.repo.findOne({ where: { id } });
        if (!user) return null;

        Object.assign(user, userData);
        await this.repo.save(user);
        return user;
    }

    async updateRefreshToken(id: string, refreshToken: string): Promise<User> {
        const user = await this.repo.findOne({ where: { id } });
        if (!user) throw new Error('User not found');

        user.refreshToken = refreshToken;
        return this.repo.save(user);
    }
}
