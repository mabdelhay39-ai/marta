export class EmailAlreadyInUseError extends Error {
    constructor() {
        super('Email already in use');
        this.name = 'EmailAlreadyInUseError';
    }
}

export class InvalidCredentialsError extends Error {
    constructor() {
        super('Invalid email or password');
        this.name = 'InvalidCredentialsError';
    }
}

export class InvalidRefreshTokenError extends Error {
    constructor() {
        super('Invalid or expired refresh token');
        this.name = 'InvalidRefreshTokenError';
    }
}
