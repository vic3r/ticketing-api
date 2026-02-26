import { pgTable, uuid, text, integer, timestamp, boolean, numeric, pgEnum } from 'drizzle-orm/pg-core';

export const seatsStatusEnum = pgEnum('seats_status', ['available', 'sold', 'reserved']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'cancelled', 'refunded']);
export const ticketTierEnum = pgEnum('ticket_tier', ['standard', 'premium', 'vip', 'early_access']);
export const eventStatusEnum = pgEnum('event_status', ['draft', 'published', 'cancelled']);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

export const organizers = pgTable('organizers', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    slug: text('slug').notNull().unique(),
    stripeAccountId: text('stripe_account_id').notNull().unique(),
    logoUrl: text('logo_url').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const venues = pgTable('venues', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizerId: uuid('organizer_id').references(() => organizers.id),
    name: text('name').notNull(),
    address: text('address').notNull(),
    city: text('city').notNull(),
    state: text('state').notNull(),
    zip: text('zip').notNull(),
    country: text('country').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const events = pgTable('events', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizerId: uuid('organizer_id').references(() => organizers.id),
    venueId: uuid('venue_id').references(() => venues.id),
    name: text('name').notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    status: eventStatusEnum('status').notNull().default('draft'),
    isPublished: boolean('is_published').default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const ticketTiers = pgTable('ticket_tiers', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').references(() => events.id),
    name: text('name').notNull(),
    tier: ticketTierEnum('tier').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    totalQuantity: integer('total_quantity').notNull(),
    availableQuantity: integer('available_quantity').notNull().default(0),
    salesStart: timestamp('sales_start').notNull(),
    salesEnd: timestamp('sales_end').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/** Physical seats at a venue (layout only). Same seats reused for every event at that venue. */
export const seats = pgTable('seats', {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: uuid('venue_id').references(() => venues.id).notNull(),
    ticketTierId: uuid('ticket_tier_id').references(() => ticketTiers.id),
    section: text('section').notNull(),
    row: text('row'),
    seatNumber: integer('seat_number'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/** Per-event availability for venue seats. One row per (event, seat) with status. */
export const eventSeats = pgTable(
    'event_seats',
    {
        eventId: uuid('event_id').references(() => events.id).notNull(),
        seatId: uuid('seat_id').references(() => seats.id).notNull(),
        status: seatsStatusEnum('status').notNull().default('available'),
        reservedUntil: timestamp('reserved_until'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [{ primaryKey: { columns: [t.eventId, t.seatId] } }]
);

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull().default('user'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const orders = pgTable('orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    eventId: uuid('event_id').references(() => events.id),
    totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
    status: orderStatusEnum('status').notNull().default('pending'),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tickets = pgTable('tickets', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').references(() => orders.id),
    userId: uuid('user_id').references(() => users.id),
    eventId: uuid('event_id').references(() => events.id),
    seatId: uuid('seat_id').references(() => seats.id),
    ticketTierId: uuid('ticket_tier_id').references(() => ticketTiers.id),
    qrPayload: text('qr_payload').notNull(),
    isCheckedIn: boolean('is_checked_in').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});