'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-paper rounded-2xl border border-cream p-6 shadow-sm paper-texture">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">🌿</div>
            <h1 className="text-xl font-bold text-ink" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
              找回密码
            </h1>
            <p className="text-ink-light text-xs mt-1">输入你的注册邮箱，我们会发送重置链接</p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="bg-sage-light/30 rounded-xl p-4 border border-sage-light">
                <p className="text-sm text-sage-dark">重置链接已发送到你的邮箱，请查收。</p>
                <p className="text-xs text-ink-light mt-2">如果没收到，请检查垃圾邮件文件夹。</p>
              </div>
              <Link href="/auth/login" className="block text-sm text-sage-dark font-medium underline underline-offset-2">
                返回登录
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="注册邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-paper-warm border border-cream rounded-xl focus:outline-none focus:border-sage transition-colors text-ink"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              />
              {error && <p className="text-rose-dark text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-sage text-paper rounded-xl font-medium disabled:opacity-50 shadow-sm active:scale-[0.98] transition-all"
                style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}
              >
                {loading ? '发送中...' : '发送重置链接'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-ink-light mt-5">
            <Link href="/auth/login" className="text-sage-dark font-medium underline underline-offset-2">
              返回登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
