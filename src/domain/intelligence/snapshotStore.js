const STORAGE_KEY = 'intelligenceSnapshots:v1';

const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

function readState(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
    if (parsed?.version !== 1 || typeof parsed.snapshots !== 'object' || !parsed.snapshots) {
      return { version: 1, snapshots: {} };
    }
    return parsed;
  } catch {
    return { version: 1, snapshots: {} };
  }
}

function writeState(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

export function createSnapshotStore(storage = globalThis.localStorage) {
  if (!storage?.getItem || !storage?.setItem) throw new Error('Snapshot storage adapter is required');

  return {
    create(snapshot) {
      if (!snapshot?.date) throw new Error('Snapshot date is required');
      const state = readState(storage);
      if (state.snapshots[snapshot.date]) return clone(state.snapshots[snapshot.date]);
      const record = {
        ...clone(snapshot),
        version: Number(snapshot.version || 1),
        createdAt: snapshot.createdAt || new Date().toISOString(),
        updates: [],
      };
      state.snapshots[snapshot.date] = record;
      writeState(storage, state);
      return clone(record);
    },

    get(date) {
      return clone(readState(storage).snapshots[date] || null);
    },

    list() {
      return Object.values(readState(storage).snapshots)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .map(clone);
    },

    appendUpdate(date, update) {
      if (!update || typeof update !== 'object') throw new Error('Snapshot update is required');
      const state = readState(storage);
      const current = state.snapshots[date];
      if (!current) throw new Error(`Snapshot not found for ${date}`);
      current.updates = [...(current.updates || []), clone(update)];
      writeState(storage, state);
      return clone(current);
    },

    setValidatedAi(date, enrichment) {
      const state = readState(storage);
      const current = state.snapshots[date];
      if (!current) throw new Error(`Snapshot not found for ${date}`);
      if (current.ai) return clone(current);
      current.ai = clone(enrichment);
      writeState(storage, state);
      return clone(current);
    },
  };
}
