import type { EventRequest, EventResponse } from '../dto/events.dto.js';
import type { EventSeatInfo } from '../interfaces/events.repository.interface.js';

export interface IEventsService {
    findAllPublished(): Promise<EventResponse[]>;
    findById(id: string): Promise<EventResponse | null>;
    create(event: EventRequest): Promise<EventResponse>;
    getSeatsForEvent(eventId: string): Promise<EventSeatInfo[]>;
}
