/* global indexedDB, crypto */
const DB_NAME = 'notes_db_v1'
const STORE = 'notes'

// Small helper to open IndexedDB
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('title', 'title', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// PUBLIC_INTERFACE
export class IndexedDbNotes {
  /** IndexedDB implementation for CRUD operations on notes. */
  constructor() {
    this.db = null
  }

  // PUBLIC_INTERFACE
  async init() {
    /** Initialize DB connection. */
    this.db = await openDb()
  }

  // PUBLIC_INTERFACE
  async list(query = '') {
    /** List notes filtered by query string across title/content. */
    const tx = this.db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)

    const items = await new Promise((resolve, reject) => {
      const result = []
      const cursorReq = store.index('updatedAt').openCursor(null, 'prev') // newest first
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result
        if (cursor) {
          result.push(cursor.value)
          cursor.continue()
        } else {
          resolve(result)
        }
      }
      cursorReq.onerror = () => reject(cursorReq.error)
    })

    if (!query) return items
    const q = query.toLowerCase()
    return items.filter(
      (n) =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q))
    )
  }

  // PUBLIC_INTERFACE
  async get(id) {
    /** Get note by id. */
    const tx = this.db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    return promisify(store.get(id))
  }

  // PUBLIC_INTERFACE
  async create(note) {
    /** Create a note with generated id if not provided. */
    const id = note.id || crypto.randomUUID()
    const toSave = { ...note, id }
    const tx = this.db.transaction(STORE, 'readwrite')
    await promisify(tx.objectStore(STORE).add(toSave))
    return toSave
  }

  // PUBLIC_INTERFACE
  async put(note) {
    /** Upsert whole note. */
    const tx = this.db.transaction(STORE, 'readwrite')
    await promisify(tx.objectStore(STORE).put(note))
    return note
  }

  // PUBLIC_INTERFACE
  async update(id, patch) {
    /** Update with patch. */
    const existing = await this.get(id)
    const updated = { ...existing, ...patch, id }
    const tx = this.db.transaction(STORE, 'readwrite')
    await promisify(tx.objectStore(STORE).put(updated))
    return updated
  }

  // PUBLIC_INTERFACE
  async remove(id) {
    /** Remove note. */
    const tx = this.db.transaction(STORE, 'readwrite')
    await promisify(tx.objectStore(STORE).delete(id))
  }
}
