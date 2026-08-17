import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { applyPlatformAttributes } from './lib/platform'

// Before first paint, so app-only CSS (safe-area insets, no overscroll bounce)
// is already in effect and the shell never flashes its web layout first.
applyPlatformAttributes()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)