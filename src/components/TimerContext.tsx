'use client'

import { createContext, useContext, useState, useRef, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

const PERSONAL_FOCUS = '个人专注'
const LS_KEY = 'focuscircle_active_timer'
const ZOMBIE_THRESHOLD_MS = 12 * 60 * 60 * 1000 // 12 hours
const ZOMBIE_CAP_SECONDS = 12 * 60 * 60 // cap saved duration at 12h

type TimerState = 'idle' | 'running' | 'paused'

interface PersistedTimer {
  state: 'running' | 'paused'
  startTime: number      // absolute timestamp when current running segment began
  accumulatedMs: number   // ms accumulated from previous segments (before pause/resume)
  taskName: string | null
  userId: string
}

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
  state: TimerState
  saving: boolean
  taskName: string | null
  lastSession: SessionRecord | null
  tickerKey: number
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
  const { state, tickerKey, getElapsed } = useTimer()
  const [elapsed, setElapsed] = useState(() => getElapsed())

  useEffect(() => {
    setElapsed(getElapsed())
    if (state !== 'running') return

    const id = setInterval(() => {
      setElapsed(getElapsed())
    }, 1000)

    return () => clearInterval(id)
  }, [state, tickerKey, getElapsed])

  return elapsed
}

// --- localStorage helpers ---

function readPersisted(): PersistedTimer | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writePersisted(data: PersistedTimer) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  } catch { /* quota exceeded */ }
}

function clearPersisted() {
  try {
    localStorage.removeItem(LS_KEY)
  } catch { /* ignore */ }
}

/** Calculate total elapsed ms from persisted data */
function calcElapsedMs(p: PersistedTimer): number {
  if (p.state === 'paused') return p.accumulatedMs
  return p.accumulatedMs + (Date.now() - p.startTime)
}

