import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import DashboardV2 from './DashboardV2'
import DesktopOverlayShell from './DesktopOverlayShell'
import './styles.css'
import './fun-pack.css'
import './companion-v2.css'
import './character-context-menu.css'
import './dashboard-v2.css'
import './desktop.css'

const mode = new URLSearchParams(window.location.search).get('mode')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {mode === 'overlay' ? <DesktopOverlayShell /> : mode === 'settings' ? <DashboardV2 /> : <App />}
  </React.StrictMode>,
)
