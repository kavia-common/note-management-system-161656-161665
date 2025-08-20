/* global console */
import { NotesRepository } from './storage.js'
import { IndexedDbNotes } from './indexedDb.js'
import { NotesHttpClient } from './httpClient.js'
import { h, fmtDate } from './components.js'

// PUBLIC_INTERFACE
export class NotesApp {
  /** Main App orchestrator responsible for rendering and wiring events. */
  constructor(root) {
    this.root = root
    this.repo = null
    this.state = {
      query: '',
      notes: [],
      activeId: null,
      isBackend: false,
      saving: false,
    }
    this.ui = {}
  }

  // PUBLIC_INTERFACE
  async init() {
    /** Initialize storage and render UI. */
    const httpBase = getEnv('NOTES_API_BASE')
    let httpClient = null
    if (httpBase) {
      try {
        httpClient = new NotesHttpClient(httpBase)
      } catch {
        httpClient = null
      }
    }
    const db = new IndexedDbNotes()
    this.repo = new NotesRepository({ db, httpClient })
    await this.repo.init()
    this.state.isBackend = this.repo.useHttp

    this.root.innerHTML = ''
    this.renderShell()
    await this.refreshList()
    if (this.state.notes.length) {
      this.selectNote(this.state.notes[0].id)
    } else {
      this.newNote()
    }
  }

  renderShell() {
    const header = this.renderHeader()
    const sidebar = this.renderSidebar()
    const main = this.renderMain()

    const appEl = h(
      'div',
      { class: 'app' },
      sidebar,
      header,
      main,
    )

    this.root.appendChild(appEl)
  }

  renderHeader() {
    const search = h('input', {
      class: 'search header__search',
      type: 'search',
      placeholder: 'Search notes...',
      value: this.state.query || '',
      oninput: (e) => this.onSearch(e.target.value),
    })
    const info = h(
      'div',
      { class: 'badge' },
      this.state.isBackend ? 'Connected to server' : 'Offline mode'
    )
    const header = h(
      'div',
      { class: 'app__header' },
      search,
      info
    )
    this.ui.search = search
    this.ui.header = header
    return header
  }

  renderSidebar() {
    const brand = h(
      'div',
      { class: 'brand' },
      h('div', { class: 'brand__dot' }),
      h('div', { class: 'brand__title' }, 'Notes')
    )

    const newBtn = h(
      'button',
      { class: 'button button--primary', onclick: () => this.newNote() },
      'New'
    )

    const delBtn = h(
      'button',
      {
        class: 'button button--danger',
        onclick: () => this.deleteCurrent(),
      },
      'Delete'
    )

    const controls = h('div', { class: 'sidebar__controls' }, newBtn, delBtn)

    const search = h('input', {
      class: 'search',
      type: 'search',
      placeholder: 'Filter notes...',
      value: this.state.query || '',
      oninput: (e) => this.onSearch(e.target.value),
    })
    const searchWrap = h('div', { class: 'sidebar__search' }, search)

    const list = h('ul', { class: 'note-list', role: 'listbox' })
    this.ui.list = list

    const sidebar = h(
      'aside',
      { class: 'app__sidebar' },
      brand,
      controls,
      searchWrap,
      list
    )
    return sidebar
  }

  renderMain() {
    const title = h('input', {
      class: 'note-editor__title input',
      type: 'text',
      placeholder: 'Title',
      value: '',
      oninput: (e) => this.onEdit({ title: e.target.value }),
    })
    const content = h('textarea', {
      class: 'note-editor__content',
      placeholder: 'Write your note...',
      oninput: (e) => this.onEdit({ content: e.target.value }),
    })

    const saveBtn = h(
      'button',
      {
        class: 'button button--primary',
        onclick: () => this.saveActive(),
      },
      'Save'
    )
    const info = h('div', { class: 'badge', 'aria-live': 'polite' }, '')
    const actions = h(
      'div',
      { class: 'note-editor__actions' },
      info,
      h('div', {}, saveBtn)
    )

    const main = h(
      'main',
      { class: 'app__main' },
      h('div', { class: 'note-editor' },
        h('div', { class: 'note-editor__row' }, title),
        content,
        actions
      )
    )
    this.ui.title = title
    this.ui.content = content
    this.ui.status = info
    this.ui.main = main
    return main
  }

  async refreshList() {
    const items = await this.repo.list(this.state.query)
    this.state.notes = items
    this.renderList()
  }

  renderList() {
    const list = this.ui.list
    list.innerHTML = ''
    for (const n of this.state.notes) {
      const item = h(
        'li',
        {
          class:
            'note-list__item' +
            (n.id === this.state.activeId ? ' note-list__item--active' : ''),
          role: 'option',
          'aria-selected': n.id === this.state.activeId ? 'true' : 'false',
          onclick: () => this.selectNote(n.id),
        },
        h('div', { class: 'note-list__title' }, n.title || 'Untitled'),
        h(
          'div',
          { class: 'note-list__meta' },
          `Edited ${fmtDate(n.updatedAt)}`
        )
      )
      list.appendChild(item)
    }
  }

  async onSearch(q) {
    this.state.query = q
    await this.refreshList()
  }

  async selectNote(id) {
    this.state.activeId = id
    const note = await this.repo.get(id)
    this.ui.title.value = note?.title || ''
    this.ui.content.value = note?.content || ''
    this.renderList()
    this.setStatus(`Editing • ${fmtDate(note?.updatedAt)}`)
  }

  newNote() {
    this.state.activeId = null
    this.ui.title.value = ''
    this.ui.content.value = ''
    this.renderList()
    this.setStatus('New note')
  }

  async deleteCurrent() {
    if (!this.state.activeId) {
      this.setStatus('Nothing to delete')
      return
    }
    const id = this.state.activeId
    await this.repo.remove(id)
    await this.refreshList()
    if (this.state.notes.length) {
      this.selectNote(this.state.notes[0].id)
    } else {
      this.newNote()
    }
    this.setStatus('Deleted')
  }

  onEdit() {
    // optimistic local state (fields already reflect)
    if (!this.state.activeId) {
      // creating - just show draft status
      this.setStatus('Draft')
      return
    }
    this.setStatus('Edited • not saved')
  }

  async saveActive() {
    const title = this.ui.title.value.trim()
    const content = this.ui.content.value
    if (!title && !content.trim()) {
      this.setStatus('Nothing to save')
      return
    }
    this.state.saving = true
    this.disableInputs(true)
    try {
      if (!this.state.activeId) {
        const created = await this.repo.create({ title, content })
        this.state.activeId = created.id
      } else {
        await this.repo.update(this.state.activeId, { title, content })
      }
      await this.refreshList()
      this.selectNote(this.state.activeId)
      this.setStatus('Saved')
    } catch (e) {
      console.error(e)
      this.setStatus('Save failed')
    } finally {
      this.state.saving = false
      this.disableInputs(false)
    }
  }

  disableInputs(disabled) {
    this.ui.title.disabled = disabled
    this.ui.content.disabled = disabled
    const buttons = this.root.querySelectorAll('button')
    buttons.forEach((b) => (b.disabled = disabled))
  }

  setStatus(text) {
    if (this.ui.status) this.ui.status.textContent = text
  }
}

function getEnv(name) {
  // Vite injects import.meta.env; users can set VITE_NOTES_API_BASE
  if (name === 'NOTES_API_BASE') {
    return import.meta?.env?.VITE_NOTES_API_BASE
  }
  return undefined
}
