/**
 * Run Drizzle migrations. Use after DB is up (e.g. docker compose up -d postgres).
 *   npm run migrate
 * Or with env: DATABASE_URL=postgresql://... npm run migrate
 */
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const url = process.env.DATABASE_URL;
if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client);

async function run() {
    await migrate(db, { migrationsFolder: './drizzle' });
    await client.end();
    console.log('Migrations complete');
}

run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
