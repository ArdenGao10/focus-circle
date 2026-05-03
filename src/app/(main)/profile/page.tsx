'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAppData } from '@/components/AppDataContext'
import { useTimer, useLiveElapsed } from '@/components/TimerContext'
import { Branch, Sprig } from '@/components/Botanicals'
import FocusBarChart from '@/components/FocusBarChart'
import {
  fetchSessionsSince,
  fetchCompletedTaskCount,
  bucketByDay,
  bucketByWeek,
  rangeStartISO,
  rangeStartDateKey,
  todayDateKey,
  type StatsResult,
} from '@/lib/focusStats'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function ProfileSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="bg-paper rounded-2xl border border-cream p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-cream animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-cream rounded w-24 animate-pulse" />
            <div className="h-3 bg-cream rounded w-32 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => <div key={i} className="bg-paper rounded-xl border border-cream p-3 h-16 animate-pulse" />)}
      </div>
      <div className="bg-paper rounded-2xl border border-cream h-48 animate-pulse" />
    </div>
  )
}

export default function ProfilePage() {
  const { profile, dailyTasks, pendingCount, retryPendingSessions, profileHistory, loadProfileHistory, userId } = useAppData()
  const { state: timerState } = useTimer()
  const liveElapsed = useLiveElapsed()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [statsView, setStatsView] = useState<'week' | 'month'>('week')
  const [statsResult, setStatsResult] = useState<StatsResult | null>(null)
  const [completedTasks, setCompletedTasks] = useState<number>(0)
  const [statsLoading, setStatsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadProfileHistory()
  }, [loadProfileHistory])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    async function load() {
      if (!userId) return
      setStatsLoading(true)
      const days = statsView === 'week' ? 7 : 28
      const sinceISO = rangeStartISO(days)
      const fromKey = rangeStartDateKey(days)
      const toKey = todayDateKey()
      const [sessions, taskCount] = await Promise.all([
        fetchSessionsSince(userId, sinceISO),
        fetchCompletedTaskCount(userId, fromKey, toKey),
      ])
      if (cancelled) return
      const result = statsView === 'week'
        ? bucketByDay(sessions, 7)
        : bucketByWeek(sessions, 4)
      setStatsResult(result)
      setCompletedTasks(taskCount)
      setStatsLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [statsView, userId])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  if (!profile) return <ProfileSkeleton />

  const allSessions = profileHistory || []
  const historyLoaded = profileHistory !== null

  const isTimerActive = timerState !== 'idle'
  const today = new Date().toISOString().split('T')[0]

  const targetMins = profile.target_minutes || 120
  const baseTotal = allSessions.reduce((sum, s) => sum + s.duration_seconds, 0)
  const totalSeconds = baseTotal + (isTimerActive ? liveElapsed : 0)
  const totalDays = new Set(allSessions.map(s => s.date)).size

  const sessionsByDate = allSessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.date] = (acc[s.date] || 0) + s.duration_seconds
    return acc
  }, {})
  // Add live elapsed to today's entry
  if (isTimerActive) {
    sessionsByDate[today] = (sessionsByDate[today] || 0) + liveElapsed
  }
  const dateList = Object.keys(sessionsByDate).sort((a, b) => b.localeCompare(a))
  const dateTasks = selectedDate ? dailyTasks.filter(t => t.date === selectedDate) : []

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Profile card — instant from cache */}
      <div className="relative bg-paper rounded-2xl border border-cream p-5 shadow-sm paper-texture overflow-hidden">
        <Branch className="absolute top-0 right-0 w-28 h-10 text-sage-dark" />
        <div className="absolute top-0 left-10 w-16 h-2.5 bg-butter opacity-40 -translate-y-0.5 rounded-b-sm rotate-[-1deg]" />
        <div className="flex items-center gap-4 relative">
          <div className="w-14 h-14 rounded-xl bg-sage text-paper flex items-center justify-center text-xl font-bold shadow-sm border border-sage-dark/10">
            {profile.nickname.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="font-bold text-2xl text-ink leading-tight" style={{ fontFamily: 'var(--font-display)' }}>{profile.nickname}</div>
            <div className="text-sm text-ink-light italic mt-0.5" style={{ fontFamily: 'var(--font-script)' }}>focusing on {profile.goal}</div>
            <div className="text-[11px] text-ink-light/70 mt-1">{profile.email}</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-paper rounded-xl border border-cream p-3 text-center paper-texture">
          <div className="text-2xl font-bold text-sage-dark">{historyLoaded ? totalDays : '–'}</div>
          <div className="text-xs text-ink-light mt-0.5">打卡天数</div>
        </div>
        <div className="bg-paper rounded-xl border border-cream p-3 text-center paper-texture">
          <div className="text-lg font-bold text-terracotta font-numeric">
            {historyLoaded ? formatDuration(totalSeconds) : '–'}
          </div>
          <div className="text-xs text-ink-light mt-0.5">累计时长</div>
        </div>
        <div className="bg-paper rounded-xl border border-cream p-3 text-center paper-texture">
          <div className="text-2xl font-bold text-lavender">{targetMins}</div>
          <div className="text-xs text-ink-light mt-0.5">日目标(分)</div>
        </div>
      </div>

      {/* Stats — week / month focus chart */}
      <div className="bg-paper rounded-2xl border border-cream shadow-sm overflow-hidden paper-texture">
        <div className="p-4 border-b border-cream/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprig className="w-4 h-6 text-sage-dark" />
            <h2 className="font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>学习统计</h2>
          </div>
          <div className="inline-flex bg-paper-warm rounded-full p-0.5 border border-cream">
            {(['week', 'month'] as const).map(v => (
              <button
                key={v}
                onClick={() => setStatsView(v)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  statsView === v
                    ? 'bg-sage text-paper shadow-sm'
                    : 'text-ink-light hover:text-ink'
                }`}
              >
                {v === 'week' ? '周' : '月'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {statsLoading && !statsResult ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(i => <div key={i} className="h-14 bg-cream/60 rounded-xl animate-pulse" />)}
              </div>
              <div className="h-44 bg-cream/40 rounded-xl animate-pulse" />
            </div>
          ) : !statsResult || statsResult.summary.totalSessions === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-ink-light">还没有学习记录</p>
              <p className="text-xs text-ink-light/50 mt-1">开始你的第一段专注吧 🌸</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-paper-warm rounded-xl p-2.5 text-center border border-cream/60">
                  <div className="text-lg font-bold text-sage-dark font-numeric">
                    {Math.floor(statsResult.summary.totalMinutes / 60) > 0
                      ? `${Math.floor(statsResult.summary.totalMinutes / 60)}h${statsResult.summary.totalMinutes % 60}m`
                      : `${statsResult.summary.totalMinutes}m`}
                  </div>
                  <div className="text-[10px] text-ink-light mt-0.5">{statsView === 'week' ? '本周' : '近 4 周'}总时长</div>
                </div>
                <div className="bg-paper-warm rounded-xl p-2.5 text-center border border-cream/60">
                  <div className="text-lg font-bold text-terracotta font-numeric">{completedTasks}</div>
                  <div className="text-[10px] text-ink-light mt-0.5">完成任务数</div>
                </div>
                <div className="bg-paper-warm rounded-xl p-2.5 text-center border border-cream/60">
                  <div className="text-lg font-bold text-lavender font-numeric">{statsResult.summary.avgDailyMinutes}m</div>
                  <div className="text-[10px] text-ink-light mt-0.5">日均时长</div>
                </div>
              </div>

              <FocusBarChart
                data={statsResult.buckets}
                unit={statsView === 'week' ? 'day' : 'week'}
                height={160}
              />
            </>
          )}
        </div>
      </div>

      {/* History */}
      <div className="bg-paper rounded-2xl border border-cream shadow-sm overflow-hidden paper-texture">
        <div className="p-4 border-b border-cream/60">
          <div className="flex items-center gap-2">
            <Sprig className="w-4 h-6 text-sage-dark" />
            <h2 className="font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>学习记录</h2>
          </div>
        </div>
        {!historyLoaded ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 bg-cream rounded-full" />
                <div className="h-2 bg-cream rounded flex-1 animate-pulse" />
                <div className="h-2 bg-cream rounded w-16 animate-pulse" />
              </div>
            ))}
          </div>
        ) : dateList.length === 0 ? (
          <div className="p-6 text-center text-ink-light/40 text-sm">暂无记录</div>
        ) : (
          <div className="divide-y divide-cream/40">
            {dateList.slice(0, 14).map(date => {
              const secs = sessionsByDate[date]
              const progress = Math.min((secs / (targetMins * 60)) * 100, 100)
              const isSelected = selectedDate === date

              return (
                <div key={date}>
                  <button onClick={() => setSelectedDate(isSelected ? null : date)} className="w-full flex items-center gap-3 p-3.5 hover:bg-paper-warm transition-colors text-left">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${progress >= 100 ? 'bg-sage' : 'bg-rose'}`} />
                    <span className="text-sm font-medium w-14 shrink-0 text-ink">{formatDate(date)}</span>
                    <div className="flex-1 h-1.5 bg-cream rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${progress >= 100 ? 'bg-sage' : 'bg-terracotta'}`} style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-sm font-medium text-ink w-16 text-right shrink-0">{formatDuration(secs)}</span>
                    <svg className={`w-3.5 h-3.5 text-ink-light/30 shrink-0 transition-transform ${isSelected ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isSelected && dateTasks.length > 0 && (
                    <div className="px-4 pb-3 pl-10">
                      <div className="text-xs text-ink-light mb-1.5">当日任务</div>
                      {dateTasks.map(t => (
                        <div key={t.id} className="flex items-center gap-2 py-1">
                          <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${t.completed ? 'bg-sage border-sage text-paper' : 'border-ink-light/30'}`}>
                            {t.completed && <svg className="w-1.5 h-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <span className={`text-xs ${t.completed ? 'text-ink-light/40 line-through' : 'text-ink'}`}>{t.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {isSelected && dateTasks.length === 0 && (
                    <div className="px-4 pb-3 pl-10"><span className="text-xs text-ink-light/30">当日未设置任务</span></div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {pendingCount > 0 && (
        <button
          onClick={retryPendingSessions}
          className="w-full py-3 bg-butter-light border border-butter rounded-xl text-sm text-terracotta hover:bg-butter/30 active:scale-[0.99] transition-all"
        >
          有 {pendingCount} 条记录未同步，点此重试
        </button>
      )}

      <div className="space-y-2.5">
        <button onClick={() => router.push('/onboarding')} className="w-full py-3 bg-paper border border-cream rounded-xl text-sm font-medium text-ink hover:bg-paper-warm active:scale-[0.99] transition-all">修改资料</button>
        <button onClick={() => router.push('/feedback')} className="w-full py-3 bg-paper border border-cream rounded-xl text-sm font-medium text-ink hover:bg-paper-warm active:scale-[0.99] transition-all flex items-center justify-center gap-2">
          <span>💬</span> 帮助与反馈
        </button>
        <button onClick={handleLogout} className="w-full py-3 text-rose-dark text-sm font-medium hover:bg-rose-light/20 rounded-xl transition-colors">退出登录</button>
      </div>
    </div>
  )
}
