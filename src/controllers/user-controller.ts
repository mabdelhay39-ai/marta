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
import { authMiddleware, AuthRequest } from '../lib/auth-middleware';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@controller('/users')
export class UserController {
    constructor(@inject(TYPES.UserService) private userService: UserService) {}

    /**
     * Register a new user
     * POST /users/register
     */
    @httpPost('/register')
    async register(@request() req: Request, @response() res: Response) {
        try {
            // Validate input
            const dto = plainToInstance(RegisterUserDto, req.body);
            const errors = await validate(dto);

            if (errors.length > 0) {
                return res
                    .status(400)
                    .json({ message: 'Validation failed', errors });
            }

            // Call service to register user
            const user = await this.userService.register(dto);

            // Do not return password
            const { password: _, ...userData } = user;

            return res.status(201).json(userData);
        } catch (err: any) {
            switch (err.name) {
                case 'EmailAlreadyInUseError':
                    return res.status(409).json({ message: err.message });
                default:
                    return res
                        .status(500)
                        .json({ message: 'Internal server error' });
            }
        }
    }

    /**
     * User login
     * POST /users/login
     */
    @httpPost('/login')
    async login(@request() req: Request, @response() res: Response) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res
                    .status(400)
                    .json({ message: 'Email and password are required' });
            }

            // Authenticate user and get JWT
            const token = await this.userService.authenticate(email, password);
            return res.status(200).json({ token });
        } catch (err: any) {
            if (err.name === 'InvalidCredentialsError') {
                return res
                    .status(401)
                    .json({ message: 'Invalid email or password' });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * Update authenticated user's profile
     * PATCH /users/profile
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
            const { password: _, ...userData } = updated;
            return res.status(200).json(userData);
        } catch (err) {
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * Get authenticated user's profile
     * GET /users/profile
     */
    @httpGet('/profile', authMiddleware)
    async getProfile(@request() req: AuthRequest, @response() res: Response) {
        try {
            const user = await this.userService.getProfile(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            const { password: _, ...userData } = user;
            return res.status(200).json(userData);
        } catch (err) {
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}
