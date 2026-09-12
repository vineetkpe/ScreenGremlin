import { useEffect, useState } from 'react'
import type { AppState } from './gremlin'

export default function useDesktopState() {
  const [state, setState] = useState<AppState | null>(null)

  useEffect(() => {
    if (!window.screenGremlin) return

    let mounted = true
    window.screenGremlin.getState().then((next) => {
      if (mounted && next) setState(next)
    })

    const unsubscribe = window.screenGremlin.onStateChanged((next) => {
      if (mounted && next) setState(next)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return state
}
