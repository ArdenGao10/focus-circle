'use client'

import { createContext, useContext, useState, useRef, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

const PERSONAL_FOCUS = '个人专注'

type TimerState = 'idle' | 'running' | 'paused'

export interface SessionRecord {
  duration_seconds: number
  date: string
  created_at: string
  taskName: string | null
}

interface TimerContextType {
  state: TimerState
  saving: boolean
  taskName: string | null
  lastSession: SessionRecord | null
  tickerKey: number
  getElapsed: () => number
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

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>('idle')
  const [saving, setSaving] = useState(false)
  const [taskName, setTaskName] = useState<string | null>(null)
  const [lastSession, setLastSession] = useState<SessionRecord | null>(null)
  const [tickerKey, setTickerKey] = useState(0)
  const startTimeRef = useRef<number>(0)
  const accumulatedRef = useRef<number>(0)

  const bumpTicker = useCallback(() => {
    setTickerKey((v) => v + 1)
  }, [])

  const getElapsed = useCallback(() => {
    if (state !== 'running') return accumulatedRef.current
    return accumulatedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000)
  }, [state])

  const start = useCallback((name?: string) => {
    setLastSession(null)
    setTaskName(name || null)
    accumulatedRef.current = 0
    startTimeRef.current = Date.now()
    setState('running')
    bumpTicker()
  }, [bumpTicker])

  const pause = useCallback(() => {
    if (state !== 'running') return
    accumulatedRef.current = getElapsed()
    setState('paused')
    bumpTicker()
  }, [state, getElapsed, bumpTicker])

  const resume = useCallback(() => {
    if (state !== 'paused') return
    startTimeRef.current = Date.now()
    setState('running')
    bumpTicker()
  }, [state, bumpTicker])

  const end = useCallback(async () => {
    const finalElapsed = getElapsed()

    if (finalElapsed < 1) {
      setState('idle')
      accumulatedRef.current = 0
      setTaskName(null)
      bumpTicker()
      return
    }

    setSaving(true)
    const dateStr = new Date().toISOString().split('T')[0]
    const normalizedTaskName = taskName?.trim() ? taskName.trim() : PERSONAL_FOCUS
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      const withTaskName = await sb.from('sessions').insert({
        user_id: user.id,
        duration_seconds: finalElapsed,
        date: dateStr,
        task_name: normalizedTaskName,
      })

      if (withTaskName.error && (withTaskName.error.code === '42703' || withTaskName.error.message?.includes('task_name'))) {
        await sb.from('sessions').insert({
          user_id: user.id,
          duration_seconds: finalElapsed,
          date: dateStr,
        })
      }
    }
    setSaving(false)
    setLastSession({
      duration_seconds: finalElapsed,
      date: dateStr,
      created_at: new Date().toISOString(),
      taskName: normalizedTaskName,
    })
    setState('idle')
    accumulatedRef.current = 0
    setTaskName(null)
    bumpTicker()
  }, [getElapsed, taskName, bumpTicker])

  const clearLastSession = useCallback(() => setLastSession(null), [])

  const value = useMemo(() => ({
    state,
    saving,
    taskName,
    lastSession,
    tickerKey,
    getElapsed,
    start,
    pause,
    resume,
    end,
    clearLastSession,
  }), [state, saving, taskName, lastSession, tickerKey, getElapsed, start, pause, resume, end, clearLastSession])

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  )
}
