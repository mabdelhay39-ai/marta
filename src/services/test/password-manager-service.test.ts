import 'reflect-metadata';
import { PasswordManagerServiceImpl } from '../password-manager-service';

describe('PasswordManagerService', () => {
    const passwordManager = new PasswordManagerServiceImpl();

    it('should hash and compare password correctly', async () => {
        const hash = await passwordManager.toHash('password123');
        expect(hash).toBeDefined();
        expect(typeof hash).toBe('string');
        expect(hash.length).toBeGreaterThan(0);

        const isMatch = await passwordManager.compare(hash, 'password123');
        expect(isMatch).toBe(true);

        const isNotMatch = await passwordManager.compare(hash, 'wrong');
        expect(isNotMatch).toBe(false);
    });
});
