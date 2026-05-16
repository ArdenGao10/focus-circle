'use client'

import { useTimer, useLiveElapsed } from '@/components/TimerContext'

/**
 * Floating-ball orb (PRD 二期). Same visual language as the homepage
 * AuraHalo orb, scaled to 1/4 (core 320 → 80px, time 64 → 16px,
 * blur 60 → 15px). Rendered into a native transparent always-on-top
 * window by the desktop shell; the page background is transparent so
 * only the orb + its diffuse glow are visible.
 */

type TimerVisualState = 'idle' | 'running' | 'paused'

// Identical gradient tokens to the homepage orb — keeps the ball
// visually consistent with the main timer.
const ORB_GRADIENTS: Record<TimerVisualState, { outer: string; core: string }> = {
  idle: {
    outer: 'radial-gradient(circle, var(--aura-focus-soft) 0%, var(--aura-focus-soft) 35%, transparent 70%)',
    core: 'radial-gradient(circle, var(--aura-focus-primary) 0%, var(--aura-focus-soft) 45%, transparent 70%)',
  },
  running: {
    outer: 'radial-gradient(circle, var(--aura-focus-soft) 0%, var(--aura-focus-soft) 35%, transparent 70%)',
    core: 'radial-gradient(circle, var(--aura-focus-primary) 0%, var(--aura-focus-soft) 45%, transparent 70%)',
  },
  paused: {
    outer: 'radial-gradient(circle, var(--aura-paused-soft) 0%, var(--aura-paused-soft) 35%, transparent 70%)',
    core: 'radial-gradient(circle, var(--aura-paused-primary) 0%, var(--aura-paused-soft) 45%, transparent 70%)',
  },
}

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`
  return `${pad2(m)}:${pad2(s)}`
}

export default function BallPage() {
  const { state } = useTimer()
  const elapsed = useLiveElapsed()

  const gradient = ORB_GRADIENTS[state]
  const coreClassName = state === 'paused'
    ? 'aura-orb-breathe aura-breathe-paused'
    : 'aura-orb-breathe'

  return (
    <main
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        background: 'transparent',
      }}
    >
      {/* 160×160 stage — holds the diffuse glow; orb core sits centered. */}
      <div
        style={{
          position: 'relative',
          width: 160,
          height: 160,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer diffuse glow — fills the stage, soft blurred edge. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: gradient.outer,
            filter: 'blur(15px)',
            borderRadius: '50%',
            pointerEvents: 'none',
            transition: 'background 1.2s ease',
          }}
        />

        {/* Core — fixed 80×80 circle. Wrapper centers; inner element does
           the breathe scale so pausing never displaces the orb. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: 80,
            height: 80,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        >
          <div
            className={coreClassName}
            style={{
              width: '100%',
              height: '100%',
              background: gradient.core,
              borderRadius: '50%',
              transition: 'background 1.2s ease',
            }}
          />
        </div>

        {/* Time digits — centered on top. */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            fontFamily: 'var(--aura-font-serif)',
            fontSize: 16,
            fontWeight: 300,
            lineHeight: 1,
            color: 'var(--aura-text-primary)',
            letterSpacing: '0.02em',
            fontVariantNumeric: 'tabular-nums lining-nums',
          }}
        >
          {formatTime(elapsed)}
        </div>
      </div>
    </main>
  )
}
