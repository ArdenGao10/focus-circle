'use client'

import { BarChart, Bar, XAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import type { StatsBucket } from '@/lib/focusStats'

interface FocusBarChartProps {
  data: StatsBucket[]
  height?: number
  unit?: 'day' | 'week'
}

function formatMinutes(mins: number): string {
  if (mins <= 0) return '0 分钟'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} 分钟`
  if (m === 0) return `${h} 小时`
  return `${h} 小时 ${m} 分`
}

interface TooltipPayloadItem {
  payload: StatsBucket
}

function CustomTooltip(
  { active, payload, unit }:
  { active?: boolean; payload?: TooltipPayloadItem[]; unit: 'day' | 'week' }
) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const periodLabel = unit === 'week' ? '本期' : '当日'
  return (
    <div className="bg-paper border border-cream rounded-lg px-3 py-2 shadow-md text-xs">
      <div className="font-medium text-ink mb-0.5">{d.label}</div>
      {d.sessionCount > 0 ? (
        <div className="text-ink-light">
          {periodLabel}专注 {d.sessionCount} 次 · 共 {formatMinutes(d.minutes)}
        </div>
      ) : (
        <div className="text-ink-light/60">{periodLabel}没有专注记录</div>
      )}
    </div>
  )
}

export default function FocusBarChart({ data, height = 180, unit = 'day' }: FocusBarChartProps) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 6 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--ink-light)' }}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: 'var(--cream)', opacity: 0.4 }}
            content={<CustomTooltip unit={unit} />}
          />
          <Bar dataKey="minutes" minPointSize={4} radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell
                key={d.key}
                fill={d.minutes > 0 ? 'var(--sage-dark)' : 'var(--cream)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
