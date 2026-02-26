/**
 * Seed a few available seats for testing reservations.
 * Run after migrate: npm run seed:seats
 *
 * If you have an event and ticket tier, set env SEED_EVENT_ID and optionally
 * SEED_TIER_ID. Otherwise seats are created with null event/tier (valid for testing lock).
 */
import 'dotenv/config';
import { db } from '../src/db/index.js';
import { seats } from '../src/db/schema.js';
const eventId = process.env.SEED_EVENT_ID ?? null;
const tierId = process.env.SEED_TIER_ID ?? null;

async function run() {
    const inserted = await db
        .insert(seats)
        .values([
            { eventId, ticketTierId: tierId, section: 'A', row: '1', seatNumber: 1, status: 'available' },
            { eventId, ticketTierId: tierId, section: 'A', row: '1', seatNumber: 2, status: 'available' },
            { eventId, ticketTierId: tierId, section: 'A', row: '1', seatNumber: 3, status: 'available' },
        ])
        .returning({ id: seats.id });

    const ids = inserted.map((r) => r.id);
    console.log('Seats created (use these IDs in POST /reservations):');
    console.log(JSON.stringify(ids));
    console.log('\nExample:');
    console.log(`curl -s -X POST http://localhost:3001/reservations \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "Authorization: Bearer $TOKEN" \\`);
    console.log(`  -d '{"seatIds":${JSON.stringify(ids)}}' | jq`);
}

run().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
