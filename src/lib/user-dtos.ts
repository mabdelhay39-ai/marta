import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export interface CreateUserDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}

export interface UpdateUserDto {
    firstName?: string;
    lastName?: string;
}

export interface UpdateProfileDto {
    firstName?: string;
    lastName?: string;
}

export class RegisterUserDto implements CreateUserDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
        message:
            'Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, and a number',
    })
    password: string;

    @IsNotEmpty()
    firstName: string;

    @IsNotEmpty()
    lastName: string;
}
