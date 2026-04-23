'use client'

import { createContext, useContext, useState, useRef, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

const PERSONAL_FOCUS = '个人专注'
const LS_KEY = 'focuscircle_active_timer'
const HEARTBEAT_INTERVAL = 5000 // 5 seconds
const AUTO_RECOVER_THRESHOLD = 2 * 60 * 1000 // 2 minutes
const PROMPT_RECOVER_THRESHOLD = 8 * 60 * 60 * 1000 // 8 hours

type TimerState = 'idle' | 'running' | 'paused'

interface PersistedTimer {
  state: 'running' | 'paused'
  startTime: number
  accumulatedMs: number
  taskName: string | null
  userId: string
  lastUpdateAt: number
}

export interface SessionRecord {
  duration_seconds: number
  date: string
  created_at: string
  taskName: string | null
}

interface RecoveryInfo {
  elapsedSeconds: number
  taskName: string | null
}

interface TimerContextType {
  state: TimerState
  saving: boolean
  taskName: string | null
  lastSession: SessionRecord | null
  tickerKey: number
  recovery: RecoveryInfo | null
  getElapsed: () => number
  start: (taskName?: string) => void
  pause: () => void
  resume: () => void
  end: () => Promise<void>
  clearLastSession: () => void
  recoverAndContinue: () => void
  recoverAndSave: () => Promise<void>
  recoverDiscard: () => void
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
  } catch { /* quota exceeded — silently ignore */ }
}

