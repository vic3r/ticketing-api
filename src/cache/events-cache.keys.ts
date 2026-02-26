export const EVENTS_LIST_KEY = 'events:list:published';

export function eventByIdKey(id: string): string {
    return `events:id:${id}`;
}
