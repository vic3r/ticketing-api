import type { EventRequest, EventResponse } from '../dto/events.dto.js';

export interface IEventsService {
    findAllPublished(): Promise<EventResponse[]>;
    findById(id: string): Promise<EventResponse>;
    create(event: EventRequest): Promise<EventResponse>;
}
