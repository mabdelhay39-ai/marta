import { createApp } from './app';

(async () => {
    try {
        const server = await createApp();
        const PORT = process.env.PORT || 9000;
        server.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });
    } catch (err) {
        console.error(err);
    }
})();
