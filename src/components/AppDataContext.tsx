'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  nickname: string
  goal: string
  email: string
  target_minutes: number
}

interface LeaderboardEntry {
  id: string
  nickname: string
  goal: string
  target_minutes?: number
  total_days: number
  today_seconds: number
}

interface SessionRecord {
  id: string
  duration_seconds: number
  created_at: string
  task_name?: string | null
}

interface DailyTask {
  id: string
  title: string
  completed: boolean
  date: string
}

export interface SquarePost {
  id: string
  title: string
  content: string
  link: string | null
  created_at: string
  nickname: string
  goal: string
}

interface HistorySession {
  id: string
  duration_seconds: number
  date: string
}

export interface ActiveTimer {
  user_id: string
  started_at: string
  accumulated_ms: number
  state: 'running' | 'paused'
  task_text: string | null
  updated_at: string
}

interface AppData {
  ready: boolean
  userId: string | null
  profile: Profile | null
  leaderboard: LeaderboardEntry[]
  todaySessions: SessionRecord[]
  dailyTasks: DailyTask[]
  pendingCount: number
  refreshLeaderboard: () => Promise<void>
  addSession: (s: SessionRecord) => void
  setDailyTasks: React.Dispatch<React.SetStateAction<DailyTask[]>>
  retryPendingSessions: () => Promise<void>
  // Square posts cache
  squarePosts: SquarePost[] | null
  loadSquarePosts: (force?: boolean) => Promise<void>
  setSquarePosts: React.Dispatch<React.SetStateAction<SquarePost[] | null>>
  // Profile history cache
  profileHistory: HistorySession[] | null
  loadProfileHistory: (force?: boolean) => Promise<void>
  // Active timers (realtime)
  activeTimers: ActiveTimer[]
}

const AppDataContext = createContext<AppData>({
  ready: false,
  userId: null,
  profile: null,
  leaderboard: [],
  todaySessions: [],
  dailyTasks: [],
  pendingCount: 0,
  refreshLeaderboard: async () => {},
  addSession: () => {},
  setDailyTasks: () => {},
  retryPendingSessions: async () => {},
  squarePosts: null,
  loadSquarePosts: async () => {},
  setSquarePosts: () => {},
  profileHistory: null,
  loadProfileHistory: async () => {},
  activeTimers: [],
})

export function useAppData() {
  return useContext(AppDataContext)
}

const PENDING_KEY = 'focuscircle_pending_sessions'

interface PendingSession {
  duration_seconds: number
  date: string
  task_name: string
  created_at: string
  userId: string
}

function getPendingSessions(): PendingSession[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
  } catch { return [] }
}

