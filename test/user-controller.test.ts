import request from 'supertest';
import { Application } from 'express';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../src/typeormconfig';
import { createApp } from '../src/app';
import { User } from '../src/entities/user';

let server: Application;
let dataSource: DataSource;

describe('UserController Integration', () => {
    beforeAll(async () => {
        dataSource = AppDataSource;
        if (!dataSource.isInitialized) {
            await dataSource.initialize();
            // Run migrations after initializing the data source
            await dataSource.runMigrations();
        }
        server = await createApp();
    });

    afterAll(async () => {
        if (dataSource && dataSource.isInitialized) {
            await dataSource.destroy();
        }
    });

    afterEach(async () => {
        // Clean up users after each test
        if (dataSource && dataSource.isInitialized) {
            await dataSource.getRepository(User).clear();
        }
    });

    describe('POST /users/', () => {
        it('should register a new user', async () => {
            const res = await request(server)
                .post('/partner-app/api/users/')
                .send({
                    email: 'test@example.com',
                    password: 'Password123!',
                    firstName: 'Test',
                    lastName: 'User',
                });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('email', 'test@example.com');
            expect(res.body).not.toHaveProperty('password');
        });

        it('should not register with invalid email', async () => {
            const res = await request(server)
                .post('/partner-app/api/users/')
                .send({
                    email: 'invalid',
                    password: 'Password123!',
                    firstName: 'Test',
                    lastName: 'User',
                });
            expect(res.status).toBe(400);
        });

        it('should not register with weak password', async () => {
            const res = await request(server)
                .post('/partner-app/api/users/')
                .send({
                    email: 'test@example.com',
                    password: 'weak',
                    firstName: 'Test',
                    lastName: 'User',
                });
            expect(res.status).toBe(400);
        });

        it('should not register with missing fields', async () => {
            const res = await request(server)
                .post('/partner-app/api/users/')
                .send({
                    email: 'test@example.com',
                    password: 'Password123!',
                });
            expect(res.status).toBe(400);
        });

        it('should not register with duplicate email', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'Password123!',
                firstName: 'Test',
                lastName: 'User',
            };

            // First registration
            await request(server)
                .post('/partner-app/api/users/')
                .send(userData);

            // Second registration with the same email
            const res = await request(server)
                .post('/partner-app/api/users/')
                .send(userData);
            expect(res.status).toBe(409);
        });
    });
});
