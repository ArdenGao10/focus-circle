'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div
      className="min-h-full flex items-center justify-center px-6"
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
                fontSize: 24,
                fontWeight: 400,
                color: 'var(--aura-text-primary)',
                letterSpacing: '0.06em',
              }}
            >
              专注圈
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
              登录你的账号
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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
            <div className="flex justify-end">
              <Link
                href="/auth/forgot-password"
                style={{
                  fontFamily: 'var(--aura-font-sans)',
                  fontSize: 12,
                  color: 'var(--aura-text-muted)',
                }}
              >
                忘记密码？
              </Link>
            </div>
            {error && (
              <p style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 13, color: '#B25757' }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 14,
                letterSpacing: '0.2em',
                fontWeight: 500,
                color: loading ? 'var(--aura-text-muted)' : 'var(--aura-text-primary)',
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${loading ? 'rgba(0,0,0,0.2)' : 'var(--aura-text-primary)'}`,
                paddingBottom: 4,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <p
            className="text-center"
            style={{
              fontFamily: 'var(--aura-font-sans)',
              fontSize: 12,
              color: 'var(--aura-text-muted)',
              marginTop: 20,
            }}
          >
            还没有账号？{' '}
            <Link
              href="/auth/register"
              style={{ color: 'var(--aura-text-primary)', letterSpacing: '0.1em' }}
            >
              注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
