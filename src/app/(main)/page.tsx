'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTimer, useLiveElapsed } from '@/components/TimerContext'
import { useAppData } from '@/components/AppDataContext'
import DailyTasks from '@/components/DailyTasks'
import { Leaf, Flower, Branch } from '@/components/Botanicals'

const PERSONAL_FOCUS = '个人专注'

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
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

  const sessionsTotal = displaySessions.reduce((sum, s) => sum + s.duration_seconds, 0)
  const todayTotal = sessionsTotal + elapsed
  const activeTaskName = normalizeTaskName(taskName)
  const showRecords = displaySessions.length > 0 || state !== 'idle'

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
          <div className="text-xs text-ink-light tracking-widest mb-1" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </div>

          <p className={`text-sm mb-5 px-4 py-1 rounded-full border ${
            state === 'idle'
              ? 'text-ink-light border-cream bg-butter-light'
              : state === 'running'
              ? 'text-sage-dark border-sage-light bg-sage-light/30'
              : 'text-terracotta border-terracotta-light bg-terracotta-light/30'
          }`} style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
            {state === 'idle' ? '准备开始' : state === 'running' ? (taskName ? `${taskName}` : '专注中...') : '已暂停'}
          </p>

          <div className={`text-5xl font-bold tracking-widest mb-8 font-numeric transition-colors ${
            state === 'running' ? 'text-ink' : state === 'paused' ? 'text-terracotta' : 'text-ink-light/40'
          }`} style={{ letterSpacing: '0.15em' }}>
            {formatTime(elapsed)}
          </div>

          <div className="flex items-center gap-3 w-full mb-6">
            <div className="flex-1 h-px bg-cream" />
            <Flower className="w-4 h-4 text-rose-dark opacity-40" />
            <div className="flex-1 h-px bg-cream" />
          </div>

          <div className="flex gap-3">
            {state === 'idle' && (
              <button onClick={() => start()} className="px-8 py-3 bg-sage text-paper rounded-full text-base font-medium shadow-sm hover:bg-sage-dark active:scale-95 transition-all" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
                开始专注
              </button>
            )}
            {state === 'running' && (
              <>
                <button onClick={pause} className="px-6 py-2.5 border-2 border-ink-light/30 text-ink-light rounded-full text-sm font-medium hover:border-ink-light/50 active:scale-95 transition-all">暂停</button>
                <button onClick={end} disabled={saving} className="px-6 py-2.5 bg-rose-dark text-paper rounded-full text-sm font-medium shadow-sm disabled:opacity-50 active:scale-95 transition-all">结束</button>
              </>
            )}
            {state === 'paused' && (
              <>
                <button onClick={resume} className="px-6 py-2.5 bg-sage text-paper rounded-full text-sm font-medium shadow-sm active:scale-95 transition-all">继续</button>
                <button onClick={end} disabled={saving} className="px-6 py-2.5 border-2 border-ink-light/30 text-ink-light rounded-full text-sm font-medium disabled:opacity-50 active:scale-95 transition-all">{saving ? '保存中...' : '结束'}</button>
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
            {/* Live entry for active timer */}
            {state !== 'idle' && (
              <div className="flex items-center gap-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-sage shrink-0 animate-pulse" />
                <span className="text-sm text-sage-dark flex-1 truncate font-medium">{activeTaskName}</span>
                <div className="w-14 h-1.5 bg-cream rounded-full overflow-hidden shrink-0">
                  <div className="h-full bg-sage rounded-full transition-all" style={{ width: `${Math.min((elapsed / 3600) * 100, 100)}%` }} />
                </div>
                <span className="text-xs font-medium text-sage-dark shrink-0 font-numeric w-20 text-right">{formatTime(elapsed)}</span>
              </div>
            )}
            {displaySessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-sage shrink-0" />
                <span className="text-sm text-ink flex-1 truncate">{s.taskName}</span>
                <div className="w-14 h-1.5 bg-cream rounded-full overflow-hidden shrink-0">
                  <div className="h-full bg-sage rounded-full" style={{ width: `${Math.min((s.duration_seconds / 3600) * 100, 100)}%` }} />
                </div>
                <span className="text-xs font-medium text-ink-light shrink-0 font-numeric w-20 text-right">{formatTime(s.duration_seconds)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <DailyTasks />
    </div>
  )
}
