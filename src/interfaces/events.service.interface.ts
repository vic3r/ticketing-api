import type { EventResponse } from '../dto/events.dto.js';

export interface IEventsService {
    findAllPublished(): Promise<EventResponse[]>;
}
