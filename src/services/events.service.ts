import { EventStatus, type EventStatusValue } from '../enums/event-status.js';
import type { EventRequest, EventResponse } from '../dto/events.dto.js';
import type { IEventsRepository } from '../interfaces/events.repository.interface.js';
import type { IEventsService } from '../interfaces/events.service.interface.js';

function toDate(v: Date | string): Date {
    return v instanceof Date ? v : new Date(v);
}

function toEventResponse(record: {
    id: string;
    organizerId: string | null;
    venueId: string | null;
    name: string;
    description: string | null;
    imageUrl: string | null;
    startDate: Date | string;
    endDate: Date | string;
    status: EventStatusValue;
    isPublished: boolean | null;
    createdAt: Date | string;
    updatedAt: Date | string;
}): EventResponse {
    return {
        id: record.id,
        organizerId: record.organizerId ?? '',
        venueId: record.venueId ?? '',
        name: record.name,
        description: record.description,
        imageUrl: record.imageUrl,
        startDate: toDate(record.startDate),
        endDate: toDate(record.endDate),
        status: record.status as EventStatus,
        isPublished: record.isPublished,
        createdAt: toDate(record.createdAt),
        updatedAt: toDate(record.updatedAt),
    };
}

export function createEventsService(eventsRepository: IEventsRepository): IEventsService {
    return {
        async findAllPublished(): Promise<EventResponse[]> {
            const records = await eventsRepository.findAllPublished();
            return records.map(toEventResponse);
        },
        async findById(id: string): Promise<EventResponse | null> {
            const record = await eventsRepository.findById(id);
            if (!record) return null;
            return toEventResponse(record);
        },
        async create(event: EventRequest): Promise<EventResponse> {
            const record = await eventsRepository.create(event);
            return toEventResponse(record);
        },
    };
}