function setPendingSessionsStorage(sessions: PendingSession[]) {
  try {
    if (sessions.length === 0) localStorage.removeItem(PENDING_KEY)
    else localStorage.setItem(PENDING_KEY, JSON.stringify(sessions))
  } catch { /* ignore */ }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [todaySessions, setTodaySessions] = useState<SessionRecord[]>([])
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [squarePosts, setSquarePosts] = useState<SquarePost[] | null>(null)
  const [profileHistory, setProfileHistory] = useState<HistorySession[] | null>(null)
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([])
  const squareLoadedAtRef = useRef(0)
  const historyLoadedAtRef = useRef(0)
  const initRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const fetchLeaderboard = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('leaderboard')
      .select('*')
      .order('today_seconds', { ascending: false })
      .limit(30)
    if (data) setLeaderboard(data)
  }, [])

  const addSession = useCallback((s: SessionRecord) => {
    setTodaySessions(prev => [s, ...prev])
    // Also update profile history if loaded
    const historyEntry: HistorySession = {
      id: s.id,
      duration_seconds: s.duration_seconds,
      date: new Date(s.created_at).toISOString().split('T')[0],
    }
    setProfileHistory(prev => prev === null ? null : [historyEntry, ...prev].slice(0, 50))
  }, [])

  const retryPendingSessions = useCallback(async () => {
    const pending = getPendingSessions()
    if (pending.length === 0) return

    const supabase = createClient()
    const remaining: PendingSession[] = []

    for (const s of pending) {
      try {
        const { error } = await supabase.from('sessions').insert({
          user_id: s.userId,
          duration_seconds: s.duration_seconds,
          date: s.date,
          task_name: s.task_name,
        })
        if (error) {
          remaining.push(s)
        }
      } catch {
        remaining.push(s)
      }
    }

    setPendingSessionsStorage(remaining)
    setPendingCount(remaining.length)
  }, [])

  const CACHE_TTL = 60_000

  const loadSquarePostsFn = useCallback(async (force = false) => {
    if (!userId) return
    if (!force && squarePosts !== null && (Date.now() - squareLoadedAtRef.current) < CACHE_TTL) return

    const supabase = createClient()
    const { data } = await supabase
      .from('posts')
      .select('id, title, content, link, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      const userIds = [...new Set(data.map((p: { user_id: string }) => p.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname, goal')
        .in('id', userIds)

      const profileMap = new Map(profiles?.map((p: { id: string; nickname: string; goal: string }) => [p.id, p]) || [])

      const enriched: SquarePost[] = data.map((p: { id: string; title: string; content: string; link: string | null; created_at: string; user_id: string }) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        link: p.link,
        created_at: p.created_at,
        nickname: (profileMap.get(p.user_id) as { nickname: string; goal: string } | undefined)?.nickname || '匿名',
        goal: (profileMap.get(p.user_id) as { nickname: string; goal: string } | undefined)?.goal || '',
      }))

      setSquarePosts(enriched)
      squareLoadedAtRef.current = Date.now()
    }
  }, [userId, squarePosts])

  const loadProfileHistoryFn = useCallback(async (force = false) => {
    if (!userId) return
    if (!force && profileHistory !== null && (Date.now() - historyLoadedAtRef.current) < CACHE_TTL) return

    const supabase = createClient()
    const { data } = await supabase.from('sessions').select('id, duration_seconds, date')
      .eq('user_id', userId).order('date', { ascending: false }).limit(50)

    if (data) {
      setProfileHistory(data as HistorySession[])
      historyLoadedAtRef.current = Date.now()
    }
  }, [userId, profileHistory])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    async function init() {
      // 1. Auth + leaderboard in parallel
      const [userRes] = await Promise.all([
        supabase.auth.getUser(),
        fetchLeaderboard(),
      ])

      const user = userRes.data.user
      if (!user) { setReady(true); return }
      setUserId(user.id)

      // 2. Profile + sessions + tasks in parallel
      const [profileRes, sessionsRes, tasksRes] = await Promise.all([
        supabase.from('profiles').select('nickname, goal, email, target_minutes').eq('id', user.id).single(),
        // Try with task_name first
        supabase.from('sessions').select('id, duration_seconds, created_at, task_name')
          .eq('user_id', user.id).eq('date', today).order('created_at', { ascending: false }),
        supabase.from('daily_tasks').select('id, title, completed, date')
          .eq('user_id', user.id).eq('date', today).order('created_at'),
      ])

      // Profile
      if (profileRes.data) {
        setProfile(profileRes.data)
      } else {
        // Fallback without target_minutes
        const { data: p2 } = await supabase.from('profiles').select('nickname, goal, email').eq('id', user.id).single()
        if (p2) setProfile({ ...p2, target_minutes: 120 })
      }

      // Sessions
      if (sessionsRes.data) {
        setTodaySessions(sessionsRes.data)
      } else {
        // Fallback without task_name
        const { data: fallback } = await supabase.from('sessions').select('id, duration_seconds, created_at')
          .eq('user_id', user.id).eq('date', today).order('created_at', { ascending: false })
        if (fallback) setTodaySessions(fallback)
      }

      // Tasks
      if (tasksRes.data) setDailyTasks(tasksRes.data)

      setReady(true)

      // Load active timers
      const { data: timers } = await supabase
        .from('active_timers')
        .select('*')
      if (timers) setActiveTimers(timers as ActiveTimer[])

      // Subscribe to realtime changes on active_timers
      const channel = supabase
        .channel('active_timers_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'active_timers' },
          (payload: { eventType: string; old: Record<string, unknown>; new: Record<string, unknown> }) => {
            if (payload.eventType === 'DELETE') {
              const old = payload.old as { user_id?: string }
              if (old.user_id) {
                setActiveTimers(prev => prev.filter(t => t.user_id !== old.user_id))
              }
            } else {
              // INSERT or UPDATE
              const row = payload.new as unknown as ActiveTimer
              setActiveTimers(prev => {
                const idx = prev.findIndex(t => t.user_id === row.user_id)
                if (idx >= 0) {
                  const next = [...prev]
                  next[idx] = row
                  return next
                }
                return [...prev, row]
              })
            }
          }
        )
        .subscribe()

      channelRef.current = channel

      // Auto-retry pending sessions
      const pending = getPendingSessions()
      setPendingCount(pending.length)
      if (pending.length > 0) {
        retryPendingSessions()
      }
    }

    init()

    intervalRef.current = setInterval(fetchLeaderboard, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (channelRef.current) channelRef.current.unsubscribe()
    }
  }, [fetchLeaderboard, retryPendingSessions])

  return (
    <AppDataContext.Provider value={{
      ready,
      userId,
      profile,
      leaderboard,
      todaySessions,
      dailyTasks,
      pendingCount,
      refreshLeaderboard: fetchLeaderboard,
      addSession,
      setDailyTasks,
      retryPendingSessions,
      squarePosts,
      loadSquarePosts: loadSquarePostsFn,
      setSquarePosts,
      profileHistory,
      loadProfileHistory: loadProfileHistoryFn,
      activeTimers,
    }}>
      {children}
    </AppDataContext.Provider>
  )
}
