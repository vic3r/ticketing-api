/**
 * Create an admin user or promote an existing user to admin.
 * Run after migrate: npm run seed:admin
 *
 * Set env:
 *   ADMIN_EMAIL=admin@example.com
 *   ADMIN_PASSWORD=secret123
 *   ADMIN_NAME=Admin (optional; used only when creating a new user)
 *
 * If a user with ADMIN_EMAIL exists, their role is set to 'admin'.
 * Otherwise a new user is created with role 'admin'.
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';

async function run() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME ?? 'Admin';

    if (!email || !password) {
        console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD');
        process.exit(1);
    }

    const existing = await db.query.users.findFirst({
        where: eq(users.email, email),
        columns: { id: true, email: true, role: true },
    });

    if (existing) {
        await db.update(users).set({ role: 'admin' }).where(eq(users.id, existing.id));
        console.log(`User ${email} promoted to admin.`);
        return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.insert(users).values({
        email,
        name,
        passwordHash,
        role: 'admin',
    });
    console.log(`Admin user created: ${email}. Use this account to create events.`);
}

run().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
