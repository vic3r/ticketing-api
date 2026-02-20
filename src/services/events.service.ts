import { EventStatus } from '../enums/event-status.js';
import type { EventResponse } from '../dto/events.dto.js';
import type { IEventsRepository } from '../interfaces/events.repository.interface.js';
import type { IEventsService } from '../interfaces/events.service.interface.js';

function toEventResponse(record: {
    id: string;
    organizerId: string | null;
    venueId: string | null;
    name: string;
    description: string | null;
    imageUrl: string | null;
    startDate: Date;
    endDate: Date;
    status: 'draft' | 'published' | 'cancelled';
    isPublished: boolean | null;
    createdAt: Date;
    updatedAt: Date;
}): EventResponse {
    return {
        id: record.id,
        organizerId: record.organizerId ?? '',
        venueId: record.venueId ?? '',
        name: record.name,
        description: record.description,
        imageUrl: record.imageUrl,
        startDate: record.startDate,
        endDate: record.endDate,
        status: record.status as EventStatus,
        isPublished: record.isPublished,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
    };
}

export function createEventsService(eventsRepository: IEventsRepository): IEventsService {
    return {
        async findAllPublished(): Promise<EventResponse[]> {
            const records = await eventsRepository.findAllPublished();
            return records.map(toEventResponse);
        },
    };
}
