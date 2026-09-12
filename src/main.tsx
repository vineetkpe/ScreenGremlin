import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import DashboardV2 from './DashboardV2'
import DesktopOverlayShell from './DesktopOverlayShell'
import FriendBubble from './FriendBubble'
import './styles.css'
import './fun-pack.css'
import './companion-v2.css'
import './companion-v3.css'
import './companion-effects.css'
import './character-context-menu.css'
import './dashboard-v2.css'
import './friend-bubble.css'
import './friend-play.css'
import './desktop.css'

const mode = new URLSearchParams(window.location.search).get('mode')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {mode === 'overlay' ? <DesktopOverlayShell /> : mode === 'settings' ? <DashboardV2 /> : mode === 'friend' ? <FriendBubble /> : <App />}
  </React.StrictMode>,
)