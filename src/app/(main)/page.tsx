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

// Aura halo — small body, oversized diffuse glow. Outer layer is
// 140% sized with negative offset so blur bleeds beyond the 280px
// frame; core is 55% with a gradient that fades to transparent at
// 70%, leaving no visible rim. No ancestor may set `overflow:hidden`.

const ORB_GRADIENTS: Record<TimerVisualState, { outer: string; core: string }> = {
  idle: {
    outer: 'radial-gradient(circle, rgba(168, 213, 186, 0.30) 0%, rgba(168, 213, 186, 0.10) 35%, transparent 70%)',
    core:  'radial-gradient(circle, rgba(111, 169, 137, 0.40) 0%, rgba(168, 213, 186, 0.20) 45%, transparent 70%)',
  },
  running: {
    outer: 'radial-gradient(circle, rgba(168, 213, 186, 0.35) 0%, rgba(168, 213, 186, 0.12) 35%, transparent 70%)',
    core:  'radial-gradient(circle, rgba(111, 169, 137, 0.50) 0%, rgba(168, 213, 186, 0.25) 45%, transparent 70%)',
  },
  paused: {
    outer: 'radial-gradient(circle, rgba(197, 181, 221, 0.30) 0%, rgba(197, 181, 221, 0.10) 35%, transparent 70%)',
    core:  'radial-gradient(circle, rgba(160, 140, 195, 0.42) 0%, rgba(197, 181, 221, 0.22) 45%, transparent 70%)',
  },
}

function AuraHalo({ state, children }: { state: TimerVisualState; children: React.ReactNode }) {
  const states: TimerVisualState[] = ['idle', 'running', 'paused']

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1.5 / 1',
        maxWidth: 460,
        margin: '20px auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Outer diffuse glow — oversized + negative offset bleeds beyond container. */}
      {states.map(s => (
        <div
          key={`o-${s}`}
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: '140%',
            height: '140%',
            left: '-20%',
            top: '-20%',
            background: ORB_GRADIENTS[s].outer,
            filter: 'blur(60px)',
            pointerEvents: 'none',
            zIndex: 0,
            opacity: state === s ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        />
      ))}

      {/* Core — fixed 320×320 to stay a true circle in any container shape. */}
      {states.map(s => (
        <div
          key={`c-${s}`}
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: '320px',
            height: '320px',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: ORB_GRADIENTS[s].core,
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 1,
            opacity: state === s ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        />
      ))}

      {/* Time digits — sit on top. */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

  // Unified section-title style — used by 今日记录 and (inside) 今日任务.
  const sectionTitleStyle: React.CSSProperties = {
    fontFamily: 'var(--aura-font-sans)',
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.18em',
    color: 'var(--aura-text-muted)',
  }

  return (
    <div
      className="relative min-h-full"
      style={{ background: 'var(--aura-bg-primary)', color: 'var(--aura-text-primary)' }}
    >
      <main
        style={{
          maxWidth: 600,
          margin: '0 auto',
          padding: '0 24px 24px',
        }}
      >
        {/* 1. Top wordmark */}
        <div
          className="text-center"
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

        {/* 4. Halo (max 400 — never reaches phone edges) */}
        <div className="mt-8">
          <AuraHalo state={state}>
            <div
              style={{
                fontFamily: 'var(--aura-font-serif)',
                fontSize: 64,
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

        {/* 5. Active task — independent line, below the halo */}
        {hasNamedTask && (
          <div className="mt-6 flex items-center justify-center gap-2">
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

        {/* 6. Operation area — Chinese text-buttons */}
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

        {/* 7. 今日记录 — section, padding-based rows with thin dividers. */}
        {showRecords && (
          <section>
            <h3 style={{ ...sectionTitleStyle, marginTop: 60, marginBottom: 20 }}>今日记录</h3>
            <div>
              {displaySessions.map((s) => {
                const isLive = isActive && s.taskName === activeTaskName
                const totalSec = isLive ? s.duration_seconds + elapsed : s.duration_seconds
                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 0',
                      borderBottom: '1px solid rgba(0,0,0,0.04)',
                    }}
                  >
                    <span
                      style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--aura-green-solid)',
                        opacity: isLive ? 0.9 : 0.5,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      className="flex-1 truncate"
                      style={{
                        fontFamily: 'var(--aura-font-sans)',
                        fontSize: 15,
                        color: 'var(--aura-text-primary)',
                      }}
                    >
                      {s.taskName}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--aura-font-mono)',
                        fontSize: 12,
                        color: 'var(--aura-text-muted)',
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

        {/* 8. 今日任务 — section, not card. Title rendered here for symmetry. */}
        <section>
          <DailyTasks titleStyle={sectionTitleStyle} />
        </section>

        {/* 9. Footer brand line */}
        <footer
          style={{
            marginTop: 80,
            paddingTop: 32,
            borderTop: '1px solid rgba(0,0,0,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'var(--aura-font-mono)',
            fontSize: 11,
            letterSpacing: '0.15em',
            color: 'var(--aura-text-muted)',
            fontVariantNumeric: 'tabular-nums lining-nums',
          }}
        >
          <span>FOCUS.CIRCLE</span>
          <span>今日 {formatTime(todayTotal)}</span>
          <span>{streakDays > 0 ? `连续 ${streakDays} 天` : '连续 0 天'}</span>
        </footer>
      </main>
    </div>
  )
}
