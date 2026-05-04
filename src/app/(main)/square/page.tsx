'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppData, type SquarePost } from '@/components/AppDataContext'
import { avatarAuraGradient } from '@/lib/avatarAura'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

function linkLabel(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export default function SquarePage() {
  const { ready, userId, squarePosts, loadSquarePosts, setSquarePosts, postEncouragements, encouragePost } = useAppData()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [link, setLink] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [postedThisSession, setPostedThisSession] = useState(false)
  const [error, setError] = useState('')
  const [recentlyAnimated, setRecentlyAnimated] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    loadSquarePosts()
  }, [loadSquarePosts])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  async function handleEncourage(postId: string) {
    setRecentlyAnimated(prev => {
      const next = new Set(prev)
      next.add(postId)
      return next
    })
    setTimeout(() => {
      setRecentlyAnimated(prev => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })
    }, 500)
    const res = await encouragePost(postId)
    if (!res.ok) setToast('鼓励失败，请稍后再试')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !userId) return
    setError('')
    setSubmitting(true)

    const supabase = createClient()

    // Double-check today's post
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today + 'T00:00:00')
      .lt('created_at', today + 'T23:59:59.999')

    if (count && count > 0) {
      setError('今日已发布，明天再来吧')
      setPostedThisSession(true)
      setSubmitting(false)
      return
    }

    const { data, error: insertErr } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        title: title.trim() || '',
        content: content.trim(),
        link: link.trim() || null,
      })
      .select('id, title, content, link, created_at')
      .single()

    if (insertErr) {
      setError('发布失败，请重试')
      setSubmitting(false)
      return
    }

    if (data) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, goal')
        .eq('id', userId)
        .single()

      const newPost: SquarePost = {
        ...data,
        user_id: userId,
        nickname: profile?.nickname || '匿名',
        goal: profile?.goal || '',
      }
      setSquarePosts(prev => prev === null ? [newPost] : [newPost, ...prev])
    }

    setTitle('')
    setContent('')
    setLink('')
    setPostedThisSession(true)
    setSubmitting(false)
  }

  async function handleDelete(postId: string) {
    if (!userId) return
    const supabase = createClient()
    const { error: deleteErr } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId)

    if (deleteErr) {
      setToast('删除失败，请稍后再试')
      return
    }

    setSquarePosts(prev => prev ? prev.filter(p => p.id !== postId) : prev)
  }

  const posts = squarePosts
  const todayUtc = new Date().toISOString().slice(0, 10)
  const hasPostedToday = !!userId && (squarePosts ?? []).some(
    p => p.user_id === userId && p.created_at.slice(0, 10) === todayUtc
  )
  const todayPosted = postedThisSession || hasPostedToday

  const containerStyle: CSSProperties = {
    '--font-serif': 'var(--aura-font-serif)',
    '--font-sans': 'var(--aura-font-sans)',
    '--font-mono': 'var(--aura-font-mono)',
    '--text-primary': 'var(--aura-text-primary)',
    '--text-secondary': 'var(--aura-text-secondary)',
    '--text-muted': 'var(--aura-text-muted)',
  } as CSSProperties

  return (
    <div style={{ background: 'var(--aura-bg-primary)', color: 'var(--aura-text-primary)' }}>
      <main
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '40px 24px 80px',
          ...(containerStyle as CSSProperties),
        }}
      >
        <header
          style={{
            marginBottom: '40px',
            paddingBottom: '20px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '40px',
              fontWeight: 400,
              color: 'var(--text-primary)',
              marginBottom: '6px',
            }}
          >
            学习广场
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              color: 'var(--text-muted)',
              letterSpacing: '0.15em',
            }}
          >
            一起学习的人在分享
          </p>
        </header>

        {ready && userId && (
          <section
            style={{
              marginBottom: '48px',
              paddingBottom: '40px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                fontWeight: 500,
                letterSpacing: '0.18em',
                color: 'var(--text-muted)',
                marginBottom: '24px',
              }}
            >
              发布分享
            </h3>

            {todayPosted ? (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)' }}>
                今日已发布，明天再来吧
              </p>
            ) : (
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder="标题(选填)"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                    padding: '8px 0',
                    fontFamily: 'var(--font-serif)',
                    fontSize: '18px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    marginBottom: '20px',
                  }}
                />

                <textarea
                  placeholder="写下你想分享的内容..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                    padding: '8px 0',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '15px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    resize: 'vertical',
                    marginBottom: '20px',
                    lineHeight: 1.6,
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <input
                    type="url"
                    placeholder="链接(选填)"
                    value={link}
                    onChange={e => setLink(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(0,0,0,0.08)',
                      padding: '8px 0',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />

                  <button
                    type="submit"
                    disabled={submitting || !content.trim()}
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '13px',
                      letterSpacing: '0.2em',
                      fontWeight: 500,
                      color: submitting || !content.trim() ? 'var(--text-muted)' : 'var(--text-primary)',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: `1px solid ${submitting || !content.trim()
                        ? 'rgba(0,0,0,0.2)'
                        : 'var(--text-primary)'}`,
                      paddingBottom: '4px',
                      cursor: submitting || !content.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submitting ? '发布中...' : '发布'}
                  </button>
                </div>
                {error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#B25757', marginTop: 12 }}>{error}</p>}
              </form>
            )}
          </section>
        )}

        <section>
          {posts === null ? (
            [1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  paddingBottom: '32px',
                  marginBottom: '32px',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
                  <div className="flex-1">
                    <div className="h-3 w-24 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
                  </div>
                </div>
                <div className="h-4 w-2/3 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.06)' }} />
                <div className="h-3 w-full rounded animate-pulse mt-2" style={{ background: 'rgba(0,0,0,0.06)' }} />
              </div>
            ))
          ) : posts.length === 0 ? (
            <div
              className="text-center py-16"
              style={{
                borderRadius: 16,
                border: '1px solid rgba(0,0,0,0.06)',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
            >
              还没有人分享
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>成为第一个分享资源的人吧</div>
            </div>
          ) : (
            posts.map(post => {
              const isOwn = post.user_id === userId
              const hasEncouraged = !!userId && postEncouragements.some(e => e.post_id === post.id && e.user_id === userId)
              const encouragementCount = postEncouragements.filter(e => e.post_id === post.id).length
              const canEncourage = !!userId && !hasEncouraged && !isOwn

              return (
                <article
                  key={post.id}
                  style={{
                    paddingBottom: '32px',
                    marginBottom: '32px',
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: avatarAuraGradient(post.user_id),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-serif)',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        flexShrink: 0,
                      }}
                    >
                      {post.nickname.charAt(0)}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {post.nickname}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          · {post.goal}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {timeAgo(post.created_at)}
                    </span>
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(post.id)}
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px solid rgba(0,0,0,0.1)',
                          paddingBottom: '2px',
                          cursor: 'pointer',
                        }}
                      >
                        删除
                      </button>
                    )}
                  </div>

                  {post.title && post.title.trim() !== '' && (
                    <h3
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '20px',
                        fontWeight: 400,
                        color: 'var(--text-primary)',
                        marginBottom: '8px',
                        lineHeight: 1.4,
                      }}
                    >
                      {post.title}
                    </h3>
                  )}

                  <p
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '15px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.7,
                      marginBottom: post.link ? '12px' : '20px',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {post.content}
                  </p>

                  {post.link && (
                    <a
                      href={post.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        letterSpacing: '0.1em',
                        marginBottom: '20px',
                        borderBottom: '1px solid rgba(0,0,0,0.1)',
                        paddingBottom: '2px',
                      }}
                    >
                      {linkLabel(post.link)}
                    </a>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                      onClick={() => {
                        if (!canEncourage) return
                        handleEncourage(post.id)
                      }}
                      disabled={!canEncourage}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'transparent',
                        border: 'none',
                        cursor: canEncourage ? 'pointer' : 'default',
                        padding: '4px 0',
                      }}
                      aria-label={hasEncouraged ? '已鼓励' : '鼓励'}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path
                          d="M8 1 L9.5 6.5 L15 8 L9.5 9.5 L8 15 L6.5 9.5 L1 8 L6.5 6.5 Z"
                          fill={hasEncouraged ? 'rgba(111, 169, 137, 0.8)' : 'none'}
                          stroke={hasEncouraged ? 'rgba(111, 169, 137, 0.8)' : 'rgba(0,0,0,0.3)'}
                          strokeWidth="1"
                        />
                      </svg>
                      {isOwn && encouragementCount > 0 && (
                        <span
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {encouragementCount} 人鼓励了你
                        </span>
                      )}
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </section>

        {toast && (
          <div
            className="fixed bottom-24 left-1/2 -translate-x-1/2"
            style={{
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 999,
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              zIndex: 50,
            }}
          >
            {toast}
          </div>
        )}
      </main>
    </div>
  )
}
