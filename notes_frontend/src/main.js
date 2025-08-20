/* global console */
import './style.css'
import { NotesApp } from './modules/app.js'

// Initialize and render the Notes App
const root = document.getElementById('app')
const app = new NotesApp(root)
app.init().catch((e) => {
  console.error('Failed to initialize app', e)
  root.innerHTML = `
    <div class="app-error">
      <h2>Failed to load</h2>
      <p>${e?.message || e}</p>
    </div>
  `
})
