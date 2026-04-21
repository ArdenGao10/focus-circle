'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Profile {
  nickname: string
  goal: string
  email: string
  target_minutes?: number
}

interface SessionRecord {
  id: string
  duration_seconds: number
  date: string
}

interface DailyTask {
  id: string
  title: string
  completed: boolean
  date: string
}

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

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [totalDays, setTotalDays] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const router = useRouter()
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch profile - try with target_minutes, fall back without
      let profileData: Profile | null = null
      const { data: p1, error: pErr } = await supabase
        .from('profiles')
        .select('nickname, goal, email, target_minutes')
        .eq('id', user.id)
        .single()

      if (pErr) {
        // target_minutes column might not exist
        const { data: p2 } = await supabase
          .from('profiles')
          .select('nickname, goal, email')
          .eq('id', user.id)
          .single()
        if (p2) profileData = { ...p2, target_minutes: 120 }
      } else if (p1) {
        profileData = p1
      }

      if (profileData) setProfile(profileData)

      // Fetch sessions
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id, duration_seconds, date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(50)

      if (sessionData) {
        setSessions(sessionData)
        setTotalSeconds(sessionData.reduce((sum: number, s: { duration_seconds: number }) => sum + s.duration_seconds, 0))
        setTotalDays(new Set(sessionData.map((s: { date: string }) => s.date)).size)
      }

      // Fetch tasks (may not exist)
      const { data: taskData } = await supabase
        .from('daily_tasks')
        .select('id, title, completed, date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(100)

      if (taskData) setTasks(taskData)
    }
    load()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  if (!profile) {
    return (
      <div className="p-6 flex justify-center">
        <div className="w-8 h-8 border-2 border-violet-300 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const targetMins = profile.target_minutes || 120

  // Group sessions by date
  const sessionsByDate = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.date] = (acc[s.date] || 0) + s.duration_seconds
    return acc
  }, {})

  const dateList = Object.keys(sessionsByDate).sort((a, b) => b.localeCompare(a))

  // Get tasks for selected date
  const dateTasks = selectedDate ? tasks.filter(t => t.date === selectedDate) : []

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-violet-200">
          {profile.nickname.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="font-bold text-lg">{profile.nickname}</div>
          <div className="text-sm text-gray-400">{profile.email}</div>
          <div className="mt-1">
            <span className="text-xs px-2.5 py-0.5 bg-violet-50 text-violet-600 rounded-full font-medium">
              {profile.goal}
            </span>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-3 text-center">
          <div className="text-2xl font-bold text-violet-700">{totalDays}</div>
          <div className="text-xs text-violet-400 mt-0.5">打卡天数</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">
            {totalSeconds >= 3600 ? `${Math.floor(totalSeconds / 3600)}h` : `${Math.floor(totalSeconds / 60)}m`}
          </div>
          <div className="text-xs text-blue-400 mt-0.5">累计时长</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-3 text-center">
          <div className="text-2xl font-bold text-emerald-700">{targetMins}</div>
          <div className="text-xs text-emerald-400 mt-0.5">日目标(分)</div>
        </div>
      </div>

      {/* Session history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <h2 className="font-semibold">学习记录</h2>
        </div>
        {dateList.length === 0 ? (
          <div className="p-6 text-center text-gray-300 text-sm">暂无记录</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {dateList.slice(0, 14).map(date => {
              const secs = sessionsByDate[date]
              const progress = Math.min((secs / (targetMins * 60)) * 100, 100)
              const isSelected = selectedDate === date

              return (
                <div key={date}>
                  <button
                    onClick={() => setSelectedDate(isSelected ? null : date)}
                    className="w-full flex items-center gap-3 p-3.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      progress >= 100 ? 'bg-emerald-400' : 'bg-violet-300'
                    }`} />
                    <span className="text-sm font-medium w-16 shrink-0">{formatDate(date)}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          progress >= 100
                            ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                            : 'bg-gradient-to-r from-violet-400 to-purple-400'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-16 text-right shrink-0">
                      {formatDuration(secs)}
                    </span>
                    <svg className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${isSelected ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isSelected && dateTasks.length > 0 && (
                    <div className="px-4 pb-3 pl-10">
                      <div className="text-xs text-gray-400 mb-1.5">当日任务</div>
                      {dateTasks.map(t => (
                        <div key={t.id} className="flex items-center gap-2 py-1">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            t.completed
                              ? 'bg-emerald-400 border-emerald-400 text-white'
                              : 'border-gray-300'
                          }`}>
                            {t.completed && (
                              <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-xs ${t.completed ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                            {t.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {isSelected && dateTasks.length === 0 && (
                    <div className="px-4 pb-3 pl-10">
                      <span className="text-xs text-gray-300">当日未设置任务</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2.5">
        <button
          onClick={() => router.push('/onboarding')}
          className="w-full py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-100 active:scale-[0.99] transition-all"
        >
          修改资料
        </button>
        <button
          onClick={handleLogout}
          className="w-full py-3 text-red-400 text-sm font-medium hover:bg-red-50 rounded-xl transition-colors"
        >
          退出登录
        </button>
      </div>
    </div>
  )
}
