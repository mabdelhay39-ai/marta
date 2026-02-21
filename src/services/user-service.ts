import { inject, injectable } from 'inversify';
import { UserRepository } from '../repositories/user-repository';
import { PasswordManagerService } from './password-manager-service';
import { RegisterUserDto } from '../lib/user-dtos';
import { User } from '../entities/user';
import { TYPES } from '../lib/types';
import {
    EmailAlreadyInUseError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
} from '../lib/errors';
import { signJwt, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { randomBytes } from 'crypto';

import { UpdateProfileDto } from '../lib/user-dtos';

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface UserService {
    register(input: RegisterUserDto): Promise<User>;
    authenticate(email: string, password: string): Promise<AuthTokens>;
    refreshTokens(refreshToken: string): Promise<AuthTokens>;
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
    async authenticate(email: string, password: string): Promise<AuthTokens> {
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
        // Sign JWT and refresh token
        const accessToken = signJwt({ id: user.id, email: user.email });
        const refreshToken = signRefreshToken({
            id: user.id,
            email: user.email,
            nonce: randomBytes(16).toString('hex'),
        });
        // Store refresh token in DB
        await this.userRepository.updateRefreshToken(user.id, refreshToken);
        return { accessToken, refreshToken };
    }

    /**
     * Validate and rotate refresh token, return new tokens
     */
    async refreshTokens(refreshToken: string): Promise<AuthTokens> {
        let payload: any;
        try {
            payload = verifyRefreshToken(refreshToken);
        } catch {
            throw new InvalidRefreshTokenError();
        }
        // Find user by id and check stored refresh token
        const user = await this.userRepository.findById(payload.id);
        if (!user || user.refreshToken !== refreshToken) {
            throw new InvalidRefreshTokenError();
        }

        // Issue new tokens
        const accessToken = signJwt({ id: user.id, email: user.email });
        const newRefreshToken = signRefreshToken({
            id: user.id,
            email: user.email,
            nonce: randomBytes(16).toString('hex'),
        });
        // Store new refresh token (rotate)
        await this.userRepository.updateRefreshToken(user.id, newRefreshToken);
        return { accessToken, refreshToken: newRefreshToken };
    }
}
