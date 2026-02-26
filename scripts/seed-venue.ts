/// <reference types="node" />
/**
 * Seed a venue (and optionally an organizer). Run after migrate: npm run seed:venue
 * Set SEED_ORGANIZER_ID if you have one; otherwise organizer_id will be null.
 */
import 'dotenv/config';
import { db } from '../src/db/index.js';
import { venues } from '../src/db/schema.js';

async function run() {
    const organizerId = process.env.SEED_ORGANIZER_ID ?? null;
    const [venue] = await db
        .insert(venues)
        .values({
            organizerId,
            name: 'Main Hall',
            address: '123 Main St',
            city: 'City',
            state: 'State',
            zip: '12345',
            country: 'Country',
            description: 'Seed venue for testing',
        })
        .returning({ id: venues.id });

    if (!venue) throw new Error('Failed to create venue');
    console.log('Venue created. Set SEED_VENUE_ID for seed:seats:');
    console.log(`export SEED_VENUE_ID=${venue.id}`);
}

run().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
