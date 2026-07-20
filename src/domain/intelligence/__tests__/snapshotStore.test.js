import { expect, it } from 'vitest';
import { createMemoryStorage, createSnapshotStore } from '../snapshotStore.js';

it('does not overwrite an existing daily base snapshot', () => {
  const store = createSnapshotStore(createMemoryStorage());
  store.create({ date: '2026-07-14', profileVersion: 1, items: ['a'] });
  store.create({ date: '2026-07-14', profileVersion: 2, items: ['b'] });
  expect(store.get('2026-07-14').items).toEqual(['a']);
});

it('appends updates without mutating base items', () => {
  const store = createSnapshotStore(createMemoryStorage());
  store.create({ date: '2026-07-14', profileVersion: 1, items: ['a'] });
  store.appendUpdate('2026-07-14', { id: 'event-2', at: 2 });
  const result = store.get('2026-07-14');
  expect(result.updates).toEqual([{ id: 'event-2', at: 2 }]);
  expect(result.items).toEqual(['a']);
});
