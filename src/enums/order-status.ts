/** Matches order_status in schema (pending, paid, cancelled, refunded). */
export enum OrderStatus {
    Pending = 'pending',
    Paid = 'paid',
    Cancelled = 'cancelled',
    Refunded = 'refunded',
}

/** DB returns this; use for repository/input types. */
export type OrderStatusValue = `${OrderStatus}`;
