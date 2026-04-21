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
    <div className="min-h-full flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">设置你的资料</h1>
          <p className="text-gray-400 text-sm mt-1">让大家认识你</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">昵称</label>
            <input
              type="text"
              placeholder="你的昵称"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              maxLength={20}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">学习目标</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_GOALS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => selectGoal(g)}
                  className={`px-3.5 py-2 rounded-xl text-sm border-2 transition-all active:scale-95 ${
                    goal === g
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-transparent shadow-sm'
                      : 'border-gray-200 hover:border-violet-300'
                  }`}
                >
                  {g}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setGoal('custom')}
                className={`px-3.5 py-2 rounded-xl text-sm border-2 transition-all active:scale-95 ${
                  goal === 'custom'
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-transparent shadow-sm'
                    : 'border-gray-200 hover:border-violet-300'
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
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">每日目标时长</label>
            {goal && TARGET_SUGGESTIONS[goal] && (
              <p className="text-xs text-violet-500 mb-2">
                AI 建议：「{goal}」推荐每天 {TARGET_SUGGESTIONS[goal]} 分钟
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {TARGET_OPTIONS.map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setTargetMinutes(mins)}
                  className={`px-3.5 py-2 rounded-xl text-sm border-2 transition-all active:scale-95 ${
                    targetMinutes === mins
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-sm'
                      : 'border-gray-200 hover:border-emerald-300'
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
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium disabled:opacity-50 shadow-lg shadow-violet-200 active:scale-[0.98] transition-all"
          >
            {loading ? '保存中...' : '开始打卡'}
          </button>
        </form>
      </div>
    </div>
  )
}
