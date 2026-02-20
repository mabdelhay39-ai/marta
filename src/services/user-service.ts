import { inject, injectable } from 'inversify';
import { UserRepository } from '../repositories/user-repository';
import { PasswordManagerService } from './password-manager-service';
import { RegisterUserDto } from '../lib/user-dtos';
import { User } from '../entities/user';
import { TYPES } from '../lib/types';
import { EmailAlreadyInUseError } from '../lib/errors';

export interface UserService {
    register(input: RegisterUserDto): Promise<User>;
}

@injectable()
export class UserServiceImpl implements UserService {
    constructor(
        @inject(TYPES.UserRepository) private userRepository: UserRepository,
        @inject(TYPES.PasswordManagerService)
        private passwordManager: PasswordManagerService
    ) {}

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
}
