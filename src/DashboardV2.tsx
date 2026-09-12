import { useMemo, useState } from 'react'
import {
  CHARACTER_LIBRARY,
  addSnippet,
  deleteProductivityItem,
  parseQuickCommand,
  toggleTodo,
  useCompanionPrefs,
  useProductivity,
  writeCompanionPrefs,
  type CharacterId,
  type CustomEyes,
  type CustomShape,
  type MovementMode,
} from './companion-store'
import { ACCESSORIES, PERSONALITIES, themeColors, type Accessory, type GremlinSettings, type Personality } from './gremlin'
import useDesktopState from './useDesktopState'

type Tab = 'companion' | 'character' | 'productivity' | 'pro'

function PreviewFace({ character }: { character: CharacterId }) {
  const prefs = useCompanionPrefs()
  const style = {
    '--gremlin-accent': '#b2ff59',
    '--custom-primary': prefs.customPrimary,
    '--custom-secondary': prefs.customSecondary,
  } as React.CSSProperties
  const custom = character === 'custom' ? `custom-${prefs.customShape} custom-eyes-${prefs.customEyes}` : ''
  return (
    <div className={`dashboard-character-preview companion-character--${character} ${custom}`} style={style}>
      <span className="companion-body expression-happy">
        <span className="companion-special companion-special--a" />
        <span className="companion-special companion-special--b" />
        <span className="companion-ear companion-ear--left" />
        <span className="companion-ear companion-ear--right" />
        <span className="companion-brow companion-brow--left" />
        <span className="companion-brow companion-brow--right" />
        <span className="companion-eye companion-eye--left" />
        <span className="companion-eye companion-eye--right" />
        <span className="companion-mouth" />
      </span>
    </div>
  )
}

