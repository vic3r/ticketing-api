/**
 * Seed seats for a venue. Run after migrate and seed:venue (or use existing venue).
 * Set SEED_VENUE_ID (required). Optionally SEED_TIER_ID for ticket tier.
 *
 * After creating an event at this venue, event_seats are auto-populated from these seats.
 */
import 'dotenv/config';
import { db } from '../src/db/index.js';
import { seats } from '../src/db/schema.js';

const venueId = process.env.SEED_VENUE_ID ?? null;
const tierId = process.env.SEED_TIER_ID ?? null;

async function run() {
    if (!venueId) {
        console.error('Set SEED_VENUE_ID (e.g. from npm run seed:venue output)');
        process.exit(1);
    }

    const inserted = await db
        .insert(seats)
        .values([
            { venueId, ticketTierId: tierId, section: 'A', row: '1', seatNumber: 1 },
            { venueId, ticketTierId: tierId, section: 'A', row: '1', seatNumber: 2 },
            { venueId, ticketTierId: tierId, section: 'A', row: '1', seatNumber: 3 },
        ])
        .returning({ id: seats.id });

    const ids = inserted.map((r) => r.id);
    console.log('Seats created for venue. Create an event with this venueId; then reserve with eventId + these seat IDs:');
    console.log('Seat IDs:', JSON.stringify(ids));
    console.log('\nExample (after creating event with this venue and getting EVENT_ID):');
    console.log(`curl -s -X POST http://localhost:3001/reservations \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "Authorization: Bearer $TOKEN" \\`);
    console.log(`  -d '{"eventId":"<EVENT_ID>","seatIds":${JSON.stringify(ids)}}' | jq`);
}

run().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
