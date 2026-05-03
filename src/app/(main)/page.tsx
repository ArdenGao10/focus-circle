'use client'

import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { useTimer, useLiveElapsed } from '@/components/TimerContext'
import { useAppData } from '@/components/AppDataContext'
import DailyTasks from '@/components/DailyTasks'
import { Leaf, Flower, Branch } from '@/components/Botanicals'

const PERSONAL_FOCUS = '个人专注'
const FOCUS_RING_TARGET_SECONDS = 3600

const RING_RADIUS = 45
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

type TimerVisualState = 'idle' | 'running' | 'paused'

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatRingTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60)
  const s = seconds % 60
  if (totalMinutes >= 60) {
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${totalMinutes.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function ProgressRing({
  progress,
  state,
  children,
}: {
  progress: number
  state: TimerVisualState
  children: ReactNode
}) {
  const clamped = Math.min(Math.max(progress, 0), 1)
  const offset = RING_CIRCUMFERENCE * (1 - clamped)
  const progressStroke =
    state === 'running'
      ? 'var(--sage-dark)'
      : state === 'paused'
      ? 'var(--sage)'
      : 'var(--cream)'
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 'clamp(220px, 62vw, 300px)', height: 'clamp(220px, 62vw, 300px)' }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke="var(--cream)"
          strokeWidth="3.5"
        />
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke={progressStroke}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={state === 'running' ? 'animate-ring-breathe' : ''}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
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

export default function TimerPage() {
  const { state, saving, taskName, start, pause, resume, end, lastSession } = useTimer()
  const elapsed = useLiveElapsed()
  const { todaySessions, addSession } = useAppData()
  const [localAdded, setLocalAdded] = useState<DisplaySession[]>([])
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    const welcomed = localStorage.getItem('focuscircle_welcomed')
    if (!welcomed) setShowWelcome(true)
  }, [])

  // When a session ends, add to local + cache
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

  // Merge cached sessions + locally added (dedup by id)
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
  const ringProgress = state === 'idle' ? 0 : Math.min(elapsed / FOCUS_RING_TARGET_SECONDS, 1)
  const ringTaskLabel = isActive ? (taskName?.trim() || '自由专注') : ''

  // Check if the active task already has a historical row
  const activeHasHistory = isActive && displaySessions.some(s => s.taskName === activeTaskName)

  const sessionsTotal = displaySessions.reduce((sum, s) => sum + s.duration_seconds, 0)

  // Cumulative total refreshes every 5s
  const [totalElapsed, setTotalElapsed] = useState(0)
  useEffect(() => {
    if (!isActive) { setTotalElapsed(0); return }
    setTotalElapsed(elapsed)
    const interval = setInterval(() => setTotalElapsed(prev => prev + 5), 5000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])
  useEffect(() => { if (!isActive) setTotalElapsed(0) }, [isActive])

  const todayTotal = sessionsTotal + (isActive ? totalElapsed : 0)
  const showRecords = displaySessions.length > 0 || isActive

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {showWelcome && todaySessions.length === 0 && (
        <div className="relative bg-lavender-light/30 rounded-2xl border border-lavender-light p-4 shadow-sm">
          <button
            onClick={() => { setShowWelcome(false); localStorage.setItem('focuscircle_welcomed', 'true') }}
            className="absolute top-3 right-3 text-ink-light/40 hover:text-ink-light transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0 mt-0.5">🌸</span>
            <div>
              <p className="text-sm font-semibold text-ink mb-1" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>欢迎来到专注圈！</p>
              <p className="text-xs text-ink-light leading-relaxed">
                试试先在下面设一个今天要做的事，然后点「开始专注」，用正计时记录你真实的投入。不设倒计时、不设打卡天数，你学多久算多久。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timer card */}
      <div className="relative bg-paper rounded-2xl border border-cream shadow-sm overflow-hidden paper-texture">
        <Leaf className="absolute top-3 right-4 w-8 h-12 text-sage-dark animate-sway" />
        <Flower className="absolute top-6 left-5 w-8 h-8 text-rose" style={{ animationDelay: '1s' }} />
        <Branch className="absolute bottom-0 left-0 w-32 h-10 text-sage-dark opacity-60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-3 bg-sage-light opacity-50 -translate-y-1 rounded-b-sm" />

        <div className="flex flex-col items-center pt-10 pb-8 px-6">
          <div className="text-xs text-ink-light tracking-widest mb-2" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </div>

          <p
            className={`text-sm mb-5 min-h-[1.25rem] truncate max-w-[18rem] text-center transition-colors ${
              state === 'running' ? 'text-sage-dark' : state === 'paused' ? 'text-terracotta' : 'text-ink-light'
            }`}
            style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}
          >
            {ringTaskLabel}
          </p>

          <ProgressRing progress={ringProgress} state={state}>
            <div
              className={`font-bold font-numeric transition-colors ${
                state === 'running' ? 'text-ink' : state === 'paused' ? 'text-terracotta' : 'text-ink-light/40'
              }`}
              style={{ fontSize: 'clamp(2.25rem, 9vw, 3rem)', letterSpacing: '0.08em' }}
            >
              {formatRingTime(elapsed)}
            </div>
          </ProgressRing>

          <div className="flex items-center gap-3 w-full mt-7 mb-5">
            <div className="flex-1 h-px bg-cream" />
            <Flower className="w-4 h-4 text-rose-dark opacity-40" />
            <div className="flex-1 h-px bg-cream" />
          </div>

          <div className="flex gap-3 items-center">
            {state === 'idle' && (
              <button onClick={() => start()} className="px-8 py-3 bg-sage text-paper rounded-full text-base font-medium shadow-sm hover:bg-sage-dark active:scale-95 transition-all" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
                开始专注
              </button>
            )}
            {state === 'running' && (
              <>
                <button onClick={pause} className="px-8 py-3 bg-sage text-paper rounded-full text-base font-medium shadow-sm hover:bg-sage-dark active:scale-95 transition-all" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
                  暂停
                </button>
                <button onClick={end} disabled={saving} className="px-5 py-2.5 border border-ink-light/30 text-ink-light rounded-full text-sm font-medium hover:border-ink-light/50 active:scale-95 transition-all disabled:opacity-50">
                  {saving ? '保存中...' : '结束'}
                </button>
              </>
            )}
            {state === 'paused' && (
              <>
                <button onClick={resume} className="px-8 py-3 bg-sage text-paper rounded-full text-base font-medium shadow-sm hover:bg-sage-dark active:scale-95 transition-all" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
                  继续
                </button>
                <button onClick={end} disabled={saving} className="px-5 py-2.5 border border-ink-light/30 text-ink-light rounded-full text-sm font-medium hover:border-ink-light/50 active:scale-95 transition-all disabled:opacity-50">
                  {saving ? '保存中...' : '结束'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Today's session records */}
      {showRecords && (
        <div className="relative bg-paper rounded-2xl border border-cream p-4 shadow-sm paper-texture">
          <div className="absolute top-0 right-8 w-16 h-3 bg-lavender-light opacity-50 -translate-y-1 rounded-b-sm rotate-1" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-ink" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>今日记录</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-sage-light/40 text-sage-dark font-numeric">共 {formatTime(todayTotal)}</span>
          </div>
          <div className="space-y-2">
            {/* Live-only row: only when active task has no historical session */}
            {isActive && !activeHasHistory && (
              <div className="flex items-center gap-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-sage shrink-0 animate-pulse" />
                <span className="text-sm text-sage-dark flex-1 truncate font-medium">{activeTaskName}</span>
                <div className="w-14 h-1.5 bg-cream rounded-full overflow-hidden shrink-0">
                  <div className="h-full bg-sage rounded-full transition-all" style={{ width: `${Math.min((elapsed / 3600) * 100, 100)}%` }} />
                </div>
                <span className="text-xs font-medium text-sage-dark shrink-0 font-numeric w-20 text-right">{formatTime(elapsed)}</span>
              </div>
            )}
            {displaySessions.map((s) => {
              const isLive = isActive && s.taskName === activeTaskName
              const totalSec = isLive ? s.duration_seconds + elapsed : s.duration_seconds
              return (
                <div key={s.id} className="flex items-center gap-3 py-1.5">
                  <div className={`w-2 h-2 rounded-full bg-sage shrink-0 ${isLive ? 'animate-pulse' : ''}`} />
                  <span className={`text-sm flex-1 truncate ${isLive ? 'text-sage-dark font-medium' : 'text-ink'}`}>{s.taskName}</span>
                  <div className="w-14 h-1.5 bg-cream rounded-full overflow-hidden shrink-0">
                    <div className="h-full bg-sage rounded-full transition-all" style={{ width: `${Math.min((totalSec / 3600) * 100, 100)}%` }} />
                  </div>
                  <span className={`text-xs font-medium shrink-0 font-numeric w-20 text-right ${isLive ? 'text-sage-dark' : 'text-ink-light'}`}>{formatTime(totalSec)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <DailyTasks />
    </div>
  )
}
