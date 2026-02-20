import {
    controller,
    httpPost,
    request,
    response,
} from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES, RegisterUserDto } from '../lib';
import { UserService } from '../services/user-service';
import { Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@controller('/users')
export class UserController {
    constructor(@inject(TYPES.UserService) private userService: UserService) {}

    /**
     * Register a new user
     * POST /users/
     */
    @httpPost('/')
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
}
