import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { db } from '../db/index.js';
import { eventSeats, orders, seats, ticketTiers, tickets } from '../db/schema.js';
import { and, eq, inArray } from 'drizzle-orm';
import { OrderStatus } from '../enums/order-status.js';
import { SeatStatus } from '../enums/seat-status.js';
import { StripeWebhookEventType } from '../enums/stripe-webhook-event.js';
import {
    InvalidWebhookSignatureError,
    OrderCreationFailedError,
    SeatsNotFoundError,
} from '../errors/orders.errors.js';
import type {
    CreateOrderResponse,
    OrderRequest,
    WebhookHandledResponse,
} from '../dto/orders.dto.js';
import type {
    IOrdersRepository,
    PaymentSucceededPayload,
} from '../interfaces/orders.repository.interface.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
    apiVersion: '2026-01-28.clover',
});

const CURRENCY = 'mxn';

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
        (acc, seat) => acc + (seat.ticketTierId ? (priceByTierId[seat.ticketTierId] ?? 0) : 0),
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
    status: OrderStatus;
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
        .set({ status: OrderStatus.Paid })
        .where(eq(orders.stripePaymentIntentId, paymentIntentId));
}

async function findOrderByPaymentIntentId(paymentIntentId: string) {
    return db.query.orders.findFirst({
        where: eq(orders.stripePaymentIntentId, paymentIntentId),
    });
}

// --- Single-responsibility: event_seats (availability + webhook) ---

async function ensureSeatsAvailableForEvent(eventId: string, seatIds: string[]): Promise<void> {
    const rows = await db
        .select({ seatId: eventSeats.seatId })
        .from(eventSeats)
        .where(and(eq(eventSeats.eventId, eventId), inArray(eventSeats.seatId, seatIds)));
    const foundIds = new Set(rows.map((r) => r.seatId));
    const missing = seatIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) throw new SeatsNotFoundError();
    // Optionally check status is not 'sold' - allow reserved/available for checkout
    const sold = await db
        .select()
        .from(eventSeats)
        .where(
            and(
                eq(eventSeats.eventId, eventId),
                inArray(eventSeats.seatId, seatIds),
                eq(eventSeats.status, SeatStatus.Sold)
            )
        );
    if (sold.length > 0) throw new SeatsNotFoundError();
}

async function markEventSeatsSold(eventId: string, seatIds: string[]) {
    await db
        .update(eventSeats)
        .set({ status: SeatStatus.Sold, reservedUntil: null })
        .where(and(eq(eventSeats.eventId, eventId), inArray(eventSeats.seatId, seatIds)));
}

// --- Single-responsibility: ticket insert ---

function generateTicketQrPayload(payload: {
    ticketId: string;
    userId: string;
    eventId: string;
    seatId: string;
}) {
    return jwt.sign(payload, process.env.JWT_SECRET ?? '', { expiresIn: '30d' });
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

function constructStripeWebhookEvent(
    payload: string | Buffer,
    signature: string,
    secret: string
): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, secret);
}

// --- Process payment (used synchronously or by Kafka consumer) ---

async function doProcessPaymentSucceeded(payload: PaymentSucceededPayload): Promise<void> {
    const { paymentIntentId, eventId, seatIds } = payload;
    await markOrderPaidByPaymentIntentId(paymentIntentId);
    await markEventSeatsSold(eventId, seatIds);

    const order = await findOrderByPaymentIntentId(paymentIntentId);
    if (!order) return;

    const seatsForTickets = await findSeatsByIds(seatIds);
    for (const seat of seatsForTickets) {
        if (!seat.ticketTierId) continue;
        const qrPayload = generateTicketQrPayload({
            ticketId: crypto.randomUUID(),
            userId: payload.userId,
            eventId,
            seatId: seat.id,
        });
        await insertTicket({
            orderId: order.id,
            userId: payload.userId,
            eventId,
            seatId: seat.id,
            ticketTierId: seat.ticketTierId,
            qrPayload,
        });
    }
}

// --- Repository implementation ---

export type PaymentProducer = (payload: PaymentSucceededPayload) => Promise<void>;

export const createOrdersRepository = (options?: {
    paymentProducer?: PaymentProducer | null;
}): IOrdersRepository => {
    const paymentProducer = options?.paymentProducer ?? null;

    return {
        async create(input: OrderRequest): Promise<CreateOrderResponse> {
            const { eventId, userId, seatIds, email } = input;

            await ensureSeatsAvailableForEvent(eventId, seatIds);
            const selectedSeats = await findSeatsByIds(seatIds);
            if (selectedSeats.length !== seatIds.length) {
                throw new SeatsNotFoundError();
            }

            const tierIds = [
                ...new Set(selectedSeats.map((s) => s.ticketTierId).filter(Boolean)),
            ] as string[];
            const tiers = await findTicketTiersByIds(tierIds);
            const totalAmount = computeTotalAmountFromSeatsAndTiers(selectedSeats, tiers);

            const paymentIntent = await createStripePaymentIntent({
                amountCents: Math.round(totalAmount * 100),
                currency: CURRENCY,
                receiptEmail: email,
                metadata: { eventId, userId, seatIds: seatIds.join(',') },
            });

            const insertedOrder = await insertOrder({
                userId,
                eventId,
                totalAmount: totalAmount.toFixed(2),
                status: OrderStatus.Pending,
                stripePaymentIntentId: paymentIntent.id,
            });

            return {
                orderId: insertedOrder.id,
                clientSecret: paymentIntent.client_secret,
            };
        },

        async handleWebhook(payload: {
            body: string | Buffer;
            signature: string;
        }): Promise<WebhookHandledResponse> {
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

            if (event.type !== StripeWebhookEventType.PaymentIntentSucceeded) {
                return { received: true };
            }

            const intent = event.data.object as Stripe.PaymentIntent;
            const { userId, eventId, seatIds: seatIdsRaw } = intent.metadata;
            const seatIds = seatIdsRaw?.split(',').filter(Boolean) ?? [];
            if (!userId || !eventId) {
                return { received: true };
            }

            const paymentPayload: PaymentSucceededPayload = {
                paymentIntentId: intent.id,
                userId: String(userId),
                eventId: String(eventId),
                seatIds,
            };

            if (paymentProducer) {
                await paymentProducer(paymentPayload);
                return { received: true };
            }

            await doProcessPaymentSucceeded(paymentPayload);
            return { received: true };
        },

        async processPaymentSucceeded(payload: PaymentSucceededPayload): Promise<void> {
            await doProcessPaymentSucceeded(payload);
        },
    };
};
