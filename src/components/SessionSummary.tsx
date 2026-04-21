'use client'

import { useTimer } from './TimerContext'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-6">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in">
        <div className="text-center mb-5">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-1">专注完成!</h2>
          <p className="text-gray-500 text-sm">又一次高效的学习</p>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 mb-5">
          <div className="text-center">
            <div className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              {formatDuration(lastSession.duration_seconds)}
            </div>
            <div className="text-xs text-gray-500 mt-1">{lastSession.date}</div>
          </div>
        </div>

        <button
          onClick={clearLastSession}
          className="w-full py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl font-medium active:scale-[0.98] transition-transform"
        >
          继续加油
        </button>
      </div>
    </div>
  )
}
