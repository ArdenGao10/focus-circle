'use client'

import { useTimer } from './TimerContext'
import { Flower, Leaf } from './Botanicals'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}小时${m > 0 ? m + '分钟' : ''}`
  if (m > 0) return `${m}分钟${s > 0 ? s + '秒' : ''}`
  return `${s}秒`
}

export default function SessionSummary() {
  const { lastSession, clearLastSession } = useTimer()

  if (!lastSession) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm px-6">
      <div className="relative bg-paper rounded-2xl p-6 w-full max-w-sm shadow-xl border border-cream animate-in paper-texture overflow-hidden">
        {/* Decorative elements */}
        <Leaf className="absolute top-2 right-3 w-8 h-12 text-sage-dark animate-sway" />
        <Flower className="absolute bottom-4 left-4 w-10 h-10 text-rose opacity-40" />

        {/* Washi tape */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-3 bg-sage-light opacity-50 -translate-y-1 rounded-b-sm" />

        <div className="text-center mb-5 pt-2">
          <div className="text-3xl mb-2">🌸</div>
          <h2 className="text-lg font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            专注完成
          </h2>
          <p className="text-ink-light text-xs mt-0.5">又一次认真的时光</p>
        </div>

        <div className="bg-paper-warm rounded-xl p-4 mb-5 border border-cream">
          <div className="text-center">
            <div className="text-3xl font-bold text-ink" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              {formatDuration(lastSession.duration_seconds)}
            </div>
            {lastSession.taskName && (
              <div className="text-sm text-sage-dark mt-1 italic">{lastSession.taskName}</div>
            )}
            <div className="text-xs text-ink-light mt-1">{lastSession.date}</div>
          </div>
        </div>

        <button
          onClick={clearLastSession}
          className="w-full py-3 bg-sage text-paper rounded-xl font-medium active:scale-[0.98] transition-transform"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          继续加油
        </button>
      </div>
    </div>
  )
}
