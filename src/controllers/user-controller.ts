import {
    controller,
    httpPost,
    httpPatch,
    httpGet,
    request,
    response,
} from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES, RegisterUserDto, UpdateProfileDto } from '../lib';
import { UserService } from '../services/user-service';
import { Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth-middleware';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@controller('/users')
export class UserController {
    constructor(@inject(TYPES.UserService) private userService: UserService) {}

    /**
     * @swagger
     * /partner-app/api/users/register:
     *   post:
     *     summary: Register a new user
     *     tags:
     *       - Users
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               email:
     *                 type: string
     *               password:
     *                 type: string
     *               firstName:
     *                 type: string
     *               lastName:
     *                 type: string
     *     responses:
     *       201:
     *         description: User registered successfully
     *       400:
     *         description: Invalid input
     */
    @httpPost('/register')
    async register(@request() req: Request, @response() res: Response) {
        try {
            // Validate input
            const dto = plainToInstance(RegisterUserDto, {
                email: req.body.email?.trim()?.toLowerCase() || '',
                password: req.body.password || '',
                firstName: req.body.firstName?.trim() || '',
                lastName: req.body.lastName?.trim() || '',
            });
            const errors = await validate(dto);

            if (errors.length > 0) {
                return res
                    .status(400)
                    .json({ message: 'Validation failed', errors });
            }

            // Call service to register user
            const user = await this.userService.register(dto);

            return res.status(201).json({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            });
        } catch (err: any) {
            if (err.name === 'EmailAlreadyInUseError') {
                return res.status(409).json({ message: err.message });
            }
            console.error('Error: during user registration', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * @swagger
     * /partner-app/api/users/login:
     *   post:
     *     summary: Authenticate user and return JWT
     *     tags:
     *       - Users
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               email:
     *                 type: string
     *               password:
     *                 type: string
     *     responses:
     *       200:
     *         description: Authentication successful, returns JWT
     *       401:
     *         description: Invalid credentials
     */
    @httpPost('/login')
    async login(@request() req: Request, @response() res: Response) {
        try {
            const { email, password } = req.body;
            if (!email?.trim() || !password) {
                return res
                    .status(400)
                    .json({ message: 'Email and password are required' });
            }

            // Authenticate user and get tokens
            const tokens = await this.userService.authenticate(
                email.trim(),
                password
            );
            return res.status(200).json(tokens);
        } catch (err: any) {
            if (err.name === 'InvalidCredentialsError') {
                return res
                    .status(401)
                    .json({ message: 'Invalid email or password' });
            }
            console.error('Error: during user login', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * @swagger
     * /partner-app/api/users/refresh:
     *   post:
     *     summary: Refresh access and refresh tokens
     *     tags:
     *       - Users
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               refreshToken:
     *                 type: string
     *     responses:
     *       200:
     *         description: Tokens refreshed successfully
     *       401:
     *         description: Invalid or expired refresh token
     */
    @httpPost('/refresh')
    async refresh(@request() req: Request, @response() res: Response) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res
                    .status(400)
                    .json({ message: 'Refresh token required' });
            }
            const tokens = await this.userService.refreshTokens(refreshToken);
            return res.status(200).json(tokens);
        } catch (err: any) {
            if (err.name === 'InvalidRefreshTokenError') {
                return res
                    .status(401)
                    .json({ message: 'Invalid or expired refresh token' });
            }
            console.error('Error: during token refresh', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * @swagger
     * /partner-app/api/users/profile:
     *   patch:
     *     summary: Update current user profile
     *     tags:
     *       - Users
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               firstName:
     *                 type: string
     *               lastName:
     *                 type: string
     *     responses:
     *       200:
     *         description: User profile updated
     *       400:
     *         description: No fields to update
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: User not found
     */
    @httpPatch('/profile', authMiddleware)
    async updateProfile(
        @request() req: AuthRequest,
        @response() res: Response
    ) {
        try {
            const dto = req.body as UpdateProfileDto;
            if (!dto.firstName && !dto.lastName) {
                return res.status(400).json({ message: 'No fields to update' });
            }
            const updated = await this.userService.updateProfile(
                req.user.id,
                dto
            );
            if (!updated) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(200).json({
                id: updated.id,
                email: updated.email,
                firstName: updated.firstName,
                lastName: updated.lastName,
                createdAt: updated.createdAt,
                updatedAt: updated.updatedAt,
            });
        } catch (err) {
            console.error('Error: during profile update', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * @swagger
     * /partner-app/api/users/profile:
     *   get:
     *     summary: Get current user profile
     *     tags:
     *       - Users
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: User profile returned
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: User not found
     */
    @httpGet('/profile', authMiddleware)
    async getProfile(@request() req: AuthRequest, @response() res: Response) {
        try {
            const user = await this.userService.getProfile(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.status(200).json({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            });
        } catch (err) {
            console.error('Error: during get profile', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}
