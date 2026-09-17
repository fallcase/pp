import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource/oswald/500.css'
import '@fontsource/oswald/700.css'
import '@fontsource/golos-text/400.css'
import '@fontsource/golos-text/500.css'
import '@fontsource/golos-text/700.css'
import './index.css'
import App from './App.tsx'

// In-page links scroll without writing #anchors into the address bar (hrefs stay for no-JS and middle-click).
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const href = (e.target as Element).closest('a')?.getAttribute('href')
  if (!href?.startsWith('#')) return
  e.preventDefault()
  document.getElementById(href.slice(1))?.scrollIntoView() // smoothness comes from CSS scroll-behavior
})

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)
// production HTML is prerendered (see prerender.mjs): hydrate it; the dev server starts from an empty div
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
