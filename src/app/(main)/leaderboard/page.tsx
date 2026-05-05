'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import { useAppData, type ActiveTimer } from '@/components/AppDataContext'
import { avatarAuraGradient } from '@/lib/avatarAura'

function formatHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/** Compute extra seconds from an active timer */
function activeTimerElapsed(timer: ActiveTimer): number {
  let ms = timer.accumulated_ms
  if (timer.state === 'running') {
    ms += Date.now() - new Date(timer.started_at).getTime()
  }
  return Math.max(0, Math.floor(ms / 1000))
}

function formatNickname(rawName: string, maxLen = 6): string {
  const trimmed = rawName.trim()
  const base = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed
  if (base.length <= maxLen) return base || '匿名'
  return `${base.slice(0, maxLen)}...`
}

function SkeletonRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 0',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
      }}
    >
      <div className="w-7 h-4 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
      <div className="w-9 h-9 rounded-full animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 rounded w-2/3 animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
        <div className="h-1 rounded-full animate-pulse" style={{ background: 'rgba(0,0,0,0.06)' }} />
      </div>
      <div className="w-16 h-4 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
    </div>
  )
}

export default function LeaderboardPage() {
  const { userId, profile, leaderboard, ready, activeTimers } = useAppData()
  const [filterGoal, setFilterGoal] = useState(false)
  const [tick, setTick] = useState(0)

  const myGoal = profile?.goal || null

  // Build a map of active timers by user_id
  const timerMap = new Map(activeTimers.map(t => [t.user_id, t]))
  const hasAnyRunning = activeTimers.some(t => t.state === 'running')

  // Tick every second when anyone is actively running
  useEffect(() => {
    if (!hasAnyRunning) return
    const id = setInterval(() => setTick(v => v + 1), 1000)
    return () => clearInterval(id)
  }, [hasAnyRunning])

  // Suppress unused var warning — tick is used to trigger re-render
  void tick

  const displayData = leaderboard.map(entry => {
    const timer = timerMap.get(entry.id)
    if (timer) {
      return { ...entry, today_seconds: entry.today_seconds + activeTimerElapsed(timer), _active: true, _taskText: timer.task_text }
    }
    return { ...entry, _active: false, _taskText: null as string | null }
  })

  const sorted = [...displayData].sort((a, b) => b.today_seconds - a.today_seconds)

  const filtered = filterGoal && myGoal
    ? sorted.filter((e) => e.goal === myGoal)
    : sorted

  // Live "in focus right now" — count of active_timers rows with state='running'.
  // active_timers is transient (deleted on session end), so any 'running' row
  // is a user actively focusing. updated_at would prematurely filter genuine
  // long sessions because it only refreshes on state transitions, not while
  // the timer is running, so we don't gate on it.
  const liveFocusing = activeTimers.filter(t => t.state === 'running').length

  const containerStyle: CSSProperties = {
    '--font-serif': 'var(--aura-font-serif)',
    '--font-sans': 'var(--aura-font-sans)',
    '--font-mono': 'var(--aura-font-mono)',
    '--text-primary': 'var(--aura-text-primary)',
    '--text-secondary': 'var(--aura-text-secondary)',
    '--text-muted': 'var(--aura-text-muted)',
  } as CSSProperties

  return (
    <div style={{ background: 'var(--aura-bg-primary)', color: 'var(--aura-text-primary)' }}>
      <main
        style={{
          position: 'relative',
          maxWidth: '600px',
          margin: '0 auto',
          padding: '40px 24px 80px',
          ...(containerStyle as CSSProperties),
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 320,
            height: 320,
            background:
              'radial-gradient(circle, rgba(168, 213, 186, 0.4) 0%, rgba(168, 213, 186, 0.1) 50%, transparent 80%)',
            filter: 'blur(50px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '24px',
            paddingBottom: '20px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '40px',
                fontWeight: 400,
                color: 'var(--text-primary)',
                marginBottom: '6px',
              }}
            >
              排行榜
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                letterSpacing: '0.15em',
              }}
            >
              此刻 · {liveFocusing} 人专注中
            </p>
          </div>

          {myGoal && (
            <button
              onClick={() => setFilterGoal(!filterGoal)}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                letterSpacing: '0.18em',
                color: filterGoal ? 'var(--text-primary)' : 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${filterGoal ? 'var(--text-primary)' : 'rgba(0,0,0,0.1)'}`,
                paddingBottom: '4px',
                cursor: 'pointer',
              }}
            >
              同目标
            </button>
          )}
        </header>

        {!ready ? (
          <section>
            {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
          </section>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-14"
            style={{
              background: 'var(--aura-bg-elevated)',
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.06)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            暂无数据
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>开始专注后将出现在排行榜</div>
          </div>
        ) : (
          <section>
            {filtered.map((user, index) => {
              const rank = index + 1
              const isTop = rank === 1
              const isOwn = user.id === userId
              const targetMins = user.target_minutes || 120
              const progress = Math.min((user.today_seconds / (targetMins * 60)) * 100, 100)
              const displayName = formatNickname(user.nickname)

              return (
                <div
                  key={user.id}
                  style={{
                    position: 'relative',
                    padding: '16px 0',
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                  }}
                >
                  {isOwn && (
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        background: 'rgba(111, 169, 137, 0.7)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {isTop && (
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'radial-gradient(ellipse at left center, rgba(168, 213, 186, 0.28) 0%, transparent 60%)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        fontWeight: 400,
                        color: 'var(--text-muted)',
                        width: '32px',
                        textAlign: 'center',
                      }}
                    >
                      {rank}
                    </div>

                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: avatarAuraGradient(user.id),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-serif)',
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                        flexShrink: 0,
                      }}
                    >
                      {displayName.charAt(0) || (isOwn ? '我' : '匿')}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px', minWidth: 0 }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            maxWidth: '140px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {displayName}
                        </span>
                        {isOwn && (
                          <span
                            style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              letterSpacing: '0.1em',
                            }}
                          >
                            我
                          </span>
                        )}
                        <span
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          · {user.goal}
                        </span>
                      </div>

                      <div
                        style={{
                          height: '2px',
                          background: 'rgba(0,0,0,0.06)',
                          borderRadius: '1px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${progress}%`,
                            height: '100%',
                            background: isTop ? 'rgba(111, 169, 137, 0.85)' : 'rgba(0,0,0,0.28)',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {formatHMS(user.today_seconds)}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          marginTop: '2px',
                        }}
                      >
                        连续 {user.total_days} 天
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </section>
        )}
        </div>
      </main>
    </div>
  )
}
