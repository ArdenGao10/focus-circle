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

interface AppData {
  ready: boolean
  userId: string | null
  profile: Profile | null
  leaderboard: LeaderboardEntry[]
  todaySessions: SessionRecord[]
  dailyTasks: DailyTask[]
  refreshLeaderboard: () => Promise<void>
  addSession: (s: SessionRecord) => void
  setDailyTasks: React.Dispatch<React.SetStateAction<DailyTask[]>>
}

const AppDataContext = createContext<AppData>({
  ready: false,
  userId: null,
  profile: null,
  leaderboard: [],
  todaySessions: [],
  dailyTasks: [],
  refreshLeaderboard: async () => {},
  addSession: () => {},
  setDailyTasks: () => {},
})

export function useAppData() {
  return useContext(AppDataContext)
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [todaySessions, setTodaySessions] = useState<SessionRecord[]>([])
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([])
  const initRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
  }, [])

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
    }

    init()

    intervalRef.current = setInterval(fetchLeaderboard, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchLeaderboard])

  return (
    <AppDataContext.Provider value={{
      ready,
      userId,
      profile,
      leaderboard,
      todaySessions,
      dailyTasks,
      refreshLeaderboard: fetchLeaderboard,
      addSession,
      setDailyTasks,
    }}>
      {children}
    </AppDataContext.Provider>
  )
}
