import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import DesktopOverlayShell from './DesktopOverlayShell'
import './styles.css'
import './fun-pack.css'
import './character-context-menu.css'
import './desktop.css'

const mode = new URLSearchParams(window.location.search).get('mode')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {mode === 'overlay' ? <DesktopOverlayShell /> : <App />}
  </React.StrictMode>,
)
