'use client'

import { createContext, useContext, useState, useRef, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppData, type ActiveTimer } from './AppDataContext'

const PERSONAL_FOCUS = '个人专注'
const ZOMBIE_THRESHOLD_MS = 12 * 60 * 60 * 1000
const ZOMBIE_CAP_SECONDS = 12 * 60 * 60

type TimerState = 'idle' | 'running' | 'paused'

export interface SessionRecord {
  duration_seconds: number
  date: string
  created_at: string
  taskName: string | null
}

interface ZombieInfo {
  elapsedSeconds: number
  taskName: string | null
}

interface TimerContextType {
  /** Effective state: derived from server (active_timers) */
  state: TimerState
  saving: boolean
  taskName: string | null
  lastSession: SessionRecord | null
  zombie: ZombieInfo | null
  getElapsed: () => number
  start: (taskName?: string) => void
  pause: () => void
  resume: () => void
  end: () => Promise<void>
  clearLastSession: () => void
  zombieSave: () => Promise<void>
  zombieDiscard: () => void
  zombieContinue: () => void
}

const TimerContext = createContext<TimerContextType | null>(null)

export function useTimer() {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer must be inside TimerProvider')
  return ctx
}

export function useLiveElapsed() {
  const { state, getElapsed } = useTimer()
  const [elapsed, setElapsed] = useState(() => getElapsed())

  useEffect(() => {
    setElapsed(getElapsed())
    if (state !== 'running') return
    const id = setInterval(() => setElapsed(getElapsed()), 1000)
    return () => clearInterval(id)
  }, [state, getElapsed])

  return elapsed
}

/** Compute elapsed seconds from an ActiveTimer record (server time as truth) */
function computeElapsed(timer: ActiveTimer): number {
  let ms = timer.accumulated_ms
  if (timer.state === 'running') {
    ms += Date.now() - new Date(timer.started_at).getTime()
  }
  return Math.max(0, Math.floor(ms / 1000))
}

