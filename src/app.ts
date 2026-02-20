import { json } from 'body-parser';
import 'reflect-metadata';
import dotenv from 'dotenv';
import { InversifyExpressServer } from 'inversify-express-utils';
import { getDataSource } from './typeormconfig';
import { diContainer } from '../inversify.config';
import { TYPES } from './lib';

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
    });

    return app.build();
}
