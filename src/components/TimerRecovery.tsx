'use client'

import { useState } from 'react'
import { useTimer } from './TimerContext'
import { Flower } from './Botanicals'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m > 0 ? m + '分钟' : ''}`
  if (m > 0) return `${m}分钟`
  return `${seconds}秒`
}

export default function TimerRecovery() {
  const { recovery, recoverAndContinue, recoverAndSave, recoverDiscard } = useTimer()
  const [saving, setSaving] = useState(false)

  if (!recovery) return null

  async function handleSave() {
    setSaving(true)
    await recoverAndSave()
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm px-6">
      <div className="relative bg-paper rounded-2xl p-6 w-full max-w-sm shadow-xl border border-cream animate-in paper-texture overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-3 bg-butter opacity-50 -translate-y-1 rounded-b-sm" />

        <div className="text-center mb-4 pt-2">
          <Flower className="w-8 h-8 mx-auto text-rose mb-2" />
          <h2 className="text-base font-bold text-ink" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
            发现未完成的专注
          </h2>
        </div>

        <div className="bg-paper-warm rounded-xl p-4 mb-5 border border-cream text-center">
          <div className="text-2xl font-bold text-ink" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            {formatDuration(recovery.elapsedSeconds)}
          </div>
          {recovery.taskName && (
            <div className="text-sm text-sage-dark mt-1">{recovery.taskName}</div>
          )}
          <div className="text-xs text-ink-light mt-1">上次专注记录</div>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={recoverAndContinue}
            className="w-full py-2.5 bg-sage text-paper rounded-xl text-sm font-medium active:scale-[0.98] transition-all"
            style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}
          >
            恢复并继续计时
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-lavender text-paper rounded-xl text-sm font-medium disabled:opacity-50 active:scale-[0.98] transition-all"
            style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}
          >
            {saving ? '保存中...' : '保存为已完成'}
          </button>
          <button
            onClick={recoverDiscard}
            className="w-full py-2.5 text-ink-light text-sm font-medium hover:bg-paper-warm rounded-xl transition-colors"
          >
            放弃这次记录
          </button>
        </div>
      </div>
    </div>
  )
}