export default function DashboardV2() {
  const state = useDesktopState()
  const prefs = useCompanionPrefs()
  const productivity = useProductivity()
  const [tab, setTab] = useState<Tab>('companion')
  const [command, setCommand] = useState('')
  const [commandStatus, setCommandStatus] = useState('')
  const [snippetDraft, setSnippetDraft] = useState('')
  const [licenseKey, setLicenseKey] = useState('')
  const [licenseMessage, setLicenseMessage] = useState('')

  const pendingTodos = useMemo(() => productivity.todos.filter((item) => !item.done).length, [productivity.todos])
  const pendingReminders = useMemo(() => productivity.reminders.filter((item) => !item.fired).length, [productivity.reminders])

  if (!state || !window.screenGremlin) {
    return <main className="dash-v2"><section className="dash-v2__empty">Loading ScreenGremlin…</section></main>
  }

  const settings = state.settings
  const update = (patch: Partial<GremlinSettings>) => void window.screenGremlin?.updateSettings(patch)

  function selectCharacter(id: CharacterId) {
    const character = CHARACTER_LIBRARY.find((item) => item.id === id)
    if (character?.pro && !state.pro) return
    writeCompanionPrefs({ character: id })
  }

  function setMode(mode: MovementMode) {
    writeCompanionPrefs({ movementMode: mode })
  }

  function choosePersonality(personality: Personality) {
    if (PERSONALITIES[personality].pro && !state.pro) return
    update({ personality })
  }

  function chooseAccessory(accessory: Accessory) {
    const item = ACCESSORIES.find((candidate) => candidate.id === accessory)
    if (item?.pro && !state.pro) return
    update({ accessory })
  }

  function runCommand() {
    const result = parseQuickCommand(command)
    setCommandStatus(result.message)
    if (!result.message.startsWith('Try') && !result.message.startsWith('Type')) setCommand('')
  }

  async function copySnippet(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCommandStatus('Copied to clipboard.')
    } catch {
      setCommandStatus('Copy was blocked. Select the snippet text and copy it normally.')
    }
  }

  async function activate() {
    const result = await window.screenGremlin?.activateLicense(licenseKey)
    if (!result) return
    if (result.valid) {
      setLicenseMessage('Pro unlocked on this device.')
      setLicenseKey('')
    } else setLicenseMessage(result.error)
  }

  return (
    <main className="dash-v2" style={{ '--dash-accent': themeColors[settings.theme] } as React.CSSProperties}>
      <aside className="dash-v2__sidebar">
        <div className="dash-v2__brand">
          <span className="dash-v2__brand-mark">SG</span>
          <div><strong>ScreenGremlin</strong><small>{state.pro ? 'Pro companion' : 'Free companion'}</small></div>
        </div>
        <nav>
          <button className={tab === 'companion' ? 'active' : ''} onClick={() => setTab('companion')}>Companion</button>
          <button className={tab === 'character' ? 'active' : ''} onClick={() => setTab('character')}>Character</button>
          <button className={tab === 'productivity' ? 'active' : ''} onClick={() => setTab('productivity')}>
            Productivity <span>{pendingTodos + pendingReminders || ''}</span>
          </button>
          <button className={tab === 'pro' ? 'active' : ''} onClick={() => setTab('pro')}>Pro</button>
        </nav>
        <div className="dash-v2__sidebar-footer">
          <span>Local-first · no analytics</span>
          <button onClick={() => void window.screenGremlin?.closeSettings()}>Close</button>
        </div>
      </aside>

      <section className="dash-v2__content">
        {tab === 'companion' && (
          <>
            <header className="dash-v2__page-head"><div><p>COMPANION</p><h1>How should it live on your screen?</h1></div><PreviewFace character={prefs.character} /></header>
            <section className="dash-card">
              <h2>Movement</h2><p>Choose how much space the companion is allowed to take.</p>
              <div className="mode-grid">
                {([
                  ['free', 'Roam', 'Moves around and performs reactions.'],
                  ['parked', 'Park anywhere', 'Drag it exactly where you want and it stays there.'],
                  ['dangle', 'Dangle', 'Snaps to an edge and gently hangs there.'],
                ] as Array<[MovementMode, string, string]>).map(([id, label, description]) => (
                  <button key={id} className={prefs.movementMode === id ? 'selected' : ''} onClick={() => setMode(id)}><strong>{label}</strong><small>{description}</small></button>
                ))}
              </div>
            </section>
            <section className="dash-grid-2">
              <div className="dash-card"><h2>Behavior</h2>
                <label className="dash-control"><span>Speech bubbles</span><input type="checkbox" checked={settings.speech} onChange={(e) => update({ speech: e.target.checked })} /></label>
                <label className="dash-control"><span>Tiny sounds</span><input type="checkbox" checked={settings.sounds} onChange={(e) => update({ sounds: e.target.checked })} /></label>
                <label className="dash-control"><span>Rare animations</span><input type="checkbox" checked={settings.rareAnimations} onChange={(e) => update({ rareAnimations: e.target.checked })} /></label>
                <label className="dash-control"><span>Two companions <em>Pro</em></span><input type="checkbox" disabled={!state.pro} checked={settings.duo} onChange={(e) => update({ duo: e.target.checked })} /></label>
              </div>
              <div className="dash-card"><h2>Work mode</h2><p>Quiet it instantly without closing ScreenGremlin.</p>
                <div className="dash-actions"><button onClick={() => update({ paused: !settings.paused })}>{settings.paused ? 'Resume' : 'Pause now'}</button><button onClick={() => update({ paused: false, focusUntil: Date.now() + 30 * 60_000 })}>Focus 30m</button></div>
                <label className="dash-control"><span>Hide from fullscreen spaces</span><input type="checkbox" checked={settings.fullscreenSafe} onChange={(e) => update({ fullscreenSafe: e.target.checked })} /></label>
              </div>
            </section>
          </>
        )}

        {tab === 'character' && (
          <>
            <header className="dash-v2__page-head"><div><p>CHARACTER</p><h1>Make the companion yours.</h1></div><PreviewFace character={prefs.character} /></header>
            <section className="dash-card"><h2>Original characters</h2><p>These are ScreenGremlin originals—not copies of movie or TV characters.</p>
              <div className="character-grid">
                {CHARACTER_LIBRARY.map((character) => <button key={character.id} disabled={character.pro && !state.pro} className={prefs.character === character.id ? 'selected' : ''} onClick={() => selectCharacter(character.id)}><strong>{character.name}{character.pro && <em>Pro</em>}</strong><small>{character.description}</small></button>)}
              </div>
            </section>
            <section className="dash-grid-2">
              <div className="dash-card"><h2>Personality</h2><div className="compact-grid">{Object.entries(PERSONALITIES).map(([id, item]) => <button key={id} disabled={item.pro && !state.pro} className={settings.personality === id ? 'selected' : ''} onClick={() => choosePersonality(id as Personality)}>{item.label}{item.pro ? ' · Pro' : ''}</button>)}</div></div>
              <div className="dash-card"><h2>Accessory</h2><div className="compact-grid">{ACCESSORIES.map((item) => <button key={item.id} disabled={item.pro && !state.pro} className={settings.accessory === item.id ? 'selected' : ''} onClick={() => chooseAccessory(item.id)}>{item.label}{item.pro ? ' · Pro' : ''}</button>)}</div></div>
            </section>
            <section className={`dash-card ${prefs.character !== 'custom' ? 'is-muted' : ''}`}><h2>Custom character builder <em>Pro</em></h2><p>Select “Your Character” above, then build an original look from lightweight CSS shapes.</p>
              <div className="builder-row"><label>Primary <input type="color" value={prefs.customPrimary} disabled={!state.pro || prefs.character !== 'custom'} onChange={(e) => writeCompanionPrefs({ customPrimary: e.target.value })} /></label><label>Secondary <input type="color" value={prefs.customSecondary} disabled={!state.pro || prefs.character !== 'custom'} onChange={(e) => writeCompanionPrefs({ customSecondary: e.target.value })} /></label></div>
              <div className="builder-row"><label>Shape <select value={prefs.customShape} disabled={!state.pro || prefs.character !== 'custom'} onChange={(e) => writeCompanionPrefs({ customShape: e.target.value as CustomShape })}><option value="round">Round</option><option value="tall">Tall</option><option value="square">Square</option></select></label><label>Eyes <select value={prefs.customEyes} disabled={!state.pro || prefs.character !== 'custom'} onChange={(e) => writeCompanionPrefs({ customEyes: e.target.value as CustomEyes })}><option value="dot">Dot</option><option value="wide">Wide</option><option value="sleepy">Sleepy</option></select></label></div>
            </section>
          </>
        )}

        {tab === 'productivity' && (
          <>
            <header className="dash-v2__page-head"><div><p>PRODUCTIVITY</p><h1>Small tasks. No heavy agent required.</h1></div><div className="productivity-count"><strong>{pendingTodos}</strong><span>open todos</span></div></header>
            <section className="dash-card command-card"><h2>Quick command</h2><p>Local commands: <code>note …</code>, <code>todo …</code>, <code>remind 30m …</code>, <code>snippet …</code>.</p><div className="command-row"><input value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') runCommand() }} placeholder="todo finish landing page" /><button onClick={runCommand}>Run</button></div>{commandStatus && <small className="command-status">{commandStatus}</small>}</section>
            <section className="dash-grid-2 productivity-grid">
              <div className="dash-card"><h2>Todos</h2><div className="item-list">{productivity.todos.length === 0 && <p className="empty-copy">No todos yet.</p>}{productivity.todos.map((item) => <div className={`product-item ${item.done ? 'done' : ''}`} key={item.id}><button className="check" onClick={() => toggleTodo(item.id)}>{item.done ? '✓' : ''}</button><span>{item.text}</span><button className="delete" onClick={() => deleteProductivityItem('todos', item.id)}>×</button></div>)}</div></div>
              <div className="dash-card"><h2>Reminders</h2><div className="item-list">{productivity.reminders.length === 0 && <p className="empty-copy">Use “remind 30m …” above.</p>}{productivity.reminders.map((item) => <div className={`product-item ${item.fired ? 'done' : ''}`} key={item.id}><span className="time">{new Date(item.dueAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span><span>{item.text}</span><button className="delete" onClick={() => deleteProductivityItem('reminders', item.id)}>×</button></div>)}</div></div>
              <div className="dash-card"><h2>Notes</h2><div className="item-list">{productivity.notes.length === 0 && <p className="empty-copy">Use “note …” above.</p>}{productivity.notes.map((item) => <div className="product-item product-item--stack" key={item.id}><span>{item.text}</span><button className="delete" onClick={() => deleteProductivityItem('notes', item.id)}>×</button></div>)}</div></div>
              <div className="dash-card"><h2>Snippet shelf</h2><p>Paste text here only when you choose—ScreenGremlin does not watch your clipboard.</p><textarea value={snippetDraft} onChange={(e) => setSnippetDraft(e.target.value)} placeholder="Ctrl+V something worth keeping…" /><div className="dash-actions"><button onClick={() => { addSnippet(snippetDraft); setSnippetDraft('') }}>Save snippet</button></div><div className="item-list snippets">{productivity.snippets.map((item) => <div className="product-item product-item--stack" key={item.id}><span>{item.text}</span><div><button onClick={() => void copySnippet(item.text)}>Copy</button><button className="delete" onClick={() => deleteProductivityItem('snippets', item.id)}>×</button></div></div>)}</div></div>
            </section>
          </>
        )}

        {tab === 'pro' && (
          <>
            <header className="dash-v2__page-head"><div><p>PRO</p><h1>{state.pro ? 'Pro is active.' : 'Unlock the full companion.'}</h1></div><div className={`license-state ${state.pro ? 'active' : ''}`}>{state.pro ? 'PRO' : 'FREE'}</div></header>
            <section className="dash-card"><h2>License</h2><p>Offline signed license. No ScreenGremlin account required.</p>{state.pro ? <><p className="license-owner">Licensed to <strong>{state.license?.owner || 'ScreenGremlin Pro'}</strong></p><button className="secondary-button" onClick={() => void window.screenGremlin?.deactivateLicense()}>Deactivate on this device</button></> : <><div className="license-row"><input value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} placeholder="SG1.…" /><button onClick={() => void activate()}>Activate</button></div>{licenseMessage && <small className="command-status">{licenseMessage}</small>}</>}</section>
            <section className="dash-card"><h2>What Pro unlocks</h2><div className="pro-feature-grid"><span>7 premium characters</span><span>Custom character builder</span><span>Duo interactions</span><span>Premium personalities</span><span>Premium accessories</span><span>Chaos intensity</span></div></section>
          </>
        )}
      </section>
    </main>
  )
}
