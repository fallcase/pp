// Renders <App /> to static HTML and writes it into dist/index.html, so crawlers and link-preview bots
// (most of which don't run JS) see the real content. The browser then hydrates it.
import fs from 'node:fs'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'warn' })
try {
  const { render } = await vite.ssrLoadModule('/src/entry-server.tsx')
  const file = 'dist/index.html'
  const html = fs.readFileSync(file, 'utf8')
  const marker = '<div id="root"></div>'
  if (!html.includes(marker)) throw new Error(`prerender: ${marker} not found in ${file}`)
  const app = render()
  if (!app.includes('<h1')) throw new Error('prerender: rendered markup has no <h1>, refusing to write')
  fs.writeFileSync(file, html.replace(marker, `<div id="root">${app}</div>`))
  console.log(`prerendered ${file}: ${(app.length / 1024).toFixed(1)} KB of markup`)
} finally {
  await vite.close()
}
