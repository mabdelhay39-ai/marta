import { inject, injectable } from 'inversify';
import { UserRepository } from '../repositories/user-repository';
import { PasswordManagerService } from './password-manager-service';
import { RegisterUserDto } from '../lib/user-dtos';
import { User } from '../entities/user';
import { TYPES } from '../lib/types';
import { EmailAlreadyInUseError, InvalidCredentialsError } from '../lib/errors';
import { signJwt } from '../lib/jwt';

import { UpdateProfileDto } from '../lib/user-dtos';

export interface UserService {
    register(input: RegisterUserDto): Promise<User>;
    authenticate(email: string, password: string): Promise<string>;
    getProfile(userId: string): Promise<User | null>;
    updateProfile(userId: string, data: UpdateProfileDto): Promise<User | null>;
}

@injectable()
export class UserServiceImpl implements UserService {
    constructor(
        @inject(TYPES.UserRepository) private userRepository: UserRepository,
        @inject(TYPES.PasswordManagerService)
        private passwordManager: PasswordManagerService
    ) {}

    async getProfile(userId: string): Promise<User | null> {
        return this.userRepository.findById(userId);
    }

    async updateProfile(
        userId: string,
        data: UpdateProfileDto
    ): Promise<User | null> {
        // Only allow updating firstName and lastName
        const updateData: any = {};
        if (data.firstName) updateData.firstName = data.firstName;
        if (data.lastName) updateData.lastName = data.lastName;
        if (Object.keys(updateData).length === 0) return null;
        return this.userRepository.update(userId, updateData);
    }

    async register(userData: RegisterUserDto): Promise<User> {
        // Check if email already exists
        const existing = await this.userRepository.findByEmail(userData.email);
        if (existing) {
            throw new EmailAlreadyInUseError();
        }
        // Hash password
        const hashedPassword = await this.passwordManager.toHash(
            userData.password
        );
        // Create user
        const user = await this.userRepository.create({
            ...userData,
            password: hashedPassword,
        });
        return user;
    }

    /**
     * Authenticate user and return JWT
     */
    async authenticate(email: string, password: string): Promise<string> {
        // Find user by email
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new InvalidCredentialsError();
        }
        // Compare password
        const isMatch = await this.passwordManager.compare(
            user.password,
            password
        );
        if (!isMatch) {
            throw new InvalidCredentialsError();
        }
        // Sign JWT
        const token = signJwt({ id: user.id, email: user.email });
        return token;
    }
}
