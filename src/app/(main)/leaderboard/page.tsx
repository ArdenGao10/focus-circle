'use client'

import { useState, useEffect } from 'react'
import { useAppData, type ActiveTimer } from '@/components/AppDataContext'
import { Sprig, Flower } from '@/components/Botanicals'

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

const RANK_COLORS = [
  'bg-butter text-terracotta border-butter',
  'bg-sage-light text-sage-dark border-sage-light',
  'bg-rose-light text-rose-dark border-rose-light',
]

const RANK_ICONS = ['🌸', '🌿', '🍃']

function SkeletonCard() {
  return (
    <div className="p-3.5 rounded-xl bg-paper border border-cream">
      <div className="flex items-center gap-3">
        <div className="w-7 h-4 bg-cream rounded animate-pulse" />
        <div className="w-9 h-9 rounded-full bg-cream animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-cream rounded w-2/3 animate-pulse" />
          <div className="h-1.5 bg-cream rounded-full animate-pulse" />
        </div>
        <div className="w-16 h-4 bg-cream rounded animate-pulse" />
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
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="relative mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              排行榜
            </h1>
            <p className="text-sm text-ink-light italic mt-0.5" style={{ fontFamily: 'var(--font-script)' }}>where everyone shows up today</p>
          </div>
          {myGoal && (
            <button
              onClick={() => setFilterGoal(!filterGoal)}
              className={`text-sm px-4 py-1.5 rounded-full border transition-all active:scale-95 ${
                filterGoal
                  ? 'bg-sage text-paper border-sage'
                  : 'border-sage-light text-ink-light hover:border-sage'
              }`}
            >
              同目标
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-px bg-cream" />
          <Flower className="w-3 h-3 text-rose opacity-50" />
          <div className="w-8 h-px bg-cream" />
          <Flower className="w-2 h-2 text-sage opacity-40" />
          <div className="flex-1 h-px bg-cream" />
        </div>
      </div>

      {!ready ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-paper rounded-2xl border border-cream">
          <Sprig className="w-10 h-16 mx-auto text-sage mb-2" />
          <p className="text-ink-light">暂无数据</p>
          <p className="text-xs text-ink-light/50 mt-1">开始专注后将出现在排行榜</p>
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
                className={`relative p-3.5 rounded-xl transition-all paper-texture ${
                  isMe
                    ? 'bg-butter-light border-2 border-butter shadow-sm'
                    : 'bg-paper border border-cream hover:shadow-sm'
                }`}
              >
                {isTop3 && (
                  <div className={`absolute -top-1.5 left-6 w-12 h-2.5 rounded-sm opacity-50 ${
                    i === 0 ? 'bg-butter rotate-[-2deg]' : i === 1 ? 'bg-sage-light rotate-[1deg]' : 'bg-rose-light rotate-[-1deg]'
                  }`} />
                )}

                <div className="flex items-center gap-3">
                  <div className="w-7 text-center shrink-0">
                    {isTop3 ? (
                      <span className="text-base">{RANK_ICONS[i]}</span>
                    ) : (
                      <span className="text-xs font-bold text-ink-light/40">{i + 1}</span>
                    )}
                  </div>

                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border relative ${
                    isTop3 ? RANK_COLORS[i] : 'bg-paper-warm text-ink-light border-cream'
                  }`}>
                    {entry.nickname.charAt(0)}
                    {isActive && (
                      <span className="absolute w-2.5 h-2.5 bg-sage rounded-full border-2 border-paper -bottom-0.5 -right-0.5 animate-pulse" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-sm truncate ${isMe ? 'font-bold text-terracotta' : 'font-medium text-ink'}`}>
                        {entry.nickname}
                        {isMe && <span className="text-xs text-terracotta/60 ml-1">(我)</span>}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 bg-cream/60 text-ink-light rounded shrink-0">
                        {entry.goal}
                      </span>
                    </div>

                    {isActive && entry._taskText && (
                      <div className="text-xs text-sage-dark mb-1 truncate italic">{entry._taskText}</div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-cream rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            progress >= 100 ? 'bg-sage' : progress >= 50 ? 'bg-terracotta' : 'bg-rose'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-ink-light/50 shrink-0 font-numeric w-8 text-right">
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-1">
                    <div className={`text-sm font-bold font-numeric ${isActive ? 'text-sage-dark' : 'text-ink'}`}>
                      {formatHMS(entry.today_seconds)}
                    </div>
                    <div className="text-xs text-ink-light/50">{entry.total_days}天</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
