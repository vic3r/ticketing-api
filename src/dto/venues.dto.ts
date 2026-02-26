/**
 * API request/response shapes for venues.
 */
export interface VenueResponse {
    id: string;
    organizerId: string | null;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface VenueRequest {
    organizerId?: string | null;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    description?: string | null;
}
