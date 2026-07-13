/**
 * Mock-mode overlay store (00 §5: mock mutations mutate nothing durable).
 * Module-scoped maps survive client-side navigation, so a status flipped on
 * an index still reads flipped on the detail — without pretending to persist.
 * Also supports locally-created drafts (new quotes/invoices in the demo).
 */
export function makePatchStore<T extends { id: string }>() {
  const patches = new Map<string, Partial<T>>();
  const created: T[] = [];

  return {
    patch(id: string, patch: Partial<T>) {
      patches.set(id, { ...patches.get(id), ...patch });
    },
    apply(item: T): T {
      const p = patches.get(item.id);
      return p ? { ...item, ...p } : item;
    },
    add(item: T) {
      created.push(item);
    },
    withCreated(items: T[]): T[] {
      return [...created, ...items];
    },
  };
}
