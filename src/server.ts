import 'dotenv/config';
import { buildApp } from './app.js';

const app = buildApp();

app.listen({ port: 3001, host: '0.0.0.0' }, (err: Error | null, address: string) => {
    if (err) {
        app.log.error(err, 'Server failed to start');
        process.exit(1);
    }
    app.log.info({ address }, 'Server is running');
});

