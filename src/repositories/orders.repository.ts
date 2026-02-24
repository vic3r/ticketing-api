import { db } from '../db/index.js';
import { orders, seats, ticketTiers } from '../db/schema.js';
import { inArray } from 'drizzle-orm';
import Stripe from 'stripe';
import type { CreateOrderResponse, OrderRequest } from '../dto/orders.dto.js';
import type { IOrdersRepository } from '../interfaces/orders.repository.interface.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
    apiVersion: '2026-01-28.clover',
});

export const createOrdersRepository = (): IOrdersRepository => {
    return {
        async create(input: OrderRequest): Promise<CreateOrderResponse> {
            const { eventId, userId, seatIds, email } = input;

            const selectedSeats = await db.query.seats.findMany({
                where: inArray(seats.id, seatIds),
            });

            if (selectedSeats.length !== seatIds.length) {
                throw new Error('One or more seats not found');
            }

            const tierIds = [...new Set(selectedSeats.map((s) => s.ticketTierId).filter(Boolean))] as string[];
            const tiers = await db.query.ticketTiers.findMany({
                where: inArray(ticketTiers.id, tierIds),
            });
            const priceByTierId = Object.fromEntries(tiers.map((t) => [t.id, parseFloat(t.price)]));
            const totalAmount = selectedSeats.reduce(
                (acc, seat) => acc + (seat.ticketTierId ? priceByTierId[seat.ticketTierId] ?? 0 : 0),
                0
            );

            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(totalAmount * 100),
                currency: 'mxn',
                receipt_email: email,
                automatic_payment_methods: { enabled: true },
                metadata: {
                    eventId,
                    userId,
                    seatIds: seatIds.join(','),
                },
            });

            const [insertedOrder] = await db
                .insert(orders)
                .values({
                    userId,
                    eventId,
                    totalAmount: totalAmount.toFixed(2),
                    status: 'pending',
                    stripePaymentIntentId: paymentIntent.id,
                })
                .returning();

            if (!insertedOrder) {
                throw new Error('Failed to create order');
            }

            return {
                orderId: insertedOrder.id,
                clientSecret: paymentIntent.client_secret,
            };
        },
    };
};
