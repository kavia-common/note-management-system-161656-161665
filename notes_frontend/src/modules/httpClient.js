/* global fetch, AbortController, setTimeout, clearTimeout */
const DEFAULT_TIMEOUT = 4000

// PUBLIC_INTERFACE
export class NotesHttpClient {
  /**
   * Simple HTTP client to communicate with optional backend.
   * Expects RESTful endpoints:
   *  - GET    /notes?search=
   *  - GET    /notes/:id
   *  - POST   /notes
   *  - PATCH  /notes/:id
   *  - DELETE /notes/:id
   */
  constructor(baseUrl, timeout = DEFAULT_TIMEOUT) {
    this.baseUrl = baseUrl?.replace(/\/$/, '')
    this.timeout = timeout
    if (!this.baseUrl) {
      throw new Error('NotesHttpClient requires baseUrl')
    }
  }

  async _fetch(path, options = {}) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), this.timeout)
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        ...options,
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`)
      }
      if (res.status === 204) return null
      return res.json()
    } finally {
      clearTimeout(t)
    }
  }

  // PUBLIC_INTERFACE
  async ping() {
    /** Quick health check via listing endpoint. */
    await this._fetch('/notes?limit=1', { method: 'GET' })
  }

  // PUBLIC_INTERFACE
  list(query = '') {
    const q = query ? `?search=${encodeURIComponent(query)}` : ''
    return this._fetch(`/notes${q}`, { method: 'GET' })
  }

  // PUBLIC_INTERFACE
  get(id) {
    return this._fetch(`/notes/${encodeURIComponent(id)}`, { method: 'GET' })
  }

  // PUBLIC_INTERFACE
  create(note) {
    return this._fetch(`/notes`, { method: 'POST', body: JSON.stringify(note) })
  }

  // PUBLIC_INTERFACE
  update(id, patch) {
    return this._fetch(`/notes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
  }

  // PUBLIC_INTERFACE
  remove(id) {
    return this._fetch(`/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }
}
