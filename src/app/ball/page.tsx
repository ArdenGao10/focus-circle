'use client'

import { useTimer, useLiveElapsed } from '@/components/TimerContext'

/**
 * Floating-ball orb (PRD 二期 · 浅色灵气球).
 *
 * Unlike the homepage orb (a soft translucent glow that only reads on the
 * near-white app background), this ball must stay legible on ANY desktop
 * wallpaper. So it has a solid frosted-white disc as its body, with the
 * aura color expressed as a rotating conic-gradient ring around the rim
 * ("灵气流动"), a radar pulse, an outer glow, and a drop shadow.
 *
 * Rendered into a native transparent always-on-top window by the Electron
 * shell. Keyframes (ball-spin / ball-pulse / ball-breathe) live in
 * ball/layout.tsx.
 */

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

const RING_RUNNING =
  'conic-gradient(from 0deg, rgba(92,138,112,0.95), rgba(168,213,186,0.45), rgba(176,156,217,0.9), rgba(168,213,186,0.45), rgba(92,138,112,0.95))'
const RING_PAUSED =
  'conic-gradient(from 0deg, rgba(141,131,166,0.85), rgba(221,215,234,0.4), rgba(176,156,217,0.8), rgba(221,215,234,0.4), rgba(141,131,166,0.85))'

export default function BallPage() {
  const { state } = useTimer()
  const elapsed = useLiveElapsed()
  const paused = state === 'paused'

  const ring = paused ? RING_PAUSED : RING_RUNNING
  const glow = paused ? 'rgba(176,156,217,0.55)' : 'rgba(120,180,150,0.6)'
  const pulseColor = paused ? 'rgba(176,156,217,0.6)' : 'rgba(111,169,137,0.7)'

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
      {/* 160×160 stage. */}
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
        {/* Outer diffuse glow — gentle breathe while running. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${glow} 0%, transparent 68%)`,
            filter: 'blur(16px)',
            animation: paused ? 'none' : 'ball-breathe 6s ease-in-out infinite',
            pointerEvents: 'none',
            transition: 'background 1.2s ease',
          }}
        />

        {/* Radar pulse — two staggered rings, running only. */}
        {!paused &&
          [0, 1.5].map((delay) => (
            <div
              key={delay}
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: 112,
                height: 112,
                borderRadius: '50%',
                border: `2.5px solid ${pulseColor}`,
                animation: `ball-pulse 3s ease-out ${delay}s infinite`,
                pointerEvents: 'none',
              }}
            />
          ))}

        {/* Rotating conic-gradient ring — the white disc covers the centre,
           leaving a ~7px rim where the rotating colors "flow". */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: 112,
            height: 112,
            borderRadius: '50%',
            background: ring,
            filter: 'blur(2px)',
            animation: `ball-spin ${paused ? '48s' : '9s'} linear infinite`,
            willChange: 'transform',
            pointerEvents: 'none',
            transition: 'background 1.2s ease',
          }}
        />

        {/* Frosted white disc — the solid body that guarantees contrast. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: 98,
            height: 98,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 38% 32%, #FFFFFF, #F1F1EF)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.14)',
          }}
        />

        {/* Time digits. */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            fontFamily: 'var(--aura-font-serif)',
            fontSize: 17,
            fontWeight: 400,
            lineHeight: 1,
            color: '#1A1A1A',
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
