# Notes Frontend (Vite)

A modern, minimalistic single-page notes app with create, edit, delete, list, and search features.  
Runs fully offline using IndexedDB and can optionally connect to an HTTP backend if configured.

## Tech
- Vite (vanilla JS)
- IndexedDB for local persistence
- Optional REST backend via `VITE_NOTES_API_BASE`

## Quick start
- Install deps: `npm ci` or `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`

## Backend integration
Set `VITE_NOTES_API_BASE` in `.env` to enable server mode:
```
VITE_NOTES_API_BASE=https://your-backend.example.com
```
Expected endpoints:
- GET    /notes?search=
- GET    /notes/:id
- POST   /notes
- PATCH  /notes/:id
- DELETE /notes/:id

## Structure
- src/modules/app.js — UI orchestration and state
- src/modules/storage.js — repository switching between HTTP and IndexedDB
- src/modules/indexedDb.js — IndexedDB implementation
- src/modules/httpClient.js — simple REST client
- src/modules/components.js — small DOM helpers

## Accessibility
- Keyboard-friendly inputs
- Aria roles on note list

## Theme
Light, modern, minimal. Colors:
- Primary: #1a73e8
- Secondary: #e8eaed
- Accent: #ffbc42
