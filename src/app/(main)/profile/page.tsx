'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAppData } from '@/components/AppDataContext'
import { Branch, Sprig } from '@/components/Botanicals'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m > 0 ? m + '分' : ''}`
  if (m > 0) return `${m}分钟`
  return `${seconds}秒`
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
  const { ready, userId, profile, dailyTasks } = useAppData()
  const [allSessions, setAllSessions] = useState<{ id: string; duration_seconds: number; date: string }[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const router = useRouter()
  const fetchedRef = useRef(false)

  // Only fetch ALL sessions history (not just today) — this is profile-specific
  useEffect(() => {
    if (fetchedRef.current || !userId) return
    fetchedRef.current = true

    const supabase = createClient()
    async function load() {
      const { data } = await supabase.from('sessions').select('id, duration_seconds, date')
        .eq('user_id', userId).order('date', { ascending: false }).limit(50)
      if (data) setAllSessions(data as { id: string; duration_seconds: number; date: string }[])
      setHistoryLoaded(true)
    }
    load()
  }, [userId])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  if (!profile) return <ProfileSkeleton />

  const targetMins = profile.target_minutes || 120
  const totalSeconds = allSessions.reduce((sum, s) => sum + s.duration_seconds, 0)
  const totalDays = new Set(allSessions.map(s => s.date)).size

  const sessionsByDate = allSessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.date] = (acc[s.date] || 0) + s.duration_seconds
    return acc
  }, {})
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
            <div className="font-bold text-lg text-ink" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>{profile.nickname}</div>
            <div className="text-xs text-ink-light">{profile.email}</div>
            <div className="mt-1">
              <span className="text-xs px-2 py-0.5 bg-sage-light/30 text-sage-dark rounded border border-sage-light">{profile.goal}</span>
            </div>
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
          <div className="text-2xl font-bold text-terracotta">
            {historyLoaded ? (totalSeconds >= 3600 ? `${Math.floor(totalSeconds / 3600)}h` : `${Math.floor(totalSeconds / 60)}m`) : '–'}
          </div>
          <div className="text-xs text-ink-light mt-0.5">累计时长</div>
        </div>
        <div className="bg-paper rounded-xl border border-cream p-3 text-center paper-texture">
          <div className="text-2xl font-bold text-lavender">{targetMins}</div>
          <div className="text-xs text-ink-light mt-0.5">日目标(分)</div>
        </div>
      </div>

      {/* History */}
      <div className="bg-paper rounded-2xl border border-cream shadow-sm overflow-hidden paper-texture">
        <div className="p-4 border-b border-cream/60">
          <div className="flex items-center gap-2">
            <Sprig className="w-4 h-6 text-sage-dark" />
            <h2 className="font-semibold text-ink" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>学习记录</h2>
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

      <div className="space-y-2.5">
        <button onClick={() => router.push('/onboarding')} className="w-full py-3 bg-paper border border-cream rounded-xl text-sm font-medium text-ink hover:bg-paper-warm active:scale-[0.99] transition-all">修改资料</button>
        <button onClick={handleLogout} className="w-full py-3 text-rose-dark text-sm font-medium hover:bg-rose-light/20 rounded-xl transition-colors">退出登录</button>
      </div>
    </div>
  )
}
