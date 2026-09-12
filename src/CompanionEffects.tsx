import { useEffect, useRef } from 'react'
import useDesktopState from './useDesktopState'

export default function CompanionEffects() {
  const state = useDesktopState()
  const audio = useRef<AudioContext | null>(null)
  const accessory = state?.settings.accessory ?? 'none'
  const sounds = Boolean(state?.settings.sounds)
  const duo = Boolean(state?.settings.duo)

  useEffect(() => {
    const applyAccessory = () => {
      document.querySelectorAll<HTMLElement>('.companion-character').forEach((element) => {
        element.dataset.accessory = accessory
      })
    }
    applyAccessory()
    const frame = window.requestAnimationFrame(applyAccessory)
    return () => window.cancelAnimationFrame(frame)
  }, [accessory, duo])

  useEffect(() => {
    if (!sounds) return
    const play = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element) || !target.closest('.companion-character')) return
      try {
        audio.current ??= new AudioContext()
        const context = audio.current
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const now = context.currentTime
        oscillator.type = 'triangle'
        oscillator.frequency.setValueAtTime(330, now)
        oscillator.frequency.exponentialRampToValueAtTime(460, now + 0.075)
        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.exponentialRampToValueAtTime(0.045, now + 0.008)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09)
        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start(now)
        oscillator.stop(now + 0.095)
      } catch {
        // Sound is optional and must never affect the desktop overlay.
      }
    }
    document.addEventListener('pointerup', play, true)
    return () => document.removeEventListener('pointerup', play, true)
  }, [sounds])

  return null
}
