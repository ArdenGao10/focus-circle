'use client'

import { useState } from 'react'
import { Flower } from './Botanicals'

interface TaskResult {
  task: string
  detail?: string
  duration: string
}

interface AIResult {
  today: TaskResult[]
  week: string
}

interface AITaskModalProps {
  defaultGoal: string
  onClose: () => void
  onAddTasks: (tasks: string[]) => void
}

export default function AITaskModal({ defaultGoal, onClose, onAddTasks }: AITaskModalProps) {
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AIResult | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [retryCount, setRetryCount] = useState(0)

  async function handleSubmit() {
    if (!goal.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/ai-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setRetryCount(c => c + 1)
        setError(data.error || '请求失败')
        return
      }

      if (data.today && Array.isArray(data.today)) {
        setResult(data)
        setRetryCount(0)
        setSelected(new Set(data.today.map((_: TaskResult, i: number) => i)))
      } else {
        setRetryCount(c => c + 1)
        setError('AI返回格式错误，请重试')
      }
    } catch {
      setRetryCount(c => c + 1)
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function handleAdd() {
    if (!result) return
    const tasks = result.today
      .filter((_, i) => selected.has(i))
      .map(t => t.task)
    if (tasks.length > 0) onAddTasks(tasks)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/20 backdrop-blur-sm px-4 pb-4 sm:pb-0" onClick={onClose}>
      <div
        className="relative bg-paper rounded-2xl w-full max-w-sm shadow-xl border border-cream animate-in paper-texture overflow-hidden max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Washi tape */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-3 bg-lavender-light opacity-60 -translate-y-1 rounded-b-sm" />

        {/* Header */}
        <div className="p-5 pb-3 pt-6">
          <div className="flex items-center gap-2 mb-1">
            <Flower className="w-4 h-4 text-lavender" />
            <h2 className="text-base font-bold text-ink" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
              AI 拆解任务
            </h2>
          </div>
          <p className="text-xs text-ink-light">告诉 AI 你的大目标，帮你拆解成今日小任务</p>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 flex-1 overflow-y-auto space-y-4">
          {/* Input */}
          {!result && (
            <>
              <textarea
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder={defaultGoal ? `例如：我正在${defaultGoal}，帮我规划今天的学习任务` : '例如：我要在3个月内通过雅思6.5'}
                rows={3}
                className="w-full text-sm px-3 py-2.5 bg-paper-warm border border-cream rounded-xl focus:outline-none focus:border-lavender resize-none text-ink"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
                disabled={loading}
              />

              {error && (
                <div className="bg-rose-light/30 px-3 py-2 rounded-lg space-y-1.5">
                  <p className="text-xs text-rose-dark">{error}</p>
                  {retryCount >= 3 && (
                    <p className="text-xs text-ink-light">多次失败可能是网络问题或 AI 服务限流，建议稍后再试</p>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="text-xs text-lavender font-medium hover:underline"
                  >
                    点击重试
                  </button>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !goal.trim()}
                className="w-full py-2.5 bg-lavender text-paper rounded-xl text-sm font-medium disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                    <span>AI 思考中...</span>
                  </>
                ) : (
                  '开始拆解'
                )}
              </button>
            </>
          )}

          {/* Result */}
          {result && (
            <>
              <div className="space-y-2">
                <p className="text-xs text-ink-light font-medium">今日推荐任务：</p>
                {result.today.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => toggleSelect(i)}
                    className={`w-full flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      selected.has(i)
                        ? 'bg-lavender-light/30 border-lavender'
                        : 'bg-paper-warm border-cream'
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      selected.has(i)
                        ? 'bg-lavender border-lavender text-paper'
                        : 'border-ink-light/30'
                    }`}>
                      {selected.has(i) && (
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-ink block">{t.task}</span>
                      {t.detail && <span className="text-xs text-ink-light/70 mt-0.5 block">{t.detail}</span>}
                      <span className="text-xs text-ink-light mt-0.5 block">{t.duration}</span>
                    </div>
                  </button>
                ))}
              </div>

              {result.week && (
                <div className="p-3 bg-butter-light rounded-xl border border-butter">
                  <p className="text-xs text-ink-light mb-1">本周计划概览：</p>
                  <p className="text-sm text-ink">{result.week}</p>
                </div>
              )}

              {error && (
                <p className="text-xs text-rose-dark bg-rose-light/30 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setResult(null); setError('') }}
                  className="flex-1 py-2.5 border border-cream text-ink-light rounded-xl text-sm font-medium active:scale-[0.98] transition-all"
                >
                  重新拆解
                </button>
                <button
                  onClick={handleAdd}
                  disabled={selected.size === 0}
                  className="flex-1 py-2.5 bg-sage text-paper rounded-xl text-sm font-medium disabled:opacity-40 active:scale-[0.98] transition-all"
                >
                  加入今日任务 ({selected.size})
                </button>
              </div>
            </>
          )}
        </div>

        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-ink-light/40 hover:text-ink-light transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
