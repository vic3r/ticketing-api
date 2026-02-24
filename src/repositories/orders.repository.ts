import { sign } from 'jsonwebtoken';
import Stripe from 'stripe';
import { db } from '../db/index.js';
import { orders, seats, ticketTiers, tickets } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { InvalidWebhookSignatureError, OrderCreationFailedError, SeatsNotFoundError } from '../errors/orders.errors.js';
import type { CreateOrderResponse, OrderRequest, WebhookHandledResponse } from '../dto/orders.dto.js';
import type { IOrdersRepository } from '../interfaces/orders.repository.interface.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
    apiVersion: '2026-01-28.clover',
});

// --- Single-responsibility: seat queries ---

async function findSeatsByIds(seatIds: string[]) {
    return db.query.seats.findMany({
        where: inArray(seats.id, seatIds),
    });
}

// --- Single-responsibility: tier queries ---

async function findTicketTiersByIds(tierIds: string[]) {
    return db.query.ticketTiers.findMany({
        where: inArray(ticketTiers.id, tierIds),
    });
}

// --- Single-responsibility: price calculation (pure) ---

function computeTotalAmountFromSeatsAndTiers(
    selectedSeats: Awaited<ReturnType<typeof findSeatsByIds>>,
    tiers: Awaited<ReturnType<typeof findTicketTiersByIds>>
): number {
    const priceByTierId = Object.fromEntries(tiers.map((t) => [t.id, parseFloat(t.price)]));
    return selectedSeats.reduce(
        (acc, seat) => acc + (seat.ticketTierId ? priceByTierId[seat.ticketTierId] ?? 0 : 0),
        0
    );
}

// --- Single-responsibility: Stripe ---

async function createStripePaymentIntent(params: {
    amountCents: number;
    currency: string;
    receiptEmail: string;
    metadata: { eventId: string; userId: string; seatIds: string };
}) {
    return stripe.paymentIntents.create({
        amount: params.amountCents,
        currency: params.currency,
        receipt_email: params.receiptEmail,
        automatic_payment_methods: { enabled: true },
        metadata: params.metadata,
    });
}

// --- Single-responsibility: order insert ---

async function insertOrder(values: {
    userId: string;
    eventId: string;
    totalAmount: string;
    status: 'pending';
    stripePaymentIntentId: string;
}) {
    const [row] = await db.insert(orders).values(values).returning();
    if (!row) throw new OrderCreationFailedError();
    return row;
}

// --- Single-responsibility: order update (webhook) ---

async function markOrderPaidByPaymentIntentId(paymentIntentId: string) {
    await db
        .update(orders)
        .set({ status: 'paid' })
        .where(eq(orders.stripePaymentIntentId, paymentIntentId));
}

async function findOrderByPaymentIntentId(paymentIntentId: string) {
    return db.query.orders.findFirst({
        where: eq(orders.stripePaymentIntentId, paymentIntentId),
    });
}

// --- Single-responsibility: seat update (webhook) ---

async function markSeatsSoldByIds(seatIds: string[]) {
    await db.update(seats).set({ status: 'sold' }).where(inArray(seats.id, seatIds));
}

// --- Single-responsibility: ticket insert ---

function generateTicketQrPayload(payload: { ticketId: string; userId: string; eventId: string; seatId: string }) {
    return sign(payload, process.env.JWT_SECRET ?? '', { expiresIn: '30d' });
}

async function insertTicket(values: {
    orderId: string;
    userId: string;
    eventId: string;
    seatId: string;
    ticketTierId: string;
    qrPayload: string;
}) {
    await db.insert(tickets).values(values);
}

// --- Single-responsibility: webhook verification ---

function constructStripeWebhookEvent(payload: string | Buffer, signature: string, secret: string): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, secret);
}

// --- Repository implementation ---

export const createOrdersRepository = (): IOrdersRepository => {
    return {
        async create(input: OrderRequest): Promise<CreateOrderResponse> {
            const { eventId, userId, seatIds, email } = input;

            const selectedSeats = await findSeatsByIds(seatIds);
            if (selectedSeats.length !== seatIds.length) {
                throw new SeatsNotFoundError();
            }

            const tierIds = [...new Set(selectedSeats.map((s) => s.ticketTierId).filter(Boolean))] as string[];
            const tiers = await findTicketTiersByIds(tierIds);
            const totalAmount = computeTotalAmountFromSeatsAndTiers(selectedSeats, tiers);

            const paymentIntent = await createStripePaymentIntent({
                amountCents: Math.round(totalAmount * 100),
                currency: 'mxn',
                receiptEmail: email,
                metadata: { eventId, userId, seatIds: seatIds.join(',') },
            });

            const insertedOrder = await insertOrder({
                userId,
                eventId,
                totalAmount: totalAmount.toFixed(2),
                status: 'pending',
                stripePaymentIntentId: paymentIntent.id,
            });

            return {
                orderId: insertedOrder.id,
                clientSecret: paymentIntent.client_secret,
            };
        },

        async handleWebhook(payload: { body: string | Buffer; signature: string }): Promise<WebhookHandledResponse> {
            let event: Stripe.Event;
            try {
                event = constructStripeWebhookEvent(
                    payload.body,
                    payload.signature,
                    process.env.STRIPE_WEBHOOK_SECRET ?? ''
                );
            } catch {
                throw new InvalidWebhookSignatureError();
            }

            if (event.type !== 'payment_intent.succeeded') {
                return { received: true };
            }

            const intent = event.data.object as Stripe.PaymentIntent;
            const { userId, eventId, seatIds: seatIdsRaw } = intent.metadata;
            const seatIds = seatIdsRaw?.split(',').filter(Boolean) ?? [];
            if (!userId || !eventId) {
                return { received: true };
            }

            await markOrderPaidByPaymentIntentId(intent.id);
            await markSeatsSoldByIds(seatIds);

            const order = await findOrderByPaymentIntentId(intent.id);
            if (!order) {
                return { received: true };
            }

            const seatsForTickets = await findSeatsByIds(seatIds);
            for (const seat of seatsForTickets) {
                if (!seat.ticketTierId) continue;
                const qrPayload = generateTicketQrPayload({
                    ticketId: crypto.randomUUID(),
                    userId,
                    eventId,
                    seatId: seat.id,
                });
                await insertTicket({
                    orderId: order.id,
                    userId,
                    eventId,
                    seatId: seat.id,
                    ticketTierId: seat.ticketTierId,
                    qrPayload,
                });
            }

            return { received: true };
        },
    };
};
