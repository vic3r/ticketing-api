import 'dotenv/config';
import { buildApp } from './app.js';

const app = buildApp();

app.listen({ port: 3001, host: '0.0.0.0' }, (err: Error | null, address: string) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server is running on ${address}`);
});

