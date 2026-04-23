'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('两次密码不一致')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-paper rounded-2xl border border-cream p-6 shadow-sm paper-texture">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">🌿</div>
            <h1 className="text-xl font-bold text-ink" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
              设置新密码
            </h1>
            <p className="text-ink-light text-xs mt-1">请输入你的新密码</p>
          </div>

          {success ? (
            <div className="bg-sage-light/30 rounded-xl p-4 border border-sage-light text-center">
              <p className="text-sm text-sage-dark">密码已更新，正在跳转登录页面...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                placeholder="新密码（至少6位）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 bg-paper-warm border border-cream rounded-xl focus:outline-none focus:border-sage transition-colors text-ink"
              />
              <input
                type="password"
                placeholder="确认新密码"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 bg-paper-warm border border-cream rounded-xl focus:outline-none focus:border-sage transition-colors text-ink"
              />
              {error && <p className="text-rose-dark text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-sage text-paper rounded-xl font-medium disabled:opacity-50 shadow-sm active:scale-[0.98] transition-all"
                style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}
              >
                {loading ? '更新中...' : '确认更新'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
