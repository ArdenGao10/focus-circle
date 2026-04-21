'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTimer } from '@/components/TimerContext'

interface LeaderboardEntry {
  id: string
  nickname: string
  goal: string
  target_minutes?: number
  total_days: number
  today_seconds: number
}

function formatHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const RANK_STYLES = [
  'from-amber-400 to-yellow-500',
  'from-gray-300 to-gray-400',
  'from-amber-600 to-orange-500',
]

const RANK_ICONS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [myGoal, setMyGoal] = useState<string | null>(null)
  const [filterGoal, setFilterGoal] = useState(false)
  const [loading, setLoading] = useState(true)
  const initRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { state: timerState, elapsed, taskName } = useTimer()

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: rows } = await supabase
      .from('leaderboard')
      .select('*')
      .order('today_seconds', { ascending: false })

    if (rows) setData(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const supabase = createClient()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setMyId(user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('goal')
          .eq('id', user.id)
          .single()
        if (profile) setMyGoal(profile.goal)
      }
      fetchData()
    }
    init()

    intervalRef.current = setInterval(fetchData, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchData])

  // Build display data: add live elapsed to current user
  const isTimerActive = timerState === 'running' || timerState === 'paused'
  const displayData = data.map(entry => {
    if (entry.id === myId && isTimerActive) {
      return { ...entry, today_seconds: entry.today_seconds + elapsed }
    }
    return entry
  })

  // Re-sort by today_seconds (with live time added)
  const sorted = [...displayData].sort((a, b) => b.today_seconds - a.today_seconds)

  const filtered = filterGoal && myGoal
    ? sorted.filter((e) => e.goal === myGoal)
    : sorted

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">排行榜</h1>
        {myGoal && (
          <button
            onClick={() => setFilterGoal(!filterGoal)}
            className={`text-sm px-4 py-1.5 rounded-full border-2 transition-all active:scale-95 ${
              filterGoal
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-transparent shadow-sm'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            同目标
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-gray-400">暂无数据</p>
          <p className="text-xs text-gray-300 mt-1">开始专注后将出现在排行榜</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry, i) => {
            const targetMins = entry.target_minutes || 120
            const progress = Math.min((entry.today_seconds / (targetMins * 60)) * 100, 100)
            const isMe = entry.id === myId
            const isTop3 = i < 3
            const isMeActive = isMe && isTimerActive

            return (
              <div
                key={entry.id}
                className={`relative p-4 rounded-2xl transition-all ${
                  isMe
                    ? 'bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-200 shadow-sm'
                    : 'bg-white border border-gray-100 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 text-center shrink-0">
                    {isTop3 ? (
                      <span className="text-lg">{RANK_ICONS[i]}</span>
                    ) : (
                      <span className="text-sm font-bold text-gray-300">{i + 1}</span>
                    )}
                  </div>

                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 relative ${
                    isTop3
                      ? `bg-gradient-to-br ${RANK_STYLES[i]}`
                      : 'bg-gradient-to-br from-gray-600 to-gray-800'
                  }`}>
                    {entry.nickname.charAt(0)}
                    {isMeActive && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold text-sm truncate ${isMe ? 'text-violet-700' : ''}`}>
                        {entry.nickname}
                        {isMe && <span className="text-xs text-violet-400 ml-1">(我)</span>}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full shrink-0">
                        {entry.goal}
                      </span>
                    </div>

                    {/* Show current task if active */}
                    {isMeActive && taskName && (
                      <div className="text-xs text-violet-500 mb-1 truncate">
                        正在专注：{taskName}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            progress >= 100
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                              : progress >= 50
                              ? 'bg-gradient-to-r from-violet-400 to-purple-400'
                              : 'bg-gradient-to-r from-blue-400 to-indigo-400'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 tabular-nums w-10 text-right">
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <div className={`text-sm font-bold font-mono tabular-nums ${isMeActive ? 'text-violet-600' : ''}`}>
                      {formatHMS(entry.today_seconds)}
                    </div>
                    <div className="text-xs text-gray-400">
                      累计{entry.total_days}天
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