function clearPersisted() {
  try {
    localStorage.removeItem(LS_KEY)
  } catch { /* ignore */ }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>('idle')
  const [saving, setSaving] = useState(false)
  const [taskName, setTaskName] = useState<string | null>(null)
  const [lastSession, setLastSession] = useState<SessionRecord | null>(null)
  const [tickerKey, setTickerKey] = useState(0)
  const [recovery, setRecovery] = useState<RecoveryInfo | null>(null)
  const startTimeRef = useRef<number>(0)
  const accumulatedMsRef = useRef<number>(0)
  const userIdRef = useRef<string | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const initRef = useRef(false)

  const bumpTicker = useCallback(() => {
    setTickerKey((v) => v + 1)
  }, [])

  const getElapsed = useCallback(() => {
    const accSec = Math.floor(accumulatedMsRef.current / 1000)
    if (state !== 'running') return accSec
    return accSec + Math.floor((Date.now() - startTimeRef.current) / 1000)
  }, [state])

  // --- Persist to localStorage ---
  const persist = useCallback((s: 'running' | 'paused') => {
    if (!userIdRef.current) return
    const accMs = s === 'running'
      ? accumulatedMsRef.current
      : accumulatedMsRef.current + (Date.now() - startTimeRef.current)

    writePersisted({
      state: s,
      startTime: startTimeRef.current,
      accumulatedMs: s === 'paused' ? accMs : accumulatedMsRef.current,
      taskName: taskName,
      userId: userIdRef.current,
      lastUpdateAt: Date.now(),
    })
  }, [taskName])

  // --- Heartbeat: update lastUpdateAt every 5s while running ---
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    heartbeatRef.current = setInterval(() => {
      const existing = readPersisted()
      if (existing) {
        existing.lastUpdateAt = Date.now()
        writePersisted(existing)
      }
    }, HEARTBEAT_INTERVAL)
  }, [])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  // --- Timer actions ---
  const start = useCallback((name?: string) => {
    setLastSession(null)
    setTaskName(name || null)
    accumulatedMsRef.current = 0
    startTimeRef.current = Date.now()
    setState('running')
    bumpTicker()

    // persist
    if (userIdRef.current) {
      writePersisted({
        state: 'running',
        startTime: Date.now(),
        accumulatedMs: 0,
        taskName: name || null,
        userId: userIdRef.current,
        lastUpdateAt: Date.now(),
      })
    }
    startHeartbeat()
  }, [bumpTicker, startHeartbeat])

  const pause = useCallback(() => {
    if (state !== 'running') return
    const nowAccMs = accumulatedMsRef.current + (Date.now() - startTimeRef.current)
    accumulatedMsRef.current = nowAccMs
    setState('paused')
    bumpTicker()
    stopHeartbeat()

    // persist
    if (userIdRef.current) {
      writePersisted({
        state: 'paused',
        startTime: startTimeRef.current,
        accumulatedMs: nowAccMs,
        taskName,
        userId: userIdRef.current,
        lastUpdateAt: Date.now(),
      })
    }
  }, [state, bumpTicker, taskName, stopHeartbeat])

  const resume = useCallback(() => {
    if (state !== 'paused') return
    startTimeRef.current = Date.now()
    setState('running')
    bumpTicker()
    startHeartbeat()

    // persist
    if (userIdRef.current) {
      writePersisted({
        state: 'running',
        startTime: Date.now(),
        accumulatedMs: accumulatedMsRef.current,
        taskName,
        userId: userIdRef.current,
        lastUpdateAt: Date.now(),
      })
    }
  }, [state, bumpTicker, taskName, startHeartbeat])

  const end = useCallback(async () => {
    const finalElapsed = getElapsed()
    stopHeartbeat()

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
      // Save to pending sessions for later retry (Task 2 will enhance this)
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

    setSaving(false)
    clearPersisted()
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
  }, [getElapsed, taskName, bumpTicker, stopHeartbeat])

  const clearLastSession = useCallback(() => setLastSession(null), [])

  // --- Recovery actions (user responds to recovery prompt) ---
  const recoverAndContinue = useCallback(() => {
    const persisted = readPersisted()
    if (!persisted) { setRecovery(null); return }

    // Restore state — timer keeps running from where it left off
    accumulatedMsRef.current = persisted.state === 'paused'
      ? persisted.accumulatedMs
      : persisted.accumulatedMs + (Date.now() - persisted.lastUpdateAt)
    // Use lastUpdateAt as approximate resume point since JS was dead between then and now
    // For paused: accumulated is exact. For running: we count up to lastUpdateAt (last heartbeat).
    // The gap between lastUpdateAt and now is lost time — we don't count it.

    startTimeRef.current = Date.now()
    setTaskName(persisted.taskName)
    setState('running')
    bumpTicker()
    startHeartbeat()
    setRecovery(null)

    // Update persisted
    if (userIdRef.current) {
      writePersisted({
        state: 'running',
        startTime: Date.now(),
        accumulatedMs: accumulatedMsRef.current,
        taskName: persisted.taskName,
        userId: userIdRef.current,
        lastUpdateAt: Date.now(),
      })
    }
  }, [bumpTicker, startHeartbeat])

  const recoverAndSave = useCallback(async () => {
    const persisted = readPersisted()
    if (!persisted) { setRecovery(null); return }

    // Calculate total elapsed up to lastUpdateAt
    let totalMs = persisted.accumulatedMs
    if (persisted.state === 'running') {
      totalMs += persisted.lastUpdateAt - persisted.startTime
    }
    const totalSec = Math.floor(totalMs / 1000)

    if (totalSec < 1) {
      clearPersisted()
      setRecovery(null)
      return
    }

    const dateStr = new Date(persisted.startTime).toISOString().split('T')[0]
    const normalizedTaskName = persisted.taskName?.trim() || PERSONAL_FOCUS

    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        await sb.from('sessions').insert({
          user_id: user.id,
          duration_seconds: totalSec,
          date: dateStr,
          task_name: normalizedTaskName,
        })
      }
    } catch { /* will be caught by pending sessions in Task 2 */ }

    clearPersisted()
    setRecovery(null)
    setLastSession({
      duration_seconds: totalSec,
      date: dateStr,
      created_at: new Date().toISOString(),
      taskName: normalizedTaskName,
    })
  }, [])

  const recoverDiscard = useCallback(() => {
    clearPersisted()
    setRecovery(null)
  }, [])

  // --- Init: check for persisted timer on mount ---
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    async function checkRecovery() {
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

      const timeSinceLastUpdate = Date.now() - persisted.lastUpdateAt

      // Calculate total elapsed
      let totalMs = persisted.accumulatedMs
      if (persisted.state === 'running') {
        totalMs += persisted.lastUpdateAt - persisted.startTime
      }
      const totalSec = Math.floor(totalMs / 1000)

      if (totalSec < 1) {
        clearPersisted()
        return
      }

      if (timeSinceLastUpdate >= PROMPT_RECOVER_THRESHOLD) {
        // >= 8 hours: zombie data, discard
        clearPersisted()
        return
      }

      if (timeSinceLastUpdate < AUTO_RECOVER_THRESHOLD) {
        // < 2 minutes: auto-recover silently
        accumulatedMsRef.current = persisted.accumulatedMs
        if (persisted.state === 'running') {
          // Add time from startTime to lastUpdateAt (not to now — gap is untracked)
          accumulatedMsRef.current = persisted.accumulatedMs + (persisted.lastUpdateAt - persisted.startTime)
          startTimeRef.current = Date.now()
          setState('running')
          startHeartbeat()
        } else {
          // paused
          setState('paused')
        }
        setTaskName(persisted.taskName)
        bumpTicker()

        // Update persisted with fresh timestamp
        writePersisted({
          ...persisted,
          accumulatedMs: accumulatedMsRef.current,
          startTime: persisted.state === 'running' ? Date.now() : persisted.startTime,
          lastUpdateAt: Date.now(),
        })
        return
      }

      // 2 min ~ 8 hours: prompt user
      setRecovery({
        elapsedSeconds: totalSec,
        taskName: persisted.taskName,
      })
    }

    checkRecovery()
  }, [bumpTicker, startHeartbeat])

  // Track userId changes
  useEffect(() => {
    // Update userId ref when AppDataContext provides it
    // This is handled in init, but we also need it for start() calls
  }, [])

  // Cleanup heartbeat on unmount
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [])

  const value = useMemo(() => ({
    state,
    saving,
    taskName,
    lastSession,
    tickerKey,
    recovery,
    getElapsed,
    start,
    pause,
    resume,
    end,
    clearLastSession,
    recoverAndContinue,
    recoverAndSave,
    recoverDiscard,
  }), [state, saving, taskName, lastSession, tickerKey, recovery, getElapsed, start, pause, resume, end, clearLastSession, recoverAndContinue, recoverAndSave, recoverDiscard])

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  )
}
