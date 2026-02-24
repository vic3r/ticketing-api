export interface OrderRequest {
    userId: string;
    eventId: string;
    seatIds: string[];
    tierId: string;
    email: string;
}

export interface CreateOrderResponse {
    orderId: string;
    clientSecret: string | null;
}

/** Response body for POST /orders/checkout */
export type CheckoutOrderResponse = CreateOrderResponse;