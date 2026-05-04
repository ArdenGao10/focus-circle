'use client'

import { useState } from 'react'

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

const cnButton = (enabled: boolean): React.CSSProperties => ({
  fontFamily: 'var(--aura-font-sans)',
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: '0.2em',
  color: enabled ? 'var(--aura-text-primary)' : 'var(--aura-text-muted)',
  background: 'transparent',
  border: 'none',
  borderBottom: `1px solid ${enabled ? 'var(--aura-text-primary)' : 'rgba(0,0,0,0.15)'}`,
  paddingBottom: 4,
  cursor: enabled ? 'pointer' : 'not-allowed',
})

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

      const text = await res.text()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        setRetryCount(c => c + 1)
        setError(`服务器错误 (${res.status}): ${text.slice(0, 100)}`)
        return
      }

      if (!res.ok) {
        setRetryCount(c => c + 1)
        setError((data.error as string) || '请求失败')
        return
      }

      if (data.today && Array.isArray(data.today)) {
        setResult(data)
        setRetryCount(0)
        setSelected(new Set(data.today.map((_: TaskResult, i: number) => i)))
      } else {
        setRetryCount(c => c + 1)
        setError('AI 返回格式错误,请重试')
      }
    } catch {
      setRetryCount(c => c + 1)
      setError('网络错误,请重试')
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

  const placeholder = defaultGoal
    ? `例如:我正在${defaultGoal},帮我规划今天的学习任务`
    : '例如:我正在备考雅思,帮我规划今天的学习任务'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--aura-bg-elevated)',
          borderRadius: 16,
          padding: '40px 32px 32px',
          width: '100%',
          maxWidth: 480,
          maxHeight: '85vh',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Close × */}
        <button
          onClick={onClose}
          aria-label="关闭"
          style={{
            position: 'absolute',
            top: 16,
            right: 18,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--aura-text-muted)',
            fontSize: 22,
            fontWeight: 200,
            lineHeight: 1,
            padding: 4,
          }}
        >
          ×
        </button>

        {/* Header */}
        <h2
          style={{
            fontFamily: 'var(--aura-font-serif)',
            fontSize: 28,
            fontWeight: 400,
            color: 'var(--aura-text-primary)',
            letterSpacing: '0.02em',
            marginBottom: 8,
          }}
        >
          AI 拆解任务
        </h2>
        <p
          style={{
            fontFamily: 'var(--aura-font-sans)',
            fontSize: 14,
            color: 'var(--aura-text-secondary)',
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          告诉 AI 你的大目标,帮你拆解成今日小任务
        </p>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {/* Input phase */}
          {!result && (
            <>
              <textarea
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder={placeholder}
                rows={3}
                disabled={loading}
                onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--aura-text-primary)' }}
                onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E5E5E5' }}
                style={{
                  width: '100%',
                  minHeight: 100,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #E5E5E5',
                  padding: '12px 0',
                  fontFamily: 'var(--aura-font-sans)',
                  fontSize: 15,
                  color: 'var(--aura-text-primary)',
                  resize: 'none',
                  outline: 'none',
                  marginBottom: 32,
                  transition: 'border-color 0.2s ease',
                }}
              />

              {error && (
                <div
                  style={{
                    marginBottom: 24,
                    padding: '10px 0',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  <p style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 13, color: 'var(--aura-text-secondary)' }}>
                    {error}
                  </p>
                  {retryCount >= 3 && (
                    <p style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 12, color: 'var(--aura-text-muted)', marginTop: 4 }}>
                      多次失败可能是网络或 AI 服务限流,稍后再试
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Result phase */}
          {result && (
            <>
              <p
                style={{
                  fontFamily: 'var(--aura-font-sans)',
                  fontSize: 12,
                  letterSpacing: '0.15em',
                  color: 'var(--aura-text-muted)',
                  marginBottom: 12,
                }}
              >
                今日推荐
              </p>
              <ul style={{ marginBottom: 24 }}>
                {result.today.map((t, i) => {
                  const isSel = selected.has(i)
                  return (
                    <li key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <button
                        onClick={() => toggleSelect(i)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          width: '100%',
                          padding: '14px 0',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            width: 18, height: 18, borderRadius: '50%',
                            background: isSel ? 'var(--aura-green-solid)' : 'transparent',
                            opacity: isSel ? 0.4 : 1,
                            border: isSel ? 'none' : '1px solid rgba(0,0,0,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          {isSel && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              display: 'block',
                              fontFamily: 'var(--aura-font-sans)',
                              fontSize: 15,
                              color: 'var(--aura-text-primary)',
                            }}
                          >
                            {t.task}
                          </span>
                          {t.detail && (
                            <span
                              style={{
                                display: 'block',
                                fontFamily: 'var(--aura-font-sans)',
                                fontSize: 13,
                                color: 'var(--aura-text-secondary)',
                                marginTop: 4,
                                lineHeight: 1.5,
                              }}
                            >
                              {t.detail}
                            </span>
                          )}
                          <span
                            style={{
                              display: 'block',
                              fontFamily: 'var(--aura-font-mono)',
                              fontSize: 11,
                              letterSpacing: '0.1em',
                              color: 'var(--aura-text-muted)',
                              marginTop: 6,
                            }}
                          >
                            {t.duration}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              {result.week && (
                <div
                  style={{
                    padding: '14px 0',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    marginBottom: 24,
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--aura-font-sans)',
                      fontSize: 12,
                      letterSpacing: '0.15em',
                      color: 'var(--aura-text-muted)',
                      marginBottom: 6,
                    }}
                  >
                    本周计划概览
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--aura-font-sans)',
                      fontSize: 14,
                      color: 'var(--aura-text-primary)',
                      lineHeight: 1.6,
                    }}
                  >
                    {result.week}
                  </p>
                </div>
              )}

              {error && (
                <p
                  style={{
                    fontFamily: 'var(--aura-font-sans)',
                    fontSize: 13,
                    color: 'var(--aura-text-secondary)',
                    marginBottom: 16,
                  }}
                >
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, marginTop: 24 }}>
          {!result && (
            <button
              onClick={handleSubmit}
              disabled={loading || !goal.trim()}
              style={cnButton(!loading && goal.trim().length > 0)}
            >
              {loading ? 'AI 思考中…' : '开始拆解'}
            </button>
          )}

          {result && (
            <>
              <button
                onClick={() => { setResult(null); setError('') }}
                style={cnButton(true)}
              >
                重新拆解
              </button>
              <button
                onClick={handleAdd}
                disabled={selected.size === 0}
                style={cnButton(selected.size > 0)}
              >
                加入今日({selected.size})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
