import type { InferSelectModel } from 'drizzle-orm';
import type { venues } from '../db/schema.js';
import type { VenueRequest } from '../dto/venues.dto.js';

export type VenueRecord = InferSelectModel<typeof venues>;

export interface IVenuesRepository {
    create(input: VenueRequest): Promise<VenueRecord>;
}
