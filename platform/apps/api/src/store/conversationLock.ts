/**
 * In-process per-key serialization. Turns for the same conversation run one-at-a-time,
 * so two near-simultaneous inbound messages can't double-run the agent or double-reply.
 * This orders work within a single api process; cross-instance correctness for the things
 * that matter (no double-booking, idempotent webhooks) is enforced by DB constraints, not
 * this lock — so it's safe and cheap, and avoids holding a DB transaction across LLM calls.
 */
export function createConversationLock() {
  const tails = new Map<string, Promise<unknown>>();

  return function withConversationLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = tails.get(key) ?? Promise.resolve();
    const result = prev.then(() => fn());
    // The stored tail never rejects (so one failure doesn't poison the chain) and
    // self-cleans the map entry when it's the last in line.
    const tail: Promise<unknown> = result.catch(() => undefined).finally(() => {
      if (tails.get(key) === tail) tails.delete(key);
    });
    tails.set(key, tail);
    return result;
  };
}