/** Fire-and-forget upsert/update/delete to active_timers. Never blocks the main flow. */
async function syncActiveTimer(
  userId: string,
  action: 'upsert' | 'delete',
  payload?: { state: 'running' | 'paused'; started_at: string; accumulated_ms: number; task_text: string | null },
) {
  try {
    const sb = createClient()
    if (action === 'delete') {
      const { error } = await sb.from('active_timers').delete().eq('user_id', userId)
      if (error) console.error('[syncActiveTimer] delete error:', error)
    } else if (payload) {
      const { error } = await sb.from('active_timers').upsert({
        user_id: userId,
        state: payload.state,
        started_at: payload.started_at,
        accumulated_ms: payload.accumulated_ms,
        task_text: payload.task_text,
        updated_at: new Date().toISOString(),
      })
      if (error) console.error('[syncActiveTimer] upsert error:', error)
    }
  } catch (err) {
    console.error('[syncActiveTimer]', action, err)
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>('idle')
  const [saving, setSaving] = useState(false)
  const [taskName, setTaskName] = useState<string | null>(null)
  const [lastSession, setLastSession] = useState<SessionRecord | null>(null)
  const [tickerKey, setTickerKey] = useState(0)
  const [zombie, setZombie] = useState<ZombieInfo | null>(null)
  const startTimeRef = useRef<number>(0)
  const accumulatedMsRef = useRef<number>(0)
  const userIdRef = useRef<string | null>(null)
  const initRef = useRef(false)

  const bumpTicker = useCallback(() => setTickerKey(v => v + 1), [])

  // elapsed = accumulatedMs (in seconds) + live running segment
  const getElapsed = useCallback(() => {
    const accSec = Math.floor(accumulatedMsRef.current / 1000)
    if (state !== 'running') return accSec
    return accSec + Math.floor((Date.now() - startTimeRef.current) / 1000)
  }, [state])

  // --- Timer actions ---

  const start = useCallback((name?: string) => {
    setLastSession(null)
    const now = Date.now()
    setTaskName(name || null)
    accumulatedMsRef.current = 0
    startTimeRef.current = now
    setState('running')
    bumpTicker()

    console.log('[Timer.start] userIdRef:', userIdRef.current)
    if (userIdRef.current) {
      writePersisted({
        state: 'running',
        startTime: now,
        accumulatedMs: 0,
        taskName: name || null,
        userId: userIdRef.current,
      })
      syncActiveTimer(userIdRef.current, 'upsert', {
        state: 'running',
        started_at: new Date(now).toISOString(),
        accumulated_ms: 0,
        task_text: name || null,
      })
    }
  }, [bumpTicker])

  const pause = useCallback(() => {
    if (state !== 'running') return
    const nowAccMs = accumulatedMsRef.current + (Date.now() - startTimeRef.current)
    accumulatedMsRef.current = nowAccMs
    setState('paused')
    bumpTicker()

    if (userIdRef.current) {
      writePersisted({
        state: 'paused',
        startTime: 0,
        accumulatedMs: nowAccMs,
        taskName,
        userId: userIdRef.current,
      })
      syncActiveTimer(userIdRef.current, 'upsert', {
        state: 'paused',
        started_at: new Date().toISOString(),
        accumulated_ms: nowAccMs,
        task_text: taskName,
      })
    }
  }, [state, bumpTicker, taskName])

  const resume = useCallback(() => {
    if (state !== 'paused') return
    const now = Date.now()
    startTimeRef.current = now
    setState('running')
    bumpTicker()

    if (userIdRef.current) {
      writePersisted({
        state: 'running',
        startTime: now,
        accumulatedMs: accumulatedMsRef.current,
        taskName,
        userId: userIdRef.current,
      })
      syncActiveTimer(userIdRef.current, 'upsert', {
        state: 'running',
        started_at: new Date(now).toISOString(),
        accumulated_ms: accumulatedMsRef.current,
        task_text: taskName,
      })
    }
  }, [state, bumpTicker, taskName])

  const end = useCallback(async () => {
    const finalElapsed = getElapsed()

    if (finalElapsed < 1) {
      setState('idle')
      accumulatedMsRef.current = 0
      setTaskName(null)
      clearPersisted()
      bumpTicker()
      return
    }

    setSaving(true)
    const dateStr = new Date().toISOString().split('T')[0]
    const normalizedTaskName = taskName?.trim() ? taskName.trim() : PERSONAL_FOCUS
    let saveSuccess = false

    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const result = await sb.from('sessions').insert({
          user_id: user.id,
          duration_seconds: finalElapsed,
          date: dateStr,
          task_name: normalizedTaskName,
        })

        if (result.error && (result.error.code === '42703' || result.error.message?.includes('task_name'))) {
          const fallback = await sb.from('sessions').insert({
            user_id: user.id,
            duration_seconds: finalElapsed,
            date: dateStr,
          })
          saveSuccess = !fallback.error
        } else {
          saveSuccess = !result.error
        }
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
          userId: userIdRef.current,
        })
        localStorage.setItem('focuscircle_pending_sessions', JSON.stringify(pending))
      } catch { /* ignore */ }
    }

    // Only clear localStorage AFTER successful save (or pending fallback)
    clearPersisted()
    if (userIdRef.current) syncActiveTimer(userIdRef.current, 'delete')
    setSaving(false)
    setLastSession({
      duration_seconds: finalElapsed,
      date: dateStr,
      created_at: new Date().toISOString(),
      taskName: normalizedTaskName,
    })
    setState('idle')
    accumulatedMsRef.current = 0
    setTaskName(null)
    bumpTicker()
  }, [getElapsed, taskName, bumpTicker])

  const clearLastSession = useCallback(() => setLastSession(null), [])

  // --- Zombie session actions (only shown when elapsed > 12h) ---

  const zombieSave = useCallback(async () => {
    const persisted = readPersisted()
    if (!persisted) { setZombie(null); return }

    const dateStr = new Date(persisted.startTime).toISOString().split('T')[0]
    const normalizedTaskName = persisted.taskName?.trim() || PERSONAL_FOCUS

    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        await sb.from('sessions').insert({
          user_id: user.id,
          duration_seconds: ZOMBIE_CAP_SECONDS,
          date: dateStr,
          task_name: normalizedTaskName,
        })
      }
    } catch { /* pending sessions will catch it */ }

    clearPersisted()
    setZombie(null)
    setLastSession({
      duration_seconds: ZOMBIE_CAP_SECONDS,
      date: dateStr,
      created_at: new Date().toISOString(),
      taskName: normalizedTaskName,
    })
  }, [])

  const zombieDiscard = useCallback(() => {
    clearPersisted()
    setZombie(null)
  }, [])

  const zombieContinue = useCallback(() => {
    const persisted = readPersisted()
    if (!persisted) { setZombie(null); return }

    // Restore as-is — user genuinely wants to continue
    accumulatedMsRef.current = persisted.accumulatedMs
    startTimeRef.current = persisted.startTime
    setTaskName(persisted.taskName)
    setState(persisted.state)
    bumpTicker()
    setZombie(null)
  }, [bumpTicker])

  // --- Init: restore from localStorage on mount ---
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    async function restore() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      userIdRef.current = user.id

      const persisted = readPersisted()
      if (!persisted) return

      // Cross-user isolation
      if (persisted.userId !== user.id) {
        clearPersisted()
        return
      }

      const elapsedMs = calcElapsedMs(persisted)
      const elapsedSec = Math.floor(elapsedMs / 1000)

      if (elapsedSec < 1) {
        clearPersisted()
        return
      }

      // Zombie check: > 12 hours → prompt user
      if (elapsedMs > ZOMBIE_THRESHOLD_MS) {
        setZombie({
          elapsedSeconds: elapsedSec,
          taskName: persisted.taskName,
        })
        return
      }

      // Normal restore — seamless, no dialog
      accumulatedMsRef.current = persisted.accumulatedMs
      if (persisted.state === 'running') {
        startTimeRef.current = persisted.startTime
        setState('running')
      } else {
        setState('paused')
      }
      setTaskName(persisted.taskName)
      bumpTicker()
    }

    restore()
  }, [bumpTicker])

  const value = useMemo(() => ({
    state,
    saving,
    taskName,
    lastSession,
    tickerKey,
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
  }), [state, saving, taskName, lastSession, tickerKey, zombie, getElapsed, start, pause, resume, end, clearLastSession, zombieSave, zombieDiscard, zombieContinue])

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  )
}
