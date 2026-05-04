'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAppData } from '@/components/AppDataContext'
import { useTimer, useLiveElapsed } from '@/components/TimerContext'
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
import { BarChart, Bar, XAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'

type Period = 'week' | 'month'

const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatHours(seconds: number): string {
  if (seconds <= 0) return '0'
  const hours = seconds / 3600
  return hours >= 10 ? hours.toFixed(0) : hours.toFixed(1)
}

function formatMinutes(mins: number): string {
  if (mins <= 0) return '0 m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} m`
  if (m === 0) return `${h} h`
  return `${h} h ${m} m`
}

function formatDateZh(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function weekdayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return WEEKDAY_LABELS[new Date(y, m - 1, d).getDay()]
}

function weekRangeLabel(startKey: string): string {
  const [y, m, d] = startKey.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${start.getMonth() + 1}/${start.getDate()} – ${end.getMonth() + 1}/${end.getDate()}`
}

interface ChartRow {
  label: string
  minutes: number
  tooltipDate: string
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartRow }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'rgba(255,255,255,0.96)',
      borderRadius: 8,
      boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
      padding: '8px 12px',
      fontFamily: 'var(--aura-font-sans)',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--aura-text-muted)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 2 }}>
        {d.tooltipDate}
      </div>
      <div style={{ color: 'var(--aura-text-primary)', fontFamily: 'var(--aura-font-mono)' }}>
        {formatMinutes(d.minutes)}
      </div>
    </div>
  )
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--aura-font-sans)',
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.18em',
  color: 'var(--aura-text-muted)',
  margin: 0,
}

export default function ProfilePage() {
  const { profile, dailyTasks, pendingCount, retryPendingSessions, profileHistory, loadProfileHistory, userId } = useAppData()
  const { state: timerState } = useTimer()
  const liveElapsed = useLiveElapsed()
  const [period, setPeriod] = useState<Period>('week')
  const [statsResult, setStatsResult] = useState<StatsResult | null>(null)
  const [completedTasks, setCompletedTasks] = useState<number>(0)
  const [statsLoading, setStatsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const router = useRouter()

  useEffect(() => { loadProfileHistory() }, [loadProfileHistory])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    async function load() {
      if (!userId) return
      setStatsLoading(true)
      const days = period === 'week' ? 7 : 28
      const sinceISO = rangeStartISO(days)
      const fromKey = rangeStartDateKey(days)
      const toKey = todayDateKey()
      const [sessions, taskCount] = await Promise.all([
        fetchSessionsSince(userId, sinceISO),
        fetchCompletedTaskCount(userId, fromKey, toKey),
      ])
      if (cancelled) return
      const result = period === 'week' ? bucketByDay(sessions, 7) : bucketByWeek(sessions, 4)
      setStatsResult(result)
      setCompletedTasks(taskCount)
      setStatsLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [period, userId])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const isTimerActive = timerState !== 'idle'
  const today = new Date().toISOString().split('T')[0]
  const allSessions = profileHistory || []
  const historyLoaded = profileHistory !== null
  const targetMins = profile?.target_minutes || 120

  const baseTotal = allSessions.reduce((sum, s) => sum + s.duration_seconds, 0)
  const totalSeconds = baseTotal + (isTimerActive ? liveElapsed : 0)
  const totalDays = new Set(allSessions.map(s => s.date)).size

  const sessionsByDate = useMemo(() => {
    const m: Record<string, number> = {}
    for (const s of allSessions) m[s.date] = (m[s.date] || 0) + s.duration_seconds
    if (isTimerActive) m[today] = (m[today] || 0) + liveElapsed
    return m
  }, [allSessions, isTimerActive, liveElapsed, today])

  const dateList = useMemo(
    () => Object.keys(sessionsByDate).sort((a, b) => b.localeCompare(a)),
    [sessionsByDate],
  )

  const chartData: ChartRow[] = useMemo(() => {
    if (!statsResult) return []
    return statsResult.buckets.map((b, i) => {
      if (period === 'week') {
        return {
          label: weekdayLabel(b.key),
          minutes: b.minutes,
          tooltipDate: formatDateZh(b.key),
        }
      }
      return {
        label: `W${i + 1}`,
        minutes: b.minutes,
        tooltipDate: weekRangeLabel(b.key),
      }
    })
  }, [statsResult, period])

  const summaryItems = useMemo(() => {
    if (!statsResult) {
      return [
        { label: period === 'week' ? '本周时长' : '近 4 周时长', value: '–' },
        { label: '完成任务', value: '–' },
        { label: '日均时长', value: '–' },
      ]
    }
    return [
      { label: period === 'week' ? '本周时长' : '近 4 周时长', value: formatMinutes(statsResult.summary.totalMinutes) },
      { label: '完成任务', value: String(completedTasks) },
      { label: '日均时长', value: `${statsResult.summary.avgDailyMinutes} m` },
    ]
  }, [statsResult, completedTasks, period])

  const initial = (profile?.nickname || profile?.email || '·').charAt(0).toUpperCase()
  const goalText = profile?.goal ? `正在专注 · ${profile.goal}` : '正在专注'
  const visibleDates = historyExpanded ? dateList.slice(0, 30) : dateList.slice(0, 2)

  const bigStats = [
    { label: '打卡天数', value: historyLoaded ? String(totalDays) : '–', unit: '天' },
    { label: '累计时长', value: historyLoaded ? formatHours(totalSeconds) : '–', unit: 'h' },
    { label: '日目标', value: String(targetMins), unit: '分' },
  ]

  return (
    <div style={{ background: 'var(--aura-bg-primary)', color: 'var(--aura-text-primary)', minHeight: '100%' }}>
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* 1. Profile header */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168, 213, 186, 0.3) 0%, rgba(168, 213, 186, 0.1) 70%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--aura-font-serif)',
              fontSize: 24, color: 'var(--aura-text-primary)',
            }}>
              {initial}
            </div>
            <div>
              <h1 style={{
                fontFamily: 'var(--aura-font-serif)',
                fontSize: 28, fontWeight: 400, lineHeight: 1.1,
                color: 'var(--aura-text-primary)',
                margin: 0, marginBottom: 4,
              }}>
                {profile?.nickname || '——'}
              </h1>
              <p style={{
                margin: 0,
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 13, color: 'var(--aura-text-muted)', letterSpacing: '0.05em',
              }}>
                {goalText}
              </p>
            </div>
          </div>
        </section>

        {/* 2. Three big stats */}
        <section style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          marginBottom: 48,
          borderTop: '1px solid rgba(0,0,0,0.06)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          {bigStats.map((stat, i) => (
            <div key={stat.label} style={{
              padding: '20px 0', textAlign: 'center',
              borderRight: i < bigStats.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
            }}>
              <div style={{
                fontFamily: 'var(--aura-font-serif)',
                fontSize: stat.value.length > 5 ? 20 : 32,
                fontWeight: 300,
                color: 'var(--aura-text-primary)',
                marginBottom: 4,
                fontVariantNumeric: 'tabular-nums lining-nums',
              }}>
                {stat.value}
                {stat.unit && (
                  <span style={{
                    fontSize: 14, color: 'var(--aura-text-secondary)', marginLeft: 4,
                  }}>
                    {stat.unit}
                  </span>
                )}
              </div>
              <div style={{
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 11, color: 'var(--aura-text-muted)', letterSpacing: '0.15em',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </section>

        {/* 3. Learning stats — chart with week/month toggle */}
        <section style={{ marginBottom: 48 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: 24,
          }}>
            <h3 style={sectionTitleStyle}>学习统计</h3>
            <div style={{ display: 'flex', gap: 24 }}>
              {(['week', 'month'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    fontFamily: 'var(--aura-font-sans)',
                    fontSize: 13,
                    color: period === p ? 'var(--aura-text-primary)' : 'var(--aura-text-muted)',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${period === p ? 'var(--aura-text-primary)' : 'transparent'}`,
                    paddingBottom: 2,
                    cursor: 'pointer',
                  }}
                >
                  {p === 'week' ? '周' : '月'}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32,
          }}>
            {summaryItems.map(s => (
              <div key={s.label}>
                <div style={{
                  fontFamily: 'var(--aura-font-serif)',
                  fontSize: 24, fontWeight: 300,
                  color: 'var(--aura-text-primary)', marginBottom: 4,
                  fontVariantNumeric: 'tabular-nums lining-nums',
                }}>
                  {s.value}
                </div>
                <div style={{
                  fontFamily: 'var(--aura-font-sans)',
                  fontSize: 11, color: 'var(--aura-text-muted)', letterSpacing: '0.1em',
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ height: 200 }}>
            {statsLoading && !statsResult ? (
              <div style={{ height: '100%', background: 'rgba(0,0,0,0.02)', borderRadius: 8 }} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fill: 'var(--aura-text-muted)',
                      fontFamily: 'var(--aura-font-mono)',
                      letterSpacing: '0.1em',
                    }}
                  />
                  <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                  <Bar dataKey="minutes" minPointSize={4} radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.minutes > 0 ? 'rgba(111, 169, 137, 0.7)' : 'rgba(0, 0, 0, 0.05)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* 4. Learning history */}
        <section style={{ marginBottom: 48 }}>
          <h3 style={{ ...sectionTitleStyle, marginBottom: 20 }}>学习记录</h3>
          {!historyLoaded ? (
            <div style={{
              padding: '24px 0', fontFamily: 'var(--aura-font-sans)',
              fontSize: 12, color: 'var(--aura-text-muted)',
            }}>加载中…</div>
          ) : dateList.length === 0 ? (
            <div style={{
              padding: '24px 0', fontFamily: 'var(--aura-font-sans)',
              fontSize: 12, color: 'var(--aura-text-muted)',
            }}>暂无记录</div>
          ) : (
            <>
              {visibleDates.map(date => {
                const secs = sessionsByDate[date]
                const progress = Math.min((secs / (targetMins * 60)) * 100, 100)
                const isSelected = selectedDate === date
                const dayTasks = isSelected ? dailyTasks.filter(t => t.date === date) : []

                return (
                  <div key={date}>
                    <button
                      onClick={() => setSelectedDate(isSelected ? null : date)}
                      style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: '14px 0',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{
                        width: 50,
                        fontFamily: 'var(--aura-font-mono)',
                        fontSize: 12, color: 'var(--aura-text-muted)',
                        fontVariantNumeric: 'tabular-nums lining-nums',
                      }}>
                        {formatDateZh(date)}
                      </span>
                      <div style={{
                        flex: 1, height: 4,
                        background: 'rgba(0,0,0,0.04)',
                        borderRadius: 2, overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${progress}%`, height: '100%',
                          background: 'rgba(111, 169, 137, 0.5)', borderRadius: 2,
                        }} />
                      </div>
                      <span style={{
                        minWidth: 70, textAlign: 'right',
                        fontFamily: 'var(--aura-font-mono)',
                        fontSize: 12, color: 'var(--aura-text-secondary)',
                        fontVariantNumeric: 'tabular-nums lining-nums',
                      }}>
                        {formatDuration(secs)}
                      </span>
                    </button>
                    {isSelected && dayTasks.length > 0 && (
                      <div style={{ padding: '8px 0 14px 66px' }}>
                        <div style={{
                          fontFamily: 'var(--aura-font-sans)',
                          fontSize: 11, color: 'var(--aura-text-muted)',
                          letterSpacing: '0.12em', marginBottom: 6,
                        }}>当日任务</div>
                        {dayTasks.map(t => (
                          <div key={t.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '4px 0',
                            fontFamily: 'var(--aura-font-sans)',
                            fontSize: 13,
                            color: t.completed ? 'var(--aura-text-muted)' : 'var(--aura-text-primary)',
                            textDecoration: t.completed ? 'line-through' : 'none',
                          }}>
                            <span style={{
                              width: 5, height: 5, borderRadius: '50%',
                              background: t.completed ? 'var(--aura-green-solid)' : 'rgba(0,0,0,0.18)',
                              opacity: t.completed ? 0.75 : 1,
                            }} />
                            {t.title}
                          </div>
                        ))}
                      </div>
                    )}
                    {isSelected && dayTasks.length === 0 && (
                      <div style={{
                        padding: '8px 0 14px 66px',
                        fontFamily: 'var(--aura-font-sans)',
                        fontSize: 12, color: 'var(--aura-text-muted)', opacity: 0.6,
                      }}>当日未设置任务</div>
                    )}
                  </div>
                )
              })}
              {dateList.length > 2 && (
                <button
                  onClick={() => setHistoryExpanded(v => !v)}
                  style={{
                    marginTop: 20, padding: 0,
                    fontFamily: 'var(--aura-font-sans)',
                    fontSize: 12, letterSpacing: '0.15em',
                    color: 'var(--aura-text-muted)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                  }}
                >
                  {historyExpanded ? '收起' : `展开全部 ${Math.min(dateList.length, 30)} 天`}
                </button>
              )}
            </>
          )}
        </section>

        {pendingCount > 0 && (
          <button
            onClick={retryPendingSessions}
            style={{
              width: '100%', padding: '12px 0', marginBottom: 32,
              fontFamily: 'var(--aura-font-sans)',
              fontSize: 12, color: 'var(--aura-text-secondary)',
              background: 'rgba(217, 192, 136, 0.08)',
              border: '1px solid rgba(217, 192, 136, 0.4)',
              borderRadius: 8, cursor: 'pointer',
            }}
          >
            有 {pendingCount} 条记录未同步，点此重试
          </button>
        )}

        {/* 5. Actions — text-style */}
        <section style={{
          display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center',
          paddingTop: 32, borderTop: '1px solid rgba(0,0,0,0.04)',
        }}>
          <button
            onClick={() => router.push('/onboarding')}
            style={{
              fontFamily: 'var(--aura-font-sans)',
              fontSize: 13, letterSpacing: '0.18em',
              color: 'var(--aura-text-secondary)',
              background: 'transparent', border: 'none', padding: '4px 0', cursor: 'pointer',
            }}
          >
            修改资料
          </button>
          <button
            onClick={() => router.push('/feedback')}
            style={{
              fontFamily: 'var(--aura-font-sans)',
              fontSize: 13, letterSpacing: '0.18em',
              color: 'var(--aura-text-secondary)',
              background: 'transparent', border: 'none', padding: '4px 0', cursor: 'pointer',
            }}
          >
            帮助与反馈
          </button>
          <button
            onClick={handleLogout}
            style={{
              fontFamily: 'var(--aura-font-sans)',
              fontSize: 13, letterSpacing: '0.18em',
              color: 'rgba(195, 100, 95, 0.8)',
              background: 'transparent', border: 'none', padding: '4px 0', cursor: 'pointer',
            }}
          >
            退出登录
          </button>
        </section>
      </main>
    </div>
  )
}
