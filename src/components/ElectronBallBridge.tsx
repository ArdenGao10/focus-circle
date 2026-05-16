'use client'

import { useEffect } from 'react'
import { useTimer } from './TimerContext'

/**
 * Reports timer state to the Electron main process so it can show/hide
 * the floating-ball window (PRD 二期). A no-op outside Electron — in a
 * plain browser `window.electronBall` is undefined. Renders nothing.
 */

declare global {
  interface Window {
    electronBall?: { setActive: (active: boolean) => void }
  }
}

export default function ElectronBallBridge() {
  const { state } = useTimer()

  useEffect(() => {
    window.electronBall?.setActive(state !== 'idle')
  }, [state])

  return null
}
