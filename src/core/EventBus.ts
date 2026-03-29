import type { EventKey, EventPayloadMap } from './Events';


type Handler<K extends EventKey> = (payload: EventPayloadMap[K]) => void;

class EventBus {
  private readonly listeners = new Map<EventKey, Set<Handler<never>>>();

  on<K extends EventKey>(event: K, handler: Handler<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as Handler<never>);

    return () => {
      this.listeners.get(event)?.delete(handler as Handler<never>);
    };
  }

  emit<K extends EventKey>(event: K, payload: EventPayloadMap[K]): void {
    this.listeners.get(event)?.forEach(h => (h as Handler<K>)(payload));
  }

  off(event: EventKey): void {
    this.listeners.delete(event);
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const bus = new EventBus();