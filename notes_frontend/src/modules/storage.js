//
// PUBLIC_INTERFACE
export class NotesRepository {
  /**
   * A repository that persists notes using IndexedDB by default, with optional HTTP backend passthrough.
   * Backend mode is automatically enabled if NOTES_API_BASE is set and reachable.
   */
  constructor({ db, httpClient }) {
    this.db = db
    this.http = httpClient
    this.useHttp = false
  }

  // PUBLIC_INTERFACE
  async init() {
    // Try to detect backend availability if http client exists
    if (this.http) {
      try {
        await this.http.ping()
        this.useHttp = true
      } catch {
        this.useHttp = false
      }
    }
    // Always init local db as fallback
    await this.db.init()
  }

  // PUBLIC_INTERFACE
  async list(query = '') {
    /** List notes, filtered by query on title/content. */
    if (this.useHttp) {
      try {
        return await this.http.list(query)
      } catch {
        // fallback to local
      }
    }
    return this.db.list(query)
  }

  // PUBLIC_INTERFACE
  async get(id) {
    /** Get a single note by id. */
    if (this.useHttp) {
      try {
        return await this.http.get(id)
      } catch {
        // fallback
      }
    }
    return this.db.get(id)
  }

  // PUBLIC_INTERFACE
  async create(note) {
    /** Create a note. Returns created note with id. */
    const withTimestamps = {
      ...note,
      createdAt: note.createdAt || Date.now(),
      updatedAt: Date.now(),
    }
    if (this.useHttp) {
      try {
        const created = await this.http.create(withTimestamps)
        // store offline copy as cache
        await this.db.put(created)
        return created
      } catch {
        // fallback
      }
    }
    const created = await this.db.create(withTimestamps)
    return created
  }

  // PUBLIC_INTERFACE
  async update(id, patch) {
    /** Update a note by id with patch object. */
    patch.updatedAt = Date.now()
    if (this.useHttp) {
      try {
        const updated = await this.http.update(id, patch)
        await this.db.put(updated)
        return updated
      } catch {
        // fallback
      }
    }
    const updated = await this.db.update(id, patch)
    return updated
  }

  // PUBLIC_INTERFACE
  async remove(id) {
    /** Delete a note by id. */
    if (this.useHttp) {
      try {
        await this.http.remove(id)
        await this.db.remove(id)
        return
      } catch {
        // fallback
      }
    }
    await this.db.remove(id)
  }
}
