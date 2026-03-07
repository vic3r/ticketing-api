import type { InferSelectModel } from 'drizzle-orm';
import type { venues } from '../db/schema.js';
import type { SeatInput, VenueRequest } from '../dto/venues.dto.js';

export type VenueRecord = InferSelectModel<typeof venues>;

export interface IVenuesRepository {
    create(input: VenueRequest): Promise<VenueRecord>;
    findAll(): Promise<VenueRecord[]>;
    findById(id: string): Promise<VenueRecord | null>;
    addSeats(venueId: string, seats: SeatInput[]): Promise<number>;
}
