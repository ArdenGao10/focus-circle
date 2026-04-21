'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTimer, type SessionRecord } from '@/components/TimerContext'
import DailyTasks from '@/components/DailyTasks'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Flower, Branch } from '@/components/Botanicals'

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
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Timer card - journal page style */}
      <div className="relative bg-paper rounded-2xl border border-cream shadow-sm overflow-hidden paper-texture">
        {/* Decorative botanicals */}
        <Leaf className="absolute top-3 right-4 w-8 h-12 text-sage-dark animate-sway" />
        <Flower className="absolute top-6 left-5 w-8 h-8 text-rose" style={{ animationDelay: '1s' }} />
        <Branch className="absolute bottom-0 left-0 w-32 h-10 text-sage-dark opacity-60" />

        {/* Washi tape top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-3 bg-sage-light opacity-50 -translate-y-1 rounded-b-sm" />

        <div className="flex flex-col items-center pt-10 pb-8 px-6">
          {/* Date header */}
          <div className="text-xs text-ink-light tracking-widest mb-1" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </div>

          {/* Status */}
          <p className={`text-sm mb-5 px-4 py-1 rounded-full border ${
            state === 'idle'
              ? 'text-ink-light border-cream bg-butter-light'
              : state === 'running'
              ? 'text-sage-dark border-sage-light bg-sage-light/30'
              : 'text-terracotta border-terracotta-light bg-terracotta-light/30'
          }`} style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
            {state === 'idle' ? '准备开始' : state === 'running' ? (taskName ? `${taskName}` : '专注中...') : '已暂停'}
          </p>

          {/* Timer display */}
          <div className={`text-5xl font-bold tracking-widest mb-8 tabular-nums transition-colors ${
            state === 'running' ? 'text-ink' : state === 'paused' ? 'text-terracotta' : 'text-ink-light/40'
          }`} style={{ fontFamily: "'Noto Serif SC', Georgia, serif", letterSpacing: '0.15em' }}>
            {formatTime(elapsed)}
          </div>

          {/* Decorative divider */}
          <div className="flex items-center gap-3 w-full mb-6">
            <div className="flex-1 h-px bg-cream" />
            <Flower className="w-4 h-4 text-rose-dark opacity-40" />
            <div className="flex-1 h-px bg-cream" />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            {state === 'idle' && (
              <button
                onClick={handleStart}
                className="px-8 py-3 bg-sage text-paper rounded-full text-base font-medium shadow-sm hover:bg-sage-dark active:scale-95 transition-all"
                style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}
              >
                开始专注
              </button>
            )}
            {state === 'running' && (
              <>
                <button
                  onClick={pause}
                  className="px-6 py-2.5 border-2 border-ink-light/30 text-ink-light rounded-full text-sm font-medium hover:border-ink-light/50 active:scale-95 transition-all"
                >
                  暂停
                </button>
                <button
                  onClick={end}
                  disabled={saving}
                  className="px-6 py-2.5 bg-rose-dark text-paper rounded-full text-sm font-medium shadow-sm disabled:opacity-50 active:scale-95 transition-all"
                >
                  结束
                </button>
              </>
            )}
            {state === 'paused' && (
              <>
                <button
                  onClick={resume}
                  className="px-6 py-2.5 bg-sage text-paper rounded-full text-sm font-medium shadow-sm active:scale-95 transition-all"
                >
                  继续
                </button>
                <button
                  onClick={end}
                  disabled={saving}
                  className="px-6 py-2.5 border-2 border-ink-light/30 text-ink-light rounded-full text-sm font-medium disabled:opacity-50 active:scale-95 transition-all"
                >
                  {saving ? '保存中...' : '结束'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Today's session records */}
      {todaySessions.length > 0 && (
        <div className="relative bg-paper rounded-2xl border border-cream p-4 shadow-sm paper-texture">
          <div className="absolute top-0 right-8 w-16 h-3 bg-lavender-light opacity-50 -translate-y-1 rounded-b-sm rotate-1" />

          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-ink" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
              今日记录
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-sage-light/40 text-sage-dark">
              共 {formatDuration(todayTotal)}
            </span>
          </div>
          <div className="space-y-2">
            {todaySessions.map((s) => {
              const time = new Date(s.created_at)
              const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`
              return (
                <div key={s.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-sage shrink-0" />
                  <span className="text-sm text-ink flex-1 truncate">
                    {s.taskName || timeStr}
                  </span>
                  <div className="w-14 h-1.5 bg-cream rounded-full overflow-hidden shrink-0">
                    <div
                      className="h-full bg-sage rounded-full"
                      style={{ width: `${Math.min((s.duration_seconds / 3600) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-ink-light shrink-0 tabular-nums">
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
