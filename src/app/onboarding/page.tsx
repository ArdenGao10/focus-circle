'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const PRESET_GOALS = ['备考雅思', '考研备考', '学习编程', '健身打卡', '读书计划']
const TARGET_OPTIONS = [30, 60, 90, 120, 180, 240]

const TARGET_SUGGESTIONS: Record<string, number> = {
  '备考雅思': 120,
  '考研备考': 180,
  '学习编程': 90,
  '健身打卡': 60,
  '读书计划': 60,
}

export default function OnboardingPage() {
  const [nickname, setNickname] = useState('')
  const [goal, setGoal] = useState('')
  const [customGoal, setCustomGoal] = useState('')
  const [targetMinutes, setTargetMinutes] = useState(120)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const finalGoal = goal === 'custom' ? customGoal : goal

  function selectGoal(g: string) {
    setGoal(g)
    if (TARGET_SUGGESTIONS[g]) {
      setTargetMinutes(TARGET_SUGGESTIONS[g])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim() || !finalGoal.trim()) return
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({
        nickname: nickname.trim(),
        goal: finalGoal.trim(),
        target_minutes: targetMinutes,
      })
      .eq('id', user.id)

    router.push('/')
    router.refresh()
  }

  return (
    <div
      className="min-h-full flex items-center justify-center px-6 py-10"
      style={{ background: 'var(--aura-bg-primary)' }}
    >
      <div className="w-full max-w-sm">
        <div
          style={{
            background: 'var(--aura-bg-elevated)',
            borderRadius: 24,
            border: '1px solid rgba(0,0,0,0.06)',
            padding: 28,
          }}
        >
          <div className="text-center mb-6">
            <h1
              style={{
                fontFamily: 'var(--aura-font-serif)',
                fontSize: 20,
                fontWeight: 400,
                color: 'var(--aura-text-primary)',
                letterSpacing: '0.04em',
              }}
            >
              设置你的资料
            </h1>
            <p
              style={{
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 12,
                color: 'var(--aura-text-muted)',
                marginTop: 6,
                letterSpacing: '0.1em',
              }}
            >
              让大家认识你
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--aura-font-sans)',
                  fontSize: 13,
                  color: 'var(--aura-text-secondary)',
                  marginBottom: 10,
                  letterSpacing: '0.1em',
                }}
              >
                昵称
              </label>
              <input
                type="text"
                placeholder="你的昵称"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                maxLength={20}
                className="w-full focus:outline-none"
                style={{
                  fontFamily: 'var(--aura-font-sans)',
                  fontSize: 14,
                  color: 'var(--aura-text-primary)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(0,0,0,0.12)',
                  padding: '8px 0',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--aura-font-sans)',
                  fontSize: 13,
                  color: 'var(--aura-text-secondary)',
                  marginBottom: 12,
                  letterSpacing: '0.1em',
                }}
              >
                学习目标
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_GOALS.map((g) => {
                  const selected = goal === g
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => selectGoal(g)}
                      style={{
                        fontFamily: 'var(--aura-font-sans)',
                        fontSize: 12,
                        color: selected ? 'var(--aura-text-primary)' : 'var(--aura-text-secondary)',
                        border: `1px solid ${selected ? 'var(--aura-text-primary)' : 'rgba(0,0,0,0.12)'}`,
                        borderRadius: 999,
                        padding: '6px 12px',
                        background: selected ? 'rgba(0,0,0,0.04)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {g}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setGoal('custom')}
                  style={{
                    fontFamily: 'var(--aura-font-sans)',
                    fontSize: 12,
                    color: goal === 'custom' ? 'var(--aura-text-primary)' : 'var(--aura-text-secondary)',
                    border: `1px solid ${goal === 'custom' ? 'var(--aura-text-primary)' : 'rgba(0,0,0,0.12)'}`,
                    borderRadius: 999,
                    padding: '6px 12px',
                    background: goal === 'custom' ? 'rgba(0,0,0,0.04)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  自定义
                </button>
              </div>
              {goal === 'custom' && (
                <input
                  type="text"
                  placeholder="输入你的目标"
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  required
                  maxLength={20}
                  className="w-full focus:outline-none"
                  style={{
                    fontFamily: 'var(--aura-font-sans)',
                    fontSize: 14,
                    color: 'var(--aura-text-primary)',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(0,0,0,0.12)',
                    padding: '8px 0',
                  }}
                />
              )}
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--aura-font-sans)',
                  fontSize: 13,
                  color: 'var(--aura-text-secondary)',
                  marginBottom: 12,
                  letterSpacing: '0.1em',
                }}
              >
                每日目标时长
              </label>
              {goal && TARGET_SUGGESTIONS[goal] && (
                <p
                  style={{
                    fontFamily: 'var(--aura-font-mono)',
                    fontSize: 11,
                    color: 'var(--aura-text-muted)',
                    marginBottom: 10,
                    letterSpacing: '0.1em',
                  }}
                >
                  推荐:「{goal}」每天 {TARGET_SUGGESTIONS[goal]} 分钟
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {TARGET_OPTIONS.map(mins => {
                  const selected = targetMinutes === mins
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setTargetMinutes(mins)}
                      style={{
                        fontFamily: 'var(--aura-font-sans)',
                        fontSize: 12,
                        color: selected ? 'var(--aura-text-primary)' : 'var(--aura-text-secondary)',
                        border: `1px solid ${selected ? 'var(--aura-text-primary)' : 'rgba(0,0,0,0.12)'}`,
                        borderRadius: 999,
                        padding: '6px 12px',
                        background: selected ? 'rgba(0,0,0,0.04)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {mins >= 60 ? `${mins / 60}小时` : `${mins}分钟`}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !nickname.trim() || !finalGoal.trim()}
              style={{
                width: '100%',
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 14,
                letterSpacing: '0.2em',
                fontWeight: 500,
                color: loading || !nickname.trim() || !finalGoal.trim()
                  ? 'var(--aura-text-muted)'
                  : 'var(--aura-text-primary)',
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${loading || !nickname.trim() || !finalGoal.trim()
                  ? 'rgba(0,0,0,0.2)'
                  : 'var(--aura-text-primary)'}`,
                paddingBottom: 4,
                cursor: loading || !nickname.trim() || !finalGoal.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '保存中...' : '开始打卡'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
