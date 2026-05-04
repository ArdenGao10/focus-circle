'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTimer, useLiveElapsed } from '@/components/TimerContext'
import { useAppData } from '@/components/AppDataContext'
import DailyTasks from '@/components/DailyTasks'

const PERSONAL_FOCUS = '个人专注'

type TimerVisualState = 'idle' | 'running' | 'paused'

function pad2(n: number) { return n.toString().padStart(2, '0') }

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

function formatAuraTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`
  return `${pad2(m)}:${pad2(s)}`
}

function formatAuraDate(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

interface DisplaySession {
  id: string
  duration_seconds: number
  created_at: string
  taskName: string
}

function normalizeTaskName(taskName: string | null | undefined): string {
  return taskName?.trim() || PERSONAL_FOCUS
}

/* ─────────────────────────────────────────────────────────────
   Aura halo — dual-layer, edge-dissolving. Outer 500px blur(40)
   ambient glow + inner 320px gradient that fades to 0 at 95%.
   No box-shadow, no border. Three states crossfade by opacity.
   ───────────────────────────────────────────────────────────── */

// Per-state gradients, captured at module scope so re-renders don't
// rebuild the strings.
const ORB_GRADIENTS: Record<TimerVisualState, { outer: string; core: string }> = {
  idle: {
    outer: 'radial-gradient(circle, rgba(168, 213, 186, 0.20) 0%, rgba(168, 213, 186, 0.08) 40%, transparent 70%)',
    core:  'radial-gradient(circle, rgba(168, 213, 186, 0.45) 0%, rgba(168, 213, 186, 0.25) 35%, rgba(168, 213, 186, 0.10) 65%, transparent 95%)',
  },
  running: {
    outer: 'radial-gradient(circle, rgba(168, 213, 186, 0.35) 0%, rgba(168, 213, 186, 0.15) 40%, transparent 70%)',
    core:  'radial-gradient(circle, rgba(111, 169, 137, 0.50) 0%, rgba(168, 213, 186, 0.40) 35%, rgba(168, 213, 186, 0.15) 65%, transparent 95%)',
  },
  paused: {
    outer: 'radial-gradient(circle, rgba(197, 181, 221, 0.32) 0%, rgba(197, 181, 221, 0.12) 40%, transparent 70%)',
    core:  'radial-gradient(circle, rgba(160, 140, 195, 0.42) 0%, rgba(197, 181, 221, 0.30) 35%, rgba(197, 181, 221, 0.12) 65%, transparent 95%)',
  },
}

function AuraHalo({ state, children }: { state: TimerVisualState; children: React.ReactNode }) {
  const states: TimerVisualState[] = ['idle', 'running', 'paused']

  const outerLayer = (s: TimerVisualState): React.CSSProperties => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 500,
    height: 500,
    transform: 'translate(-50%, -50%)',
    background: ORB_GRADIENTS[s].outer,
    filter: 'blur(40px)',
    pointerEvents: 'none',
    opacity: state === s ? 1 : 0,
    transition: 'opacity 0.6s ease',
  })

  const coreLayer = (s: TimerVisualState): React.CSSProperties => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 320,
    height: 320,
    transform: 'translate(-50%, -50%)',
    background: ORB_GRADIENTS[s].core,
    borderRadius: '50%',
    pointerEvents: 'none',
    opacity: state === s ? 1 : 0,
    transition: 'opacity 0.6s ease',
  })

  return (
    <div
      className="relative flex items-center justify-center mx-auto"
      style={{ width: 320, height: 320, maxWidth: '60vw', maxHeight: '60vw' }}
    >
      {/* Both layers breathe together; time digits stay still. */}
      <div className="aura-breathe" style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0, pointerEvents: 'none' }}>
        {states.map(s => <div key={`o-${s}`} style={outerLayer(s)} />)}
        {states.map(s => <div key={`c-${s}`} style={coreLayer(s)} />)}
      </div>

      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

export default function TimerPage() {
  const { state, saving, taskName, start, pause, resume, end, lastSession } = useTimer()
  const elapsed = useLiveElapsed()
  const { todaySessions, addSession, profileHistory, loadProfileHistory } = useAppData()
  const [localAdded, setLocalAdded] = useState<DisplaySession[]>([])

  // Trigger profile-history load so we can compute the streak in the footer.
  useEffect(() => { loadProfileHistory() }, [loadProfileHistory])

  // When a session ends, push it into local + cache
  useEffect(() => {
    if (!lastSession) return
    const normalizedName = normalizeTaskName(lastSession.taskName)
    const newSession: DisplaySession = {
      id: crypto.randomUUID(),
      duration_seconds: lastSession.duration_seconds,
      created_at: lastSession.created_at,
      taskName: normalizedName,
    }
    setLocalAdded(prev => [newSession, ...prev])
    addSession({
      id: newSession.id,
      duration_seconds: lastSession.duration_seconds,
      created_at: lastSession.created_at,
      task_name: normalizedName,
    })
  }, [lastSession, addSession])

  const displaySessions = useMemo(() => {
    const fromCache: DisplaySession[] = todaySessions.map(s => ({
      id: s.id,
      duration_seconds: s.duration_seconds,
      created_at: s.created_at,
      taskName: normalizeTaskName((s as { task_name?: string | null }).task_name),
    }))
    const cacheIds = new Set(fromCache.map(s => s.id))
    const newOnes = localAdded.filter(s => !cacheIds.has(s.id))
    const all = [...newOnes, ...fromCache]

    const personal = all.filter(s => s.taskName === PERSONAL_FOCUS)
    const others = all.filter(s => s.taskName !== PERSONAL_FOCUS)
    if (personal.length <= 1) return all
    const merged = personal.reduce((acc, cur) => ({
      ...acc,
      duration_seconds: acc.duration_seconds + cur.duration_seconds,
      created_at: cur.created_at > acc.created_at ? cur.created_at : acc.created_at,
    }))
    return [merged, ...others]
  }, [todaySessions, localAdded])

  const activeTaskName = normalizeTaskName(taskName)
  const isActive = state !== 'idle'
  const hasNamedTask = isActive && activeTaskName !== PERSONAL_FOCUS

  const sessionsTotal = displaySessions.reduce((sum, s) => sum + s.duration_seconds, 0)

  // Cumulative refresh every 5s (cheap timer for the footer total)
  const [totalElapsed, setTotalElapsed] = useState(0)
  useEffect(() => {
    if (!isActive) { setTotalElapsed(0); return }
    setTotalElapsed(elapsed)
    const interval = setInterval(() => setTotalElapsed(prev => prev + 5), 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  const todayTotal = sessionsTotal + (isActive ? totalElapsed : 0)
  const showRecords = displaySessions.length > 0 || isActive

  // Streak — count consecutive days back from today using profileHistory.
  const streakDays = useMemo(() => {
    if (!profileHistory || profileHistory.length === 0) return 0
    const days = new Set(profileHistory.map(h => h.date))
    let count = 0
    const cursor = new Date()
    while (days.has(cursor.toISOString().split('T')[0])) {
      count += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  }, [profileHistory])

  const today = new Date()

  // Primary action label per state — Chinese text-button
  const primaryLabel = state === 'idle' ? '开始' : state === 'running' ? '暂停' : '继续'
  const onPrimary = state === 'idle' ? () => start() : state === 'running' ? pause : resume

  return (
    <div
      className="relative min-h-full"
      style={{ background: 'var(--aura-bg-primary)', color: 'var(--aura-text-primary)' }}
    >
      {/* ─── Hero: ~one screen, generous whitespace ─── */}
      <section className="flex flex-col items-center px-6 pt-5 pb-16">
        {/* 1. Top wordmark */}
        <div
          style={{
            fontFamily: 'var(--aura-font-mono)',
            fontSize: 11,
            letterSpacing: '0.2em',
            color: 'var(--aura-text-muted)',
          }}
        >
          FOCUS.CIRCLE
        </div>

        {/* 2. Big serif title */}
        <h1
          className="mt-6 text-center"
          style={{
            fontFamily: 'var(--aura-font-serif)',
            fontSize: 'clamp(40px, 12vw, 56px)',
            fontWeight: 400,
            lineHeight: 1,
            color: 'var(--aura-text-primary)',
          }}
        >
          Focus.
        </h1>

        {/* 3. Date · daily mantra */}
        <div
          className="mt-3 text-center"
          style={{
            fontFamily: 'var(--aura-font-serif)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--aura-text-secondary)',
          }}
        >
          {formatAuraDate(today)} · 静而后能定
        </div>

        {/* 4. The halo + time (halo only contains the digits) */}
        <div className="mt-6">
          <AuraHalo state={state}>
            <div
              style={{
                fontFamily: 'var(--aura-font-serif)',
                fontSize: 'clamp(48px, 14vw, 72px)',
                fontWeight: 300,
                lineHeight: 1,
                color: 'var(--aura-text-primary)',
                letterSpacing: '0.02em',
                fontVariantNumeric: 'tabular-nums lining-nums',
              }}
            >
              {formatAuraTime(elapsed)}
            </div>
          </AuraHalo>
        </div>

        {/* Active task — independent line, below the halo */}
        {hasNamedTask && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <span
              style={{
                width: 4, height: 4, borderRadius: '50%',
                background: 'var(--aura-green-solid)',
                opacity: 0.7,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 14,
                color: 'var(--aura-text-secondary)',
                letterSpacing: '0.05em',
              }}
              className="truncate max-w-[18rem]"
            >
              {activeTaskName}
            </span>
          </div>
        )}

        {/* 5. Operation area — Chinese text-buttons */}
        <div className="mt-10 flex flex-col items-center">
          <button
            onClick={onPrimary}
            style={{
              fontFamily: 'var(--aura-font-sans)',
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: '0.2em',
              color: 'var(--aura-text-primary)',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--aura-text-primary)',
              paddingBottom: 4,
              cursor: 'pointer',
            }}
          >
            {primaryLabel}
          </button>

          {/* Discreet end link — visible only during an active session */}
          {isActive && (
            <button
              onClick={end}
              disabled={saving}
              className="mt-7"
              style={{
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 12,
                letterSpacing: '0.2em',
                color: 'var(--aura-text-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {saving ? '保存中…' : '结束本次专注'}
            </button>
          )}
        </div>
      </section>

      {/* ─── Today's records (kept functional, neutralized look) ─── */}
      {showRecords && (
        <section className="px-6 pb-10 max-w-md mx-auto w-full">
          <div className="flex items-baseline justify-between mb-4">
            <span
              style={{
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 13,
                letterSpacing: '0.15em',
                color: 'var(--aura-text-secondary)',
              }}
            >
              今日记录
            </span>
            <span
              style={{
                fontFamily: 'var(--aura-font-mono)',
                fontSize: 12,
                color: 'var(--aura-text-muted)',
                fontVariantNumeric: 'tabular-nums lining-nums',
              }}
            >
              {formatTime(todayTotal)}
            </span>
          </div>
          <div className="space-y-3">
            {displaySessions.map((s) => {
              const isLive = isActive && s.taskName === activeTaskName
              const totalSec = isLive ? s.duration_seconds + elapsed : s.duration_seconds
              return (
                <div key={s.id} className="flex items-center gap-3 py-1">
                  <span
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--aura-green-solid)',
                      opacity: isLive ? 1 : 0.6,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    className="flex-1 truncate"
                    style={{
                      fontFamily: 'var(--aura-font-sans)',
                      fontSize: 14,
                      color: isLive ? 'var(--aura-text-primary)' : 'var(--aura-text-secondary)',
                    }}
                  >
                    {s.taskName}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--aura-font-mono)',
                      fontSize: 12,
                      color: 'var(--aura-text-secondary)',
                      fontVariantNumeric: 'tabular-nums lining-nums',
                    }}
                  >
                    {formatTime(totalSec)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="px-6 pb-10 max-w-md mx-auto w-full">
        <DailyTasks />
      </section>

      {/* ─── Footer status bar — in document flow, brand line only ─── */}
      <div
        className="flex justify-center items-center gap-2 px-6 pb-12 pt-6"
        style={{
          fontFamily: 'var(--aura-font-mono)',
          fontSize: 10,
          letterSpacing: '0.15em',
          color: 'var(--aura-text-muted)',
          fontVariantNumeric: 'tabular-nums lining-nums',
        }}
      >
        <span>FOCUS.CIRCLE</span>
        <span>·</span>
        <span style={{ fontFamily: 'var(--aura-font-sans)', letterSpacing: '0.1em' }}>
          今日 {formatTime(todayTotal)}
        </span>
        {streakDays > 0 && (
          <>
            <span>·</span>
            <span style={{ fontFamily: 'var(--aura-font-sans)', letterSpacing: '0.1em' }}>
              连续 {streakDays} 天
            </span>
          </>
        )}
      </div>
    </div>
  )
}
