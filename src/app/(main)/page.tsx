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
   Aura halo — three crossfaded radial-gradient layers, breathing.
   No ring, no border, no outer shadow. Just light.
   ───────────────────────────────────────────────────────────── */
function AuraHalo({ state, children }: { state: TimerVisualState; children: React.ReactNode }) {
  const layer = (gradient: string, visible: boolean): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    background: gradient,
    filter: 'blur(0.5px)',
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.6s ease',
  })

  return (
    <div
      className="relative flex items-center justify-center mx-auto"
      style={{ width: 'min(320px, 60vw)', height: 'min(320px, 60vw)' }}
    >
      <div className="absolute inset-0 aura-breathe">
        <div style={layer(
          'radial-gradient(circle at center, var(--aura-green-soft) 0%, transparent 85%)',
          state === 'idle',
        )} />
        <div style={layer(
          'radial-gradient(circle at center, var(--aura-green) 0%, transparent 85%)',
          state === 'running',
        )} />
        <div style={layer(
          'radial-gradient(circle at center, var(--aura-cool) 0%, transparent 85%)',
          state === 'paused',
        )} />
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

  // Primary action label per state — text, not button
  const primaryLabel = state === 'idle' ? 'BEGIN' : state === 'running' ? 'PAUSE' : 'RESUME'
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

        {/* 4. The halo + time */}
        <div className="mt-6">
          <AuraHalo state={state}>
            <div className="flex flex-col items-center">
              <div
                style={{
                  fontFamily: 'var(--aura-font-serif)',
                  fontSize: 'clamp(48px, 14vw, 72px)',
                  fontWeight: 300,
                  lineHeight: 1,
                  color: 'var(--aura-text-primary)',
                  fontVariantNumeric: 'tabular-nums lining-nums',
                }}
              >
                {formatAuraTime(elapsed)}
              </div>

              {hasNamedTask && (
                <div
                  className="mt-5 flex items-center gap-2"
                  style={{
                    fontFamily: 'var(--aura-font-sans)',
                    fontSize: 14,
                    color: 'var(--aura-text-secondary)',
                  }}
                >
                  <span style={{ color: 'var(--aura-green-solid)' }}>•</span>
                  <span className="truncate max-w-[16rem]">{activeTaskName}</span>
                </div>
              )}
            </div>
          </AuraHalo>
        </div>

        {/* 5. Operation area — text-only with hover-extend underline */}
        <div className="mt-10 flex flex-col items-center">
          <button
            onClick={onPrimary}
            className="aura-text-action group"
            style={{
              fontFamily: 'var(--aura-font-mono)',
              fontSize: 14,
              letterSpacing: '0.3em',
              color: 'var(--aura-text-primary)',
              background: 'transparent',
              border: 'none',
              padding: '4px 0',
              cursor: 'pointer',
            }}
          >
            {primaryLabel}
            <span
              className="block mx-auto mt-2"
              style={{
                height: 1,
                background: 'var(--aura-text-primary)',
                transition: 'width 0.3s ease',
              }}
            />
          </button>

          {/* Discreet end link — only visible during a session */}
          {isActive && (
            <button
              onClick={end}
              disabled={saving}
              className="mt-6"
              style={{
                fontFamily: 'var(--aura-font-mono)',
                fontSize: 11,
                letterSpacing: '0.25em',
                color: 'var(--aura-text-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {saving ? 'SAVING…' : 'END SESSION'}
            </button>
          )}
        </div>
      </section>

      {/* ─── Today's records (kept functional, neutralized look) ─── */}
      {showRecords && (
        <section className="px-6 pb-10 max-w-md mx-auto w-full">
          <div
            className="flex items-center justify-between mb-4"
            style={{ fontFamily: 'var(--aura-font-mono)', fontSize: 11, letterSpacing: '0.2em', color: 'var(--aura-text-muted)' }}
          >
            <span>TODAY · 今日记录</span>
            <span style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}>{formatTime(todayTotal)}</span>
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

      {/* ─── Footer status bar — in document flow, surfaces only at the bottom of scroll ─── */}
      <div
        className="flex justify-center px-6 pb-12 pt-6"
        style={{
          fontFamily: 'var(--aura-font-mono)',
          fontSize: 10,
          letterSpacing: '0.15em',
          color: 'var(--aura-text-muted)',
          fontVariantNumeric: 'tabular-nums lining-nums',
        }}
      >
        FOCUS.CIRCLE // {formatTime(todayTotal)} TODAY{streakDays > 0 ? ` // ${streakDays} DAYS STREAK` : ''}
      </div>
    </div>
  )
}
