import type { VenueRequest, VenueResponse } from '../dto/venues.dto.js';

export interface IVenuesService {
    create(input: VenueRequest): Promise<VenueResponse>;
}
