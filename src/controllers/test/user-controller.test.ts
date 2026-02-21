import request from 'supertest';
import { Application } from 'express';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../../typeormconfig';
import { createApp } from '../../app';
import { User } from '../../entities/user';

let server: Application;
let dataSource: DataSource;

describe('UserController Integration', () => {
    const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
    };

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

    describe('POST /users/register', () => {
        it('should register a new user', async () => {
            const res = await request(server)
                .post('/partner-app/api/users/register')
                .send(userData);
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('email', 'test@example.com');
            expect(res.body).not.toHaveProperty('password');
        });

        it('should not register with invalid email', async () => {
            const res = await request(server)
                .post('/partner-app/api/users/register')
                .send({
                    ...userData,
                    email: 'invalid',
                });
            expect(res.status).toBe(400);
        });

        it('should not register with weak password', async () => {
            const res = await request(server)
                .post('/partner-app/api/users/register')
                .send({
                    ...userData,
                    password: 'weak',
                });
            expect(res.status).toBe(400);
        });

        it('should not register with missing fields', async () => {
            const res = await request(server)
                .post('/partner-app/api/users/register')
                .send({
                    email: 'test@example.com',
                    password: 'Password123!',
                });
            expect(res.status).toBe(400);
        });

        it('should not register with duplicate email', async () => {
            // First registration
            await request(server)
                .post('/partner-app/api/users/register')
                .send(userData);

            // Second registration with the same email
            const res = await request(server)
                .post('/partner-app/api/users/register')
                .send(userData);
            expect(res.status).toBe(409);
        });
    });

    describe('POST /users/login', () => {
        it('should authenticate user and return tokens', async () => {
            // First register a user
            await request(server)
                .post('/partner-app/api/users/register')
                .send(userData);

            // Then attempt to login
            const res = await request(server)
                .post('/partner-app/api/users/login')
                .send({
                    email: userData.email,
                    password: userData.password,
                });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
        });

        it('should not authenticate with wrong password', async () => {
            // First register a user
            await request(server)
                .post('/partner-app/api/users/register')
                .send(userData);

            // Then attempt to login with wrong password
            const res = await request(server)
                .post('/partner-app/api/users/login')
                .send({
                    email: userData.email,
                    password: 'WrongPassword!',
                });
            expect(res.status).toBe(401);
        });

        it('should not authenticate non-existent user', async () => {
            const res = await request(server)
                .post('/partner-app/api/users/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Password123!',
                });
            expect(res.status).toBe(401);
        });

        it('should not authenticate with missing fields', async () => {
            const res = await request(server)
                .post('/partner-app/api/users/login')
                .send({
                    email: userData.email,
                });
            expect(res.status).toBe(400);
        });
    });
    describe('POST /users/refresh', () => {
        let refreshToken: string;
        beforeEach(async () => {
            // Register and login to get refresh token
            await request(server)
                .post('/partner-app/api/users/register')
                .send(userData);
            const res = await request(server)
                .post('/partner-app/api/users/login')
                .send({
                    email: userData.email,
                    password: userData.password,
                });
            refreshToken = res.body.refreshToken;
        });

        it('should refresh tokens with valid refresh token', async () => {
            const res = await request(server)
                .post('/partner-app/api/users/refresh')
                .send({ refreshToken });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
            expect(res.body.refreshToken).not.toBe(refreshToken);
        });

        it('should not refresh with invalid refresh token', async () => {
            const res = await request(server)
                .post('/partner-app/api/users/refresh')
                .send({ refreshToken: 'invalidtoken' });
            expect(res.status).toBe(401);
        });

        it('should not refresh with missing refresh token', async () => {
            const res = await request(server)
                .post('/partner-app/api/users/refresh')
                .send({});
            expect(res.status).toBe(400);
        });
    });
    describe('PATCH /users/profile', () => {
        let token: string;
        beforeEach(async () => {
            // Register and login to get JWT
            await request(server)
                .post('/partner-app/api/users/register')
                .send(userData);
            const res = await request(server)
                .post('/partner-app/api/users/login')
                .send({ email: userData.email, password: userData.password });
            token = res.body.accessToken;
        });

        it('should update the user profile', async () => {
            const res = await request(server)
                .patch('/partner-app/api/users/profile')
                .set('Authorization', `Bearer ${token}`)
                .send({ firstName: 'Updated', lastName: 'Name' });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('firstName', 'Updated');
            expect(res.body).toHaveProperty('lastName', 'Name');
        });

        it('should not update profile with no fields', async () => {
            const res = await request(server)
                .patch('/partner-app/api/users/profile')
                .set('Authorization', `Bearer ${token}`)
                .send({});
            expect(res.status).toBe(400);
        });

        it('should not update profile without token', async () => {
            const res = await request(server)
                .patch('/partner-app/api/users/profile')
                .send({ firstName: 'NoAuth' });
            expect(res.status).toBe(401);
        });
    });

    describe('GET /users/profile', () => {
        let token: string;
        beforeEach(async () => {
            // Register and login to get JWT
            await request(server)
                .post('/partner-app/api/users/register')
                .send(userData);
            const res = await request(server)
                .post('/partner-app/api/users/login')
                .send({ email: userData.email, password: userData.password });
            token = res.body.accessToken;
        });

        it('should retrieve the authenticated user profile', async () => {
            const res = await request(server)
                .get('/partner-app/api/users/profile')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('email', userData.email);
            expect(res.body).not.toHaveProperty('password');
        });

        it('should not retrieve profile without token', async () => {
            const res = await request(server).get(
                '/partner-app/api/users/profile'
            );
            expect(res.status).toBe(401);
        });
    });
});