/** Fire-and-forget write to active_timers */
async function syncActiveTimer(
  userId: string,
  action: 'upsert' | 'delete',
  payload?: { state: 'running' | 'paused'; started_at: string; accumulated_ms: number; task_text: string | null },
) {
  try {
    const sb = createClient()
    if (action === 'delete') {
      await sb.from('active_timers').delete().eq('user_id', userId)
    } else if (payload) {
      await sb.from('active_timers').upsert({
        user_id: userId,
        state: payload.state,
        started_at: payload.started_at,
        accumulated_ms: payload.accumulated_ms,
        task_text: payload.task_text,
        updated_at: new Date().toISOString(),
      })
    }
  } catch {
    // Never block timer UX
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const { activeTimers, userId } = useAppData()
  const [saving, setSaving] = useState(false)
  const [lastSession, setLastSession] = useState<SessionRecord | null>(null)
  const [zombie, setZombie] = useState<ZombieInfo | null>(null)

  // The server record for current user — this is the single source of truth
  const myActiveTimer = activeTimers.find(t => t.user_id === userId) ?? null
  const prevTimerRef = useRef<ActiveTimer | null>(null)

  // Tick counter to force re-render every second when running
  const [, setTick] = useState(0)
  useEffect(() => {
    if (myActiveTimer?.state !== 'running') return
    const id = setInterval(() => setTick(v => v + 1), 1000)
    return () => clearInterval(id)
  }, [myActiveTimer?.state, myActiveTimer?.started_at])

  // Derive state from server record
  const state: TimerState = myActiveTimer ? myActiveTimer.state : 'idle'
  const taskName = myActiveTimer?.task_text ?? null

  const getElapsed = useCallback(() => {
    if (!myActiveTimer) return 0
    return computeElapsed(myActiveTimer)
  }, [myActiveTimer])

  // --- Zombie detection: if active_timer has been running > 12h ---
  useEffect(() => {
    if (!myActiveTimer) return
    const elapsedMs = myActiveTimer.accumulated_ms +
      (myActiveTimer.state === 'running' ? Date.now() - new Date(myActiveTimer.started_at).getTime() : 0)
    if (elapsedMs > ZOMBIE_THRESHOLD_MS && !zombie) {
      setZombie({
        elapsedSeconds: Math.floor(elapsedMs / 1000),
        taskName: myActiveTimer.task_text,
      })
    }
  }, [myActiveTimer, zombie])

  // --- Timer actions (write to server, Realtime updates all devices) ---

  const start = useCallback((name?: string) => {
    if (!userId) return
    setLastSession(null)
    const now = new Date()
    syncActiveTimer(userId, 'upsert', {
      state: 'running',
      started_at: now.toISOString(),
      accumulated_ms: 0,
      task_text: name || null,
    })
  }, [userId])

  const pause = useCallback(() => {
    if (!userId || !myActiveTimer || myActiveTimer.state !== 'running') return
    const accMs = computeElapsed(myActiveTimer) * 1000
    syncActiveTimer(userId, 'upsert', {
      state: 'paused',
      started_at: myActiveTimer.started_at,
      accumulated_ms: accMs,
      task_text: myActiveTimer.task_text,
    })
  }, [userId, myActiveTimer])

  const resume = useCallback(() => {
    if (!userId || !myActiveTimer || myActiveTimer.state !== 'paused') return
    syncActiveTimer(userId, 'upsert', {
      state: 'running',
      started_at: new Date().toISOString(),
      accumulated_ms: myActiveTimer.accumulated_ms,
      task_text: myActiveTimer.task_text,
    })
  }, [userId, myActiveTimer])

  const end = useCallback(async () => {
    if (!userId) return
    const finalElapsed = myActiveTimer ? computeElapsed(myActiveTimer) : 0

    if (finalElapsed < 1) {
      syncActiveTimer(userId, 'delete')
      return
    }

    setSaving(true)
    const dateStr = new Date().toISOString().split('T')[0]
    const normalizedTaskName = myActiveTimer?.task_text?.trim() || PERSONAL_FOCUS
    let saveSuccess = false

    try {
      const sb = createClient()
      const result = await sb.from('sessions').insert({
        user_id: userId,
        duration_seconds: finalElapsed,
        date: dateStr,
        task_name: normalizedTaskName,
      })

      if (result.error && (result.error.code === '42703' || result.error.message?.includes('task_name'))) {
        const fallback = await sb.from('sessions').insert({
          user_id: userId,
          duration_seconds: finalElapsed,
          date: dateStr,
        })
        saveSuccess = !fallback.error
      } else {
        saveSuccess = !result.error
      }
    } catch {
      saveSuccess = false
    }

    if (!saveSuccess) {
      try {
        const pending = JSON.parse(localStorage.getItem('focuscircle_pending_sessions') || '[]')
        pending.push({
          duration_seconds: finalElapsed,
          date: dateStr,
          task_name: normalizedTaskName,
          created_at: new Date().toISOString(),
          userId,
        })
        localStorage.setItem('focuscircle_pending_sessions', JSON.stringify(pending))
      } catch { /* ignore */ }
    }

    // Delete active timer — Realtime will update all devices
    syncActiveTimer(userId, 'delete')
    setSaving(false)
    setLastSession({
      duration_seconds: finalElapsed,
      date: dateStr,
      created_at: new Date().toISOString(),
      taskName: normalizedTaskName,
    })
  }, [userId, myActiveTimer])

  const clearLastSession = useCallback(() => setLastSession(null), [])

  // --- Zombie actions ---

  const zombieSave = useCallback(async () => {
    if (!userId || !myActiveTimer) { setZombie(null); return }

    const dateStr = new Date(myActiveTimer.started_at).toISOString().split('T')[0]
    const normalizedTaskName = myActiveTimer.task_text?.trim() || PERSONAL_FOCUS

    try {
      const sb = createClient()
      await sb.from('sessions').insert({
        user_id: userId,
        duration_seconds: ZOMBIE_CAP_SECONDS,
        date: dateStr,
        task_name: normalizedTaskName,
      })
    } catch { /* pending sessions will catch it */ }

    syncActiveTimer(userId, 'delete')
    setZombie(null)
    setLastSession({
      duration_seconds: ZOMBIE_CAP_SECONDS,
      date: dateStr,
      created_at: new Date().toISOString(),
      taskName: normalizedTaskName,
    })
  }, [userId, myActiveTimer])

  const zombieDiscard = useCallback(() => {
    if (userId) syncActiveTimer(userId, 'delete')
    setZombie(null)
  }, [userId])

  const zombieContinue = useCallback(() => {
    // Just dismiss the zombie dialog — timer continues from server state
    setZombie(null)
  }, [])

  // --- Migrate: clear old localStorage timer on first load ---
  useEffect(() => {
    try { localStorage.removeItem('focuscircle_active_timer') } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    prevTimerRef.current = myActiveTimer
  }, [myActiveTimer])

  const value = useMemo(() => ({
    state,
    saving,
    taskName,
    lastSession,
    zombie,
    getElapsed,
    start,
    pause,
    resume,
    end,
    clearLastSession,
    zombieSave,
    zombieDiscard,
    zombieContinue,
  }), [state, saving, taskName, lastSession, zombie, getElapsed, start, pause, resume, end, clearLastSession, zombieSave, zombieDiscard, zombieContinue])

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  )
}
