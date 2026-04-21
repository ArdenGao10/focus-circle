'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

type TimerState = 'idle' | 'running' | 'paused'

export interface SessionRecord {
  duration_seconds: number
  date: string
  created_at: string
  taskName: string | null
}

interface TimerContextType {
  elapsed: number
  state: TimerState
  saving: boolean
  taskName: string | null
  lastSession: SessionRecord | null
  start: (taskName?: string) => void
  pause: () => void
  resume: () => void
  end: () => Promise<void>
  clearLastSession: () => void
}

const TimerContext = createContext<TimerContextType | null>(null)

export function useTimer() {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer must be inside TimerProvider')
  return ctx
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [elapsed, setElapsed] = useState(0)
  const [state, setState] = useState<TimerState>('idle')
  const [saving, setSaving] = useState(false)
  const [taskName, setTaskName] = useState<string | null>(null)
  const [lastSession, setLastSession] = useState<SessionRecord | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const accumulatedRef = useRef<number>(0)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startInterval = useCallback(() => {
    clearTimer()
    startTimeRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      const total = accumulatedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsed(total)
    }, 200)
  }, [clearTimer])

  const start = useCallback((name?: string) => {
    setLastSession(null)
    setTaskName(name || null)
    accumulatedRef.current = 0
    setElapsed(0)
    setState('running')
    startInterval()
  }, [startInterval])

  const pause = useCallback(() => {
    clearTimer()
    accumulatedRef.current = elapsed
    setState('paused')
  }, [clearTimer, elapsed])

  const resume = useCallback(() => {
    setState('running')
    startInterval()
  }, [startInterval])

  const end = useCallback(async () => {
    clearTimer()
    const finalElapsed = accumulatedRef.current + (state === 'running' ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0)

    if (finalElapsed < 1) {
      setState('idle')
      setElapsed(0)
      setTaskName(null)
      return
    }

    setSaving(true)
    const dateStr = new Date().toISOString().split('T')[0]
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      await sb.from('sessions').insert({
        user_id: user.id,
        duration_seconds: finalElapsed,
        date: dateStr,
      })
    }
    const currentTaskName = taskName
    setSaving(false)
    setLastSession({
      duration_seconds: finalElapsed,
      date: dateStr,
      created_at: new Date().toISOString(),
      taskName: currentTaskName,
    })
    setState('idle')
    setElapsed(0)
    accumulatedRef.current = 0
    setTaskName(null)
  }, [clearTimer, state, taskName])

  const clearLastSession = useCallback(() => setLastSession(null), [])

  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  return (
    <TimerContext.Provider value={{ elapsed, state, saving, taskName, lastSession, start, pause, resume, end, clearLastSession }}>
      {children}
    </TimerContext.Provider>
  )
}
