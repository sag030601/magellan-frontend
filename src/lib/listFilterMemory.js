/**
 * In-memory list/filter state that survives SPA navigation (e.g. candidates →
 * profile → back) but is wiped on a full page refresh (module re-init).
 *
 * Do NOT use sessionStorage/localStorage here — those survive refresh.
 */

const store = new Map();

export function readListFilterMemory(key) {
  return store.has(key) ? store.get(key) : null;
}

export function writeListFilterMemory(key, value) {
  store.set(key, value);
}

export function clearListFilterMemory(key) {
  store.delete(key);
}
