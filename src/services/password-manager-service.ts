import { scrypt, randomBytes } from 'crypto';
import { injectable } from 'inversify';
import { promisify } from 'util';

export interface PasswordManagerService {
    toHash(password: string): Promise<string>;
    compare(storedPassword: string, suppliedPassword: string): Promise<boolean>;
}

const scryptAsync = promisify(scrypt);

/**
 * A utility class to hash user password before storing in DB
 * and compares user supplied passowrd with the stored hash
 */
@injectable()
export class PasswordManagerServiceImpl implements PasswordManagerService {
    async toHash(password: string): Promise<string> {
        const salt = randomBytes(8).toString('hex');
        const buf = (await scryptAsync(password, salt, 64)) as Buffer;
        return `${buf.toString('hex')}.${salt}`;
    }

    async compare(
        storedPassword: string,
        suppliedPassword: string
    ): Promise<boolean> {
        const [hashed, salt] = storedPassword.split('.');
        const buf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
        return buf.toString('hex') === hashed;
    }
}
