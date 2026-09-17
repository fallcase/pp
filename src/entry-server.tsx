import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.tsx'

// Used only by prerender.mjs at build time.
export const render = () =>
  renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
