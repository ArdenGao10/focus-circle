'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTimer, type SessionRecord } from '@/components/TimerContext'
import DailyTasks from '@/components/DailyTasks'
import { createClient } from '@/lib/supabase/client'

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m > 0 ? m + '分' : ''}`
  if (m > 0) return `${m}分钟`
  return `${seconds}秒`
}

interface LocalSession {
  id: string
  duration_seconds: number
  created_at: string
  taskName: string | null
}

export default function TimerPage() {
  const { elapsed, state, saving, taskName, start, pause, resume, end, lastSession } = useTimer()
  const [todaySessions, setTodaySessions] = useState<LocalSession[]>([])
  const fetchedRef = useRef(false)
  const router = useRouter()

  // Fetch today's sessions
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('sessions')
        .select('id, duration_seconds, created_at')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('created_at', { ascending: false })
      if (data) setTodaySessions(data.map((s: { id: string; duration_seconds: number; created_at: string }) => ({ ...s, taskName: null })))
    }
    load()
  }, [])

  // When a new session is recorded, add it to the list
  useEffect(() => {
    if (lastSession) {
      setTodaySessions(prev => [{
        id: crypto.randomUUID(),
        duration_seconds: lastSession.duration_seconds,
        created_at: lastSession.created_at,
        taskName: lastSession.taskName,
      }, ...prev])
    }
  }, [lastSession])

  function handleStart() {
    start()
    router.push('/leaderboard')
  }

  const todayTotal = todaySessions.reduce((sum, s) => sum + s.duration_seconds, 0)

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Timer section */}
      <div className="relative flex flex-col items-center pt-8 pb-6">
        {/* Decorative rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`w-56 h-56 rounded-full border-2 transition-all duration-1000 ${
            state === 'running'
              ? 'border-violet-200 animate-pulse-slow'
              : state === 'paused'
              ? 'border-amber-200'
              : 'border-gray-100'
          }`} />
          <div className={`absolute w-48 h-48 rounded-full border transition-all duration-1000 ${
            state === 'running'
              ? 'border-violet-100 animate-pulse-slow-delay'
              : 'border-transparent'
          }`} />
        </div>

        {/* Status + task name */}
        <p className={`text-sm font-medium mb-4 relative z-10 px-3 py-1 rounded-full ${
          state === 'idle'
            ? 'text-gray-400 bg-gray-50'
            : state === 'running'
            ? 'text-violet-600 bg-violet-50'
            : 'text-amber-600 bg-amber-50'
        }`}>
          {state === 'idle' ? '准备开始' : state === 'running' ? (taskName ? `专注：${taskName}` : '专注中...') : '已暂停'}
        </p>

        <div className={`text-6xl font-mono font-bold tracking-wider mb-8 tabular-nums relative z-10 transition-colors ${
          state === 'running' ? 'text-gray-900' : state === 'paused' ? 'text-amber-600' : 'text-gray-300'
        }`}>
          {formatTime(elapsed)}
        </div>

        <div className="flex gap-3 relative z-10">
          {state === 'idle' && (
            <button
              onClick={handleStart}
              className="px-8 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-full text-lg font-medium shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 active:scale-95 transition-all"
            >
              开始专注
            </button>
          )}
          {state === 'running' && (
            <>
              <button
                onClick={pause}
                className="px-6 py-3 border-2 border-gray-200 rounded-full text-base font-medium hover:border-gray-300 active:scale-95 transition-all"
              >
                暂停
              </button>
              <button
                onClick={end}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full text-base font-medium shadow-lg shadow-rose-200 disabled:opacity-50 active:scale-95 transition-all"
              >
                结束
              </button>
            </>
          )}
          {state === 'paused' && (
            <>
              <button
                onClick={resume}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-full text-base font-medium shadow-lg shadow-violet-200 active:scale-95 transition-all"
              >
                继续
              </button>
              <button
                onClick={end}
                disabled={saving}
                className="px-6 py-3 border-2 border-gray-200 rounded-full text-base font-medium disabled:opacity-50 active:scale-95 transition-all"
              >
                {saving ? '保存中...' : '结束'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Today's session records */}
      {todaySessions.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-semibold">今日专注</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-violet-50 to-purple-50 text-violet-600 font-medium">
              共 {formatDuration(todayTotal)}
            </span>
          </div>
          <div className="space-y-2">
            {todaySessions.map((s) => {
              const time = new Date(s.created_at)
              const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`
              return (
                <div key={s.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-br from-violet-400 to-purple-400 shrink-0" />
                  <span className="text-sm text-gray-700 flex-1 truncate">
                    {s.taskName || timeStr}
                  </span>
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
                    <div
                      className="h-full bg-gradient-to-r from-violet-300 to-purple-300 rounded-full"
                      style={{ width: `${Math.min((s.duration_seconds / 3600) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 shrink-0">
                    {formatDuration(s.duration_seconds)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Daily tasks */}
      <DailyTasks />
    </div>
  )
}
