'use client'

import { useTimer } from './TimerContext'
function formatDuration(seconds: number): { hours: number; minutes: number; seconds: number } {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return { hours, minutes, seconds: secs }
}

function formatDateLabel(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  return dateStr
}

export default function SessionSummary() {
  const { lastSession, clearLastSession } = useTimer()

  if (!lastSession) return null

  const { hours, minutes, seconds } = formatDuration(lastSession.duration_seconds)

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: 'var(--aura-bg-primary)' }}
    >
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--aura-bg-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 32px',
          textAlign: 'center',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 240,
            height: 240,
            background:
              'radial-gradient(circle, var(--aura-complete-primary) 0%, var(--aura-complete-soft) 50%, transparent 90%)',
            filter: 'blur(30px)',
            marginBottom: 60,
            transition: 'background 1.2s ease',
          }}
        />

        <h1
          style={{
            fontFamily: 'var(--aura-font-serif)',
            fontSize: 36,
            fontWeight: 300,
            color: 'var(--aura-text-primary)',
            letterSpacing: '0.05em',
            marginBottom: 12,
          }}
        >
          专注完成
        </h1>

        <p
          style={{
            fontFamily: 'var(--aura-font-sans)',
            fontSize: 14,
            color: 'var(--aura-text-muted)',
            letterSpacing: '0.1em',
            marginBottom: 64,
          }}
        >
          又一次认真的时光
        </p>

        <div
          style={{
            fontFamily: 'var(--aura-font-serif)',
            fontSize: 56,
            fontWeight: 300,
            color: 'var(--aura-text-primary)',
            marginBottom: 16,
            fontVariantNumeric: 'tabular-nums lining-nums',
          }}
        >
          {hours > 0 && (
            <>
              {hours}
              <span style={{ fontSize: 24, margin: '0 12px 0 4px', color: 'var(--aura-text-secondary)' }}>时</span>
            </>
          )}
          {minutes}
          <span style={{ fontSize: 24, margin: '0 12px 0 4px', color: 'var(--aura-text-secondary)' }}>分</span>
          {seconds.toString().padStart(2, '0')}
          <span style={{ fontSize: 24, marginLeft: 4, color: 'var(--aura-text-secondary)' }}>秒</span>
        </div>

        <div
          style={{
            fontFamily: 'var(--aura-font-mono)',
            fontSize: 12,
            color: 'var(--aura-text-muted)',
            letterSpacing: '0.1em',
            marginBottom: 80,
          }}
        >
          个人专注 · {formatDateLabel(lastSession.date)}
        </div>

        <button
          onClick={clearLastSession}
          style={{
            fontFamily: 'var(--aura-font-sans)',
            fontSize: 14,
            letterSpacing: '0.2em',
            fontWeight: 500,
            color: 'var(--aura-text-primary)',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--aura-text-primary)',
            paddingBottom: 4,
            cursor: 'pointer',
          }}
        >
          继续
        </button>
      </div>
    </div>
  )
}
