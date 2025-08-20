/**
 * Tiny component helpers (vanilla JS)
 */

// PUBLIC_INTERFACE
export function h(tag, props = {}, ...children) {
  /** Create DOM element with attributes and children. */
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') el.className = v
    else if (k === 'dataset') Object.assign(el.dataset, v)
    else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v)
    } else if (v !== undefined && v !== null) el.setAttribute(k, v)
  }
  for (const ch of children.flat()) {
    if (ch == null) continue
    if (typeof ch === 'string') el.appendChild(document.createTextNode(ch))
    else el.appendChild(ch)
  }
  return el
}

// PUBLIC_INTERFACE
export function fmtDate(ts) {
  /** Format timestamp to friendly string. */
  try {
    const d = new Date(ts)
    return d.toLocaleString()
  } catch {
    return ''
  }
}
