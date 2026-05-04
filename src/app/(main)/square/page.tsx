'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppData, type SquarePost } from '@/components/AppDataContext'
import { Sprig } from '@/components/Botanicals'

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

function SparkleIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4 Z" />
    </svg>
  )
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
    if (!title.trim() || !content.trim() || !userId) return
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
      setError('今日已发布，明天再来吧 🌸')
      setPostedThisSession(true)
      setSubmitting(false)
      return
    }

    const { data, error: insertErr } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        title: title.trim(),
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

  const posts = squarePosts
  const todayUtc = new Date().toISOString().slice(0, 10)
  const hasPostedToday = !!userId && (squarePosts ?? []).some(
    p => p.user_id === userId && p.created_at.slice(0, 10) === todayUtc
  )
  const todayPosted = postedThisSession || hasPostedToday

  return (
    <div style={{ background: 'var(--aura-bg-primary)', color: 'var(--aura-text-primary)' }}>
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
        {/* Header */}
        <div className="relative mb-5">
          <h1
            style={{
              fontFamily: 'var(--aura-font-serif)',
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: '0.05em',
              color: 'var(--aura-text-primary)',
            }}
          >
            学习广场
          </h1>
          <p
            style={{
              fontFamily: 'var(--aura-font-sans)',
              fontSize: 12,
              color: 'var(--aura-text-muted)',
              marginTop: 6,
              letterSpacing: '0.08em',
            }}
          >
            shared by people studying alongside you
          </p>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginTop: 16 }} />
        </div>

        {/* Posts list — bottom padding clears the sticky form when scrolling */}
        <div className={`flex-1 space-y-3 ${ready && userId ? (todayPosted ? 'pb-28' : 'pb-60') : 'mb-4'}`}>
          {posts === null ? (
            [1, 2, 3].map(i => (
              <div
                key={i}
                className="rounded-xl p-4 animate-pulse space-y-2"
                style={{ background: 'var(--aura-bg-elevated)', border: '1px solid rgba(0,0,0,0.06)' }}
              >
                <div className="h-3 rounded w-1/3" style={{ background: 'rgba(0,0,0,0.08)' }} />
                <div className="h-2 rounded w-full" style={{ background: 'rgba(0,0,0,0.06)' }} />
                <div className="h-2 rounded w-2/3" style={{ background: 'rgba(0,0,0,0.06)' }} />
              </div>
            ))
          ) : posts.length === 0 ? (
            <div
              className="text-center py-16"
              style={{ background: 'var(--aura-bg-elevated)', borderRadius: 24, border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <Sprig className="w-10 h-16 mx-auto" style={{ color: 'var(--aura-text-muted)' }} />
              <p style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 13, color: 'var(--aura-text-secondary)' }}>还没有人分享</p>
              <p style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 11, color: 'var(--aura-text-muted)', marginTop: 6 }}>
                成为第一个分享资源的人吧
              </p>
            </div>
          ) : (
            posts.map(post => {
              const isOwner = !!userId && post.user_id === userId
              const myEncouraged = !!userId && postEncouragements.some(e => e.post_id === post.id && e.user_id === userId)
              const ownerCount = isOwner ? postEncouragements.filter(e => e.post_id === post.id).length : 0
              const showFooter = !!userId && (!isOwner || (isOwner && ownerCount > 0))
              return (
                <div
                  key={post.id}
                  style={{
                    position: 'relative',
                    background: 'var(--aura-bg-elevated)',
                    borderRadius: 18,
                    border: '1px solid rgba(0,0,0,0.06)',
                    padding: 16,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{
                        fontFamily: 'var(--aura-font-sans)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--aura-text-primary)',
                        border: '1px solid rgba(0,0,0,0.12)',
                        background: 'rgba(0,0,0,0.04)',
                      }}
                    >
                      {post.nickname.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 13, color: 'var(--aura-text-primary)' }}>
                        {post.nickname}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--aura-font-mono)',
                          fontSize: 10,
                          color: 'var(--aura-text-muted)',
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: 999,
                          padding: '2px 6px',
                          marginLeft: 8,
                        }}
                      >
                        {post.goal}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'var(--aura-font-mono)', fontSize: 10, color: 'var(--aura-text-muted)' }}>
                      {timeAgo(post.created_at)}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--aura-font-serif)',
                      fontSize: 15,
                      fontWeight: 500,
                      color: 'var(--aura-text-primary)',
                      marginBottom: 6,
                    }}
                  >
                    {post.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: 'var(--aura-font-sans)',
                      fontSize: 13,
                      color: 'var(--aura-text-secondary)',
                      lineHeight: 1.7,
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
                      className="inline-flex items-center gap-1 mt-2"
                      style={{
                        fontFamily: 'var(--aura-font-sans)',
                        fontSize: 12,
                        color: 'var(--aura-text-secondary)',
                      }}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      查看链接
                    </a>
                  )}
                  {showFooter && (
                    <div
                      className="flex items-center justify-end mt-3"
                      style={{ paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)' }}
                    >
                      {isOwner ? (
                        <span
                          className="inline-flex items-center gap-1"
                          style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 12, color: 'var(--aura-text-secondary)' }}
                        >
                          <SparkleIcon filled className="w-3.5 h-3.5" />
                          {ownerCount} 人鼓励了你
                        </span>
                      ) : (
                        <button
                          onClick={() => handleEncourage(post.id)}
                          disabled={myEncouraged}
                          aria-label={myEncouraged ? '已鼓励' : '鼓励'}
                          className="p-1.5 rounded-full"
                          style={{
                            cursor: myEncouraged ? 'default' : 'pointer',
                            opacity: myEncouraged ? 0.6 : 1,
                            background: myEncouraged ? 'transparent' : 'rgba(0,0,0,0.04)',
                          }}
                        >
                          <SparkleIcon
                            filled={myEncouraged}
                            className={`w-5 h-5 ${recentlyAnimated.has(post.id) ? 'animate-encourage-pop' : ''}`}
                            style={{ color: myEncouraged ? 'var(--aura-text-primary)' : 'var(--aura-text-muted)' }}
                          />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Post form — fixed at bottom */}
        {ready && userId && (
          <div
            className="sticky bottom-16"
            style={{
              background: 'var(--aura-bg-elevated)',
              borderRadius: 24,
              border: '1px solid rgba(0,0,0,0.06)',
              padding: 16,
            }}
          >
            {todayPosted ? (
              <p
                className="text-center"
                style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 13, color: 'var(--aura-text-muted)', padding: '6px 0' }}
              >
                今日已发布，明天再来吧
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2.5">
                <input
                  type="text"
                  placeholder="分享标题"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
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
                <textarea
                  placeholder="写下你想分享的内容..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={2}
                  className="w-full focus:outline-none resize-none"
                  style={{
                    fontFamily: 'var(--aura-font-sans)',
                    fontSize: 13,
                    color: 'var(--aura-text-primary)',
                    background: 'transparent',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 12,
                    padding: '10px 12px',
                  }}
                />
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="链接（选填）"
                    value={link}
                    onChange={e => setLink(e.target.value)}
                    className="flex-1 focus:outline-none"
                    style={{
                      fontFamily: 'var(--aura-font-sans)',
                      fontSize: 13,
                      color: 'var(--aura-text-primary)',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(0,0,0,0.12)',
                      padding: '8px 0',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={submitting || !title.trim() || !content.trim()}
                    style={{
                      fontFamily: 'var(--aura-font-sans)',
                      fontSize: 13,
                      letterSpacing: '0.2em',
                      fontWeight: 500,
                      color: submitting || !title.trim() || !content.trim()
                        ? 'var(--aura-text-muted)'
                        : 'var(--aura-text-primary)',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: `1px solid ${submitting || !title.trim() || !content.trim()
                        ? 'rgba(0,0,0,0.2)'
                        : 'var(--aura-text-primary)'}`,
                      paddingBottom: 4,
                      cursor: submitting || !title.trim() || !content.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submitting ? '发布中...' : '发布'}
                  </button>
                </div>
                {error && <p style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 12, color: '#B25757' }}>{error}</p>}
              </form>
            )}
          </div>
        )}

        {toast && (
          <div
            className="fixed bottom-24 left-1/2 -translate-x-1/2"
            style={{
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 999,
              fontFamily: 'var(--aura-font-sans)',
              fontSize: 12,
              zIndex: 50,
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}
