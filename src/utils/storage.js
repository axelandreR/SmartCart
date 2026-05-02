/** Typed localStorage helpers with JSON serialization */

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? JSON.parse(raw) : fallback
    } catch {
      return fallback
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.warn('[storage] Failed to save:', key, e)
    }
  },

  remove(key) {
    localStorage.removeItem(key)
  },

  clear() {
    localStorage.clear()
  },
}

/** IndexedDB-backed offline queue for pending writes */
export const offlineQueue = {
  key: 'smartcart_offline_queue',

  push(operation) {
    const queue = storage.get(this.key, [])
    queue.push({ ...operation, queuedAt: new Date().toISOString() })
    storage.set(this.key, queue)
  },

  pop() {
    const queue = storage.get(this.key, [])
    if (queue.length === 0) return null
    const item = queue.shift()
    storage.set(this.key, queue)
    return item
  },

  getAll() {
    return storage.get(this.key, [])
  },

  clear() {
    storage.remove(this.key)
  },

  size() {
    return storage.get(this.key, []).length
  },
}
