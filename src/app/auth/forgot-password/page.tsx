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
                fontSize: 20,
                fontWeight: 400,
                color: 'var(--aura-text-primary)',
                letterSpacing: '0.06em',
              }}
            >
              找回密码
            </h1>
            <p
              style={{
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 12,
                color: 'var(--aura-text-muted)',
                marginTop: 6,
                lineHeight: 1.6,
              }}
            >
              输入你的注册邮箱，我们会发送重置链接
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div
                style={{
                  borderRadius: 16,
                  padding: 16,
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                <p style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 13, color: 'var(--aura-text-primary)' }}>
                  重置链接已发送到你的邮箱，请查收。
                </p>
                <p style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 12, color: 'var(--aura-text-muted)', marginTop: 8 }}>
                  如果没收到，请检查垃圾邮件文件夹。
                </p>
              </div>
              <Link
                href="/auth/login"
                style={{
                  fontFamily: 'var(--aura-font-sans)',
                  fontSize: 13,
                  color: 'var(--aura-text-primary)',
                  letterSpacing: '0.1em',
                }}
              >
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
                {loading ? '发送中...' : '发送重置链接'}
              </button>
            </form>
          )}

          <p
            className="text-center"
            style={{
              fontFamily: 'var(--aura-font-sans)',
              fontSize: 12,
              color: 'var(--aura-text-muted)',
              marginTop: 20,
            }}
          >
            <Link href="/auth/login" style={{ color: 'var(--aura-text-primary)', letterSpacing: '0.1em' }}>
              返回登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
