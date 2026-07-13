/**
 * Mock-mode status overlay (00 §5: mock mutations mutate nothing durable).
 * One id-keyed patch map — posts and social posts alike — that survives
 * client-side navigation, so approving on the feed still reads approved on
 * the preview, without pretending to persist.
 */

const patches = new Map<string, Record<string, unknown>>();

export function patchContent(id: string, patch: Record<string, unknown>) {
  patches.set(id, { ...patches.get(id), ...patch });
}

export function withContentPatch<T extends { id: string }>(item: T): T {
  const patch = patches.get(item.id);
  return patch ? { ...item, ...patch } : item;
}
