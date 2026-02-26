import { EVENTS_LIST_KEY, eventByIdKey } from '../cache/events-cache.keys.js';
import type { ICache } from '../cache/cache.interface.js';
import { EventStatus, type EventStatusValue } from '../enums/event-status.js';
import type { EventRequest, EventResponse } from '../dto/events.dto.js';
import type {
    EventSeatInfo,
    IEventsRepository,
} from '../interfaces/events.repository.interface.js';
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

const EVENTS_CACHE_TTL_SECONDS = Number(process.env.EVENTS_CACHE_TTL_SECONDS) || 60;

export function createEventsService(
    eventsRepository: IEventsRepository,
    cache?: ICache | null
): IEventsService {
    return {
        async findAllPublished(): Promise<EventResponse[]> {
            if (cache) {
                const cached = await cache.get<EventResponse[]>(EVENTS_LIST_KEY);
                if (cached != null) return cached;
            }
            const records = await eventsRepository.findAllPublished();
            const list = records.map(toEventResponse);
            if (cache) await cache.set(EVENTS_LIST_KEY, list, EVENTS_CACHE_TTL_SECONDS);
            return list;
        },
        async findById(id: string): Promise<EventResponse | null> {
            if (cache) {
                const cached = await cache.get<EventResponse>(eventByIdKey(id));
                if (cached != null) return cached;
            }
            const record = await eventsRepository.findById(id);
            if (!record) return null;
            const response = toEventResponse(record);
            if (cache) await cache.set(eventByIdKey(id), response, EVENTS_CACHE_TTL_SECONDS);
            return response;
        },
        async create(event: EventRequest): Promise<EventResponse> {
            const record = await eventsRepository.create(event);
            if (cache) await cache.del(EVENTS_LIST_KEY);
            return toEventResponse(record);
        },
        async getSeatsForEvent(eventId: string): Promise<EventSeatInfo[]> {
            return eventsRepository.findSeatsByEventId(eventId);
        },
    };
}
