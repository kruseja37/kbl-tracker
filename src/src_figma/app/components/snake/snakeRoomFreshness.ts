import { startCompanionFreshness } from './companion/companionFreshness';

export const SNAKE_ROOM_FRESHNESS_MS = 5_000;

export function startSnakeRoomFreshness(input: {
  pullAndRefresh: () => void | Promise<void>;
  intervalMs?: number;
  windowObject?: Pick<Window, 'setInterval' | 'clearInterval'>;
  documentObject?: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'>;
}): () => void {
  return startCompanionFreshness({
    ...input,
    intervalMs: input.intervalMs ?? SNAKE_ROOM_FRESHNESS_MS,
  });
}

export async function pullSnakeRoomTruth<T>(input: {
  pull: () => Promise<void>;
  read: () => Promise<T>;
}): Promise<T> {
  await input.pull();
  return input.read();
}
