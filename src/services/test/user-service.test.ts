import 'reflect-metadata';
import { UserServiceImpl } from '../user-service';
import { RegisterUserDto, UpdateProfileDto } from '../../lib/user-dtos';
import * as jwtUtils from '../../lib/jwt';

// Mocks
const mockUserRepository = {
    findById: jest.fn(),
    update: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    updateRefreshToken: jest.fn(),
};
const mockPasswordManager = {
    toHash: jest.fn(),
    compare: jest.fn(),
};

jest.mock('../../repositories/user-repository');

const userService = new UserServiceImpl(
    mockUserRepository as any,
    mockPasswordManager as any
);

describe('UserService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should register a new user', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(null);
            mockPasswordManager.toHash.mockResolvedValue('hashed');
            mockUserRepository.create.mockResolvedValue({
                id: '1',
                email: 'test@test.com',
            });
            const dto: RegisterUserDto = {
                email: 'test@test.com',
                password: 'pass',
                firstName: 'A',
                lastName: 'B',
            };
            const user = await userService.register(dto);

            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
                'test@test.com'
            );
            expect(mockPasswordManager.toHash).toHaveBeenCalledWith('pass');
            expect(mockUserRepository.create).toHaveBeenCalledWith({
                ...dto,
                password: 'hashed',
            });
            expect(user).toEqual({ id: '1', email: 'test@test.com' });
        });

        it('should throw if email exists', async () => {
            mockUserRepository.findByEmail.mockResolvedValue({ id: '1' });
            const dto: RegisterUserDto = {
                email: 'test@test.com',
                password: 'pass',
                firstName: 'A',
                lastName: 'B',
            };

            await expect(userService.register(dto)).rejects.toThrow(
                expect.objectContaining({
                    name: 'EmailAlreadyInUseError',
                    message: 'Email already in use',
                })
            );
        });
    });

    describe('authenticate', () => {
        it('should return JWT if credentials are valid', async () => {
            mockUserRepository.findByEmail.mockResolvedValue({
                id: '1',
                email: 'test@test.com',
                password: 'hashed',
            });
            mockPasswordManager.compare.mockResolvedValue(true);

            // Patch signJwt to return a fake token
            jest.spyOn(jwtUtils, 'signJwt').mockReturnValue('token');
            jest.spyOn(jwtUtils, 'signRefreshToken').mockReturnValue(
                'refreshToken'
            );

            const tokens = await userService.authenticate(
                'test@test.com',
                'pass'
            );
            expect(tokens).toEqual({
                accessToken: 'token',
                refreshToken: 'refreshToken',
            });
        });

        it('should throw if user not found', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(null);

            await expect(
                userService.authenticate('test@test.com', 'pass')
            ).rejects.toThrow(
                expect.objectContaining({
                    name: 'InvalidCredentialsError',
                    message: 'Invalid email or password',
                })
            );
        });

        it('should throw if password does not match', async () => {
            mockUserRepository.findByEmail.mockResolvedValue({
                id: '1',
                email: 'test@test.com',
                password: 'hashed',
            });
            mockPasswordManager.compare.mockResolvedValue(false);

            await expect(
                userService.authenticate('test@test.com', 'pass')
            ).rejects.toThrow(
                expect.objectContaining({
                    name: 'InvalidCredentialsError',
                    message: 'Invalid email or password',
                })
            );
        });
    });

    describe('getProfile', () => {
        it('should return user profile', async () => {
            mockUserRepository.findById.mockResolvedValue({
                id: '1',
                email: 'test@test.com',
            });
            const user = await userService.getProfile('1');
            expect(user).toEqual({ id: '1', email: 'test@test.com' });
        });

        it('should return null if user not found', async () => {
            mockUserRepository.findById.mockResolvedValue(null);
            const user = await userService.getProfile('1');
            expect(user).toBeNull();
        });
    });

    describe('updateProfile', () => {
        it('should update firstName and lastName', async () => {
            mockUserRepository.update.mockResolvedValue({
                id: '1',
                firstName: 'A',
                lastName: 'B',
            });
            const dto: UpdateProfileDto = { firstName: 'A', lastName: 'B' };
            const user = await userService.updateProfile('1', dto);

            expect(mockUserRepository.update).toHaveBeenCalledWith('1', {
                firstName: 'A',
                lastName: 'B',
            });
            expect(user).toEqual({ id: '1', firstName: 'A', lastName: 'B' });
        });

        it('should return null if no fields to update', async () => {
            const user = await userService.updateProfile('1', {});
            expect(user).toBeNull();
        });
    });

    describe('refreshTokens', () => {
        it('should update refresh token', async () => {
            mockUserRepository.updateRefreshToken.mockResolvedValue({
                affected: 1,
            });
            mockUserRepository.findById.mockResolvedValue({
                id: '1',
                email: 'test@test.com',
                refreshToken: 'oldToken',
            });
            jest.spyOn(jwtUtils, 'verifyRefreshToken').mockReturnValue({
                id: '1',
            });
            jest.spyOn(jwtUtils, 'signRefreshToken').mockReturnValue(
                'newToken'
            );

            const result = await userService.refreshTokens('oldToken');
            expect(mockUserRepository.updateRefreshToken).toHaveBeenCalledWith(
                '1',
                'newToken'
            );
            expect(result).toEqual({
                accessToken: 'token',
                refreshToken: 'newToken',
            });
        });

        it('should throw if refresh token is invalid', async () => {
            jest.spyOn(jwtUtils, 'verifyRefreshToken').mockImplementation(
                () => {
                    throw new Error('Invalid token');
                }
            );

            await expect(
                userService.refreshTokens('invalidToken')
            ).rejects.toThrow(
                expect.objectContaining({
                    name: 'InvalidRefreshTokenError',
                    message: 'Invalid or expired refresh token',
                })
            );
        });

        it('should throw if user not found', async () => {
            jest.spyOn(jwtUtils, 'verifyRefreshToken').mockReturnValue({
                id: '1',
            });
            mockUserRepository.findById.mockResolvedValue(null);

            await expect(userService.refreshTokens('token')).rejects.toThrow(
                expect.objectContaining({
                    name: 'InvalidRefreshTokenError',
                    message: 'Invalid or expired refresh token',
                })
            );
        });
    });
});
