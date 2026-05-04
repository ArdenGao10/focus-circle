'use client'

import { useState, useEffect } from 'react'
import { useAppData, type ActiveTimer } from '@/components/AppDataContext'
import { Sprig } from '@/components/Botanicals'

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

const RANK_ICONS = ['🌸', '🌿', '🍃']

function SkeletonCard() {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        background: 'var(--aura-bg-elevated)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-4 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
        <div className="w-9 h-9 rounded-full animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded w-2/3 animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
          <div className="h-1.5 rounded-full animate-pulse" style={{ background: 'rgba(0,0,0,0.06)' }} />
        </div>
        <div className="w-16 h-4 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
      </div>
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

  return (
    <div style={{ background: 'var(--aura-bg-primary)', color: 'var(--aura-text-primary)' }}>
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="relative mb-5">
          <div className="flex items-center justify-between">
            <div>
              <h1
                style={{
                  fontFamily: 'var(--aura-font-serif)',
                  fontSize: 24,
                  fontWeight: 400,
                  letterSpacing: '0.05em',
                  color: 'var(--aura-text-primary)',
                }}
              >
                排行榜
              </h1>
              <p
                style={{
                  fontFamily: 'var(--aura-font-sans)',
                  fontSize: 12,
                  color: 'var(--aura-text-muted)',
                  marginTop: 6,
                  letterSpacing: '0.08em',
                }}
              >
                everyone shows up today
              </p>
            </div>
            {myGoal && (
              <button
                onClick={() => setFilterGoal(!filterGoal)}
                style={{
                  fontFamily: 'var(--aura-font-sans)',
                  fontSize: 12,
                  letterSpacing: '0.12em',
                  color: filterGoal ? 'var(--aura-text-primary)' : 'var(--aura-text-secondary)',
                  background: filterGoal ? 'rgba(0,0,0,0.04)' : 'transparent',
                  border: `1px solid ${filterGoal ? 'var(--aura-text-primary)' : 'rgba(0,0,0,0.12)'}`,
                  borderRadius: 999,
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
              >
                同目标
              </button>
            )}
          </div>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginTop: 16 }} />
        </div>

        {!ready ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-14"
            style={{
              background: 'var(--aura-bg-elevated)',
              borderRadius: 24,
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <Sprig className="w-10 h-16 mx-auto" style={{ color: 'var(--aura-text-muted)' }} />
            <p style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 13, color: 'var(--aura-text-secondary)' }}>暂无数据</p>
            <p style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 11, color: 'var(--aura-text-muted)', marginTop: 6 }}>
              开始专注后将出现在排行榜
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((entry, i) => {
            const targetMins = entry.target_minutes || 120
            const progress = Math.min((entry.today_seconds / (targetMins * 60)) * 100, 100)
            const isMe = entry.id === userId
            const isTop3 = i < 3
            const isActive = entry._active

            return (
              <div
                key={entry.id}
                style={{
                  position: 'relative',
                  padding: 14,
                  borderRadius: 18,
                  border: `1px solid ${isMe ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.08)'}`,
                  background: isMe ? 'rgba(0,0,0,0.03)' : 'var(--aura-bg-elevated)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 text-center shrink-0">
                    {isTop3 ? (
                      <span className="text-base">{RANK_ICONS[i]}</span>
                    ) : (
                      <span style={{ fontFamily: 'var(--aura-font-mono)', fontSize: 11, color: 'var(--aura-text-muted)' }}>{i + 1}</span>
                    )}
                  </div>

                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative"
                    style={{
                      fontFamily: 'var(--aura-font-sans)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--aura-text-primary)',
                      border: '1px solid rgba(0,0,0,0.12)',
                      background: isTop3 ? 'rgba(0,0,0,0.04)' : 'transparent',
                    }}
                  >
                    {entry.nickname.charAt(0)}
                    {isActive && (
                      <span
                        className="absolute"
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--aura-green-solid)',
                          bottom: -2,
                          right: -2,
                        }}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="truncate"
                        style={{
                          fontFamily: 'var(--aura-font-sans)',
                          fontSize: 14,
                          fontWeight: isMe ? 600 : 500,
                          color: isMe ? 'var(--aura-text-primary)' : 'var(--aura-text-secondary)',
                        }}
                      >
                        {entry.nickname}
                        {isMe && (
                          <span style={{ fontSize: 11, color: 'var(--aura-text-muted)', marginLeft: 6 }}>(我)</span>
                        )}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--aura-font-mono)',
                          fontSize: 10,
                          color: 'var(--aura-text-muted)',
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: 999,
                          padding: '2px 6px',
                        }}
                      >
                        {entry.goal}
                      </span>
                    </div>

                    {isActive && entry._taskText && (
                      <div
                        className="truncate"
                        style={{
                          fontFamily: 'var(--aura-font-sans)',
                          fontSize: 12,
                          color: 'var(--aura-text-secondary)',
                          marginBottom: 6,
                        }}
                      >
                        {entry._taskText}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="flex-1" style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 999 }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${progress}%`,
                            borderRadius: 999,
                            background: progress >= 100 ? 'var(--aura-green-solid)' : 'var(--aura-warm-solid)',
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--aura-font-mono)',
                          fontSize: 11,
                          color: 'var(--aura-text-muted)',
                          width: 36,
                          textAlign: 'right',
                        }}
                      >
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-1">
                    <div
                      style={{
                        fontFamily: 'var(--aura-font-mono)',
                        fontSize: 13,
                        color: isActive ? 'var(--aura-text-primary)' : 'var(--aura-text-secondary)',
                      }}
                    >
                      {formatHMS(entry.today_seconds)}
                    </div>
                    <div style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 11, color: 'var(--aura-text-muted)' }}>
                      {entry.total_days}天
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        )}
      </div>
    </div>
  )
}
