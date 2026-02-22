import { json } from 'body-parser';
import 'reflect-metadata';
import dotenv from 'dotenv';
import { InversifyExpressServer } from 'inversify-express-utils';
import { getDataSource } from './typeormconfig';
import { diContainer } from '../inversify.config';
import { TYPES } from './lib';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

dotenv.config();

export async function createApp() {
    const dataSource = await getDataSource();
    if (!dataSource.isInitialized) {
        await dataSource.initialize();
    }
    diContainer.bind(TYPES.DB).toConstantValue(dataSource);

    const app = new InversifyExpressServer(diContainer, null, {
        rootPath: '/partner-app/api',
    });
    app.setConfig((app) => {
        app.use(json());

        // Swagger setup
        const swaggerOptions = {
            definition: {
                openapi: '3.0.0',
                info: {
                    title: 'User Authentication API',
                    version: '1.0.0',
                    description:
                        'API documentation for User Authentication Service',
                },
                components: {
                    securitySchemes: {
                        bearerAuth: {
                            type: 'http',
                            scheme: 'bearer',
                            bearerFormat: 'JWT',
                        },
                    },
                },
                security: [{ bearerAuth: [] }],
            },
            apis: ['./src/controllers/*.ts'],
        };
        const swaggerSpec = swaggerJsdoc(swaggerOptions);
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    });

    return app.build();
}
