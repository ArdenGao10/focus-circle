'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/onboarding')
      router.refresh()
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-paper rounded-2xl border border-cream p-6 shadow-sm paper-texture">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">🌸</div>
            <h1 className="text-2xl font-bold text-ink" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
              专注圈
            </h1>
            <p className="text-ink-light text-xs mt-1">创建新账号</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-paper-warm border border-cream rounded-xl focus:outline-none focus:border-sage transition-colors text-ink"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            />
            <input
              type="password"
              placeholder="密码（至少6位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-light mt-5">
            已有账号？{' '}
            <Link href="/auth/login" className="text-sage-dark font-medium underline underline-offset-2">
              登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
