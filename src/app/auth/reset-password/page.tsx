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
              设置新密码
            </h1>
            <p
              style={{
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 12,
                color: 'var(--aura-text-muted)',
                marginTop: 6,
              }}
            >
              请输入你的新密码
            </p>
          </div>

          {success ? (
            <div
              style={{
                borderRadius: 16,
                padding: 16,
                border: '1px solid rgba(0,0,0,0.08)',
                textAlign: 'center',
              }}
            >
              <p style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 13, color: 'var(--aura-text-primary)' }}>
                密码已更新，正在跳转登录页面...
              </p>
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
                placeholder="确认新密码"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
                {loading ? '更新中...' : '确认更新'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
