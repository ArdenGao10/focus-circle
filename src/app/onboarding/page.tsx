'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Leaf, Flower } from '@/components/Botanicals'

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
  const supabase = createClient()

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
    <div className="min-h-full flex items-center justify-center px-6 py-10 bg-background">
      <div className="w-full max-w-sm relative">
        {/* Decorative */}
        <Leaf className="absolute -top-8 -right-2 w-10 h-14 text-sage-dark animate-sway" />
        <Flower className="absolute -top-4 left-4 w-8 h-8 text-rose opacity-40" />

        <div className="bg-paper rounded-2xl border border-cream p-6 shadow-sm paper-texture">
          {/* Washi tape */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-3 bg-sage-light opacity-50 -translate-y-1 rounded-b-sm" />

          <div className="text-center mb-6 pt-2">
            <h1 className="text-xl font-bold text-ink" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
              设置你的资料
            </h1>
            <p className="text-ink-light text-xs mt-1">让大家认识你</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-ink">昵称</label>
              <input
                type="text"
                placeholder="你的昵称"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                maxLength={20}
                className="w-full px-4 py-2.5 bg-paper-warm border border-cream rounded-xl focus:outline-none focus:border-sage transition-colors text-ink"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-ink">学习目标</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_GOALS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => selectGoal(g)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all active:scale-95 ${
                      goal === g
                        ? 'bg-sage text-paper border-sage'
                        : 'border-cream text-ink-light hover:border-sage-light'
                    }`}
                  >
                    {g}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setGoal('custom')}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all active:scale-95 ${
                    goal === 'custom'
                      ? 'bg-sage text-paper border-sage'
                      : 'border-cream text-ink-light hover:border-sage-light'
                  }`}
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
                  className="w-full px-4 py-2.5 bg-paper-warm border border-cream rounded-xl focus:outline-none focus:border-sage transition-colors text-ink"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-ink">每日目标时长</label>
              {goal && TARGET_SUGGESTIONS[goal] && (
                <p className="text-xs text-lavender mb-2">
                  推荐：「{goal}」每天 {TARGET_SUGGESTIONS[goal]} 分钟
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {TARGET_OPTIONS.map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTargetMinutes(mins)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all active:scale-95 ${
                      targetMinutes === mins
                        ? 'bg-terracotta text-paper border-terracotta'
                        : 'border-cream text-ink-light hover:border-terracotta-light'
                    }`}
                  >
                    {mins >= 60 ? `${mins / 60}小时` : `${mins}分钟`}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !nickname.trim() || !finalGoal.trim()}
              className="w-full py-3 bg-sage text-paper rounded-xl font-medium disabled:opacity-50 shadow-sm active:scale-[0.98] transition-all"
              style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}
            >
              {loading ? '保存中...' : '开始打卡'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
