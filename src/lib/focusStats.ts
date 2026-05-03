import { createClient } from '@/lib/supabase/client'

export interface RawSession {
  duration_seconds: number
  created_at: string
  source?: string | null
}

export interface StatsBucket {
  key: string
  label: string
  minutes: number
  sessionCount: number
}

export interface StatsSummary {
  totalMinutes: number
  totalSessions: number
  avgDailyMinutes: number
  rangeDays: number
}

export interface StatsResult {
  buckets: StatsBucket[]
  summary: StatsSummary
}

const localDateKey = (() => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return (date: Date) => fmt.format(date)
})()

function startOfLocalWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function fetchSessionsSince(userId: string, sinceISO: string): Promise<RawSession[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('sessions')
    .select('duration_seconds, created_at, source')
    .eq('user_id', userId)
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data as RawSession[]
}

export async function fetchCompletedTaskCount(userId: string, fromDateKey: string, toDateKey: string): Promise<number> {
  const sb = createClient()
  const { count } = await sb
    .from('daily_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('date', fromDateKey)
    .lte('date', toDateKey)
  return count ?? 0
}

export function bucketByDay(sessions: RawSession[], days: number, today: Date = new Date()): StatsResult {
  const buckets: StatsBucket[] = []
  const map = new Map<string, StatsBucket>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = localDateKey(d)
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    const b: StatsBucket = { key, label, minutes: 0, sessionCount: 0 }
    buckets.push(b)
    map.set(key, b)
  }

  let totalSeconds = 0
  let totalSessions = 0
  for (const s of sessions) {
    const key = localDateKey(new Date(s.created_at))
    const target = map.get(key)
    if (!target) continue
    target.minutes += s.duration_seconds / 60
    target.sessionCount += 1
    totalSeconds += s.duration_seconds
    totalSessions += 1
  }

  for (const b of buckets) b.minutes = Math.round(b.minutes)
  return {
    buckets,
    summary: {
      totalMinutes: Math.round(totalSeconds / 60),
      totalSessions,
      avgDailyMinutes: Math.round(totalSeconds / 60 / days),
      rangeDays: days,
    },
  }
}

export function bucketByWeek(sessions: RawSession[], weeks: number, today: Date = new Date()): StatsResult {
  const currentMonday = startOfLocalWeek(today)
  const buckets: StatsBucket[] = []
  const map = new Map<string, StatsBucket>()
  for (let i = weeks - 1; i >= 0; i--) {
    const wStart = new Date(currentMonday)
    wStart.setDate(wStart.getDate() - i * 7)
    const wEnd = new Date(wStart)
    wEnd.setDate(wEnd.getDate() + 6)
    const key = localDateKey(wStart)
    const label = `${wStart.getMonth() + 1}/${wStart.getDate()}-${wEnd.getMonth() + 1}/${wEnd.getDate()}`
    const b: StatsBucket = { key, label, minutes: 0, sessionCount: 0 }
    buckets.push(b)
    map.set(key, b)
  }

  let totalSeconds = 0
  let totalSessions = 0
  for (const s of sessions) {
    const sMonday = startOfLocalWeek(new Date(s.created_at))
    const key = localDateKey(sMonday)
    const target = map.get(key)
    if (!target) continue
    target.minutes += s.duration_seconds / 60
    target.sessionCount += 1
    totalSeconds += s.duration_seconds
    totalSessions += 1
  }

  for (const b of buckets) b.minutes = Math.round(b.minutes)
  const rangeDays = weeks * 7
  return {
    buckets,
    summary: {
      totalMinutes: Math.round(totalSeconds / 60),
      totalSessions,
      avgDailyMinutes: Math.round(totalSeconds / 60 / rangeDays),
      rangeDays,
    },
  }
}

export function rangeStartISO(days: number, today: Date = new Date()): string {
  const start = startOfLocalDay(today)
  start.setDate(start.getDate() - (days - 1))
  return start.toISOString()
}

export function rangeStartDateKey(days: number, today: Date = new Date()): string {
  const start = startOfLocalDay(today)
  start.setDate(start.getDate() - (days - 1))
  return localDateKey(start)
}

export function todayDateKey(today: Date = new Date()): string {
  return localDateKey(today)
}
