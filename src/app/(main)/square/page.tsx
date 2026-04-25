'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppData, type SquarePost } from '@/components/AppDataContext'
import { Flower, Sprig } from '@/components/Botanicals'

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

export default function SquarePage() {
  const { ready, userId, squarePosts, loadSquarePosts, setSquarePosts } = useAppData()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [link, setLink] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [todayPosted, setTodayPosted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSquarePosts()
  }, [loadSquarePosts])

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
      setTodayPosted(true)
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
        nickname: profile?.nickname || '匿名',
        goal: profile?.goal || '',
      }
      setSquarePosts(prev => prev === null ? [newPost] : [newPost, ...prev])
    }

    setTitle('')
    setContent('')
    setLink('')
    setTodayPosted(true)
    setSubmitting(false)
  }

  const posts = squarePosts

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
      {/* Header */}
      <div className="relative mb-5">
        <h1 className="text-xl font-bold text-ink" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
          学习广场
        </h1>
        <p className="text-xs text-ink-light mt-1">分享你的学习资源，和大家一起进步</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-px bg-cream" />
          <Flower className="w-3 h-3 text-rose opacity-50" />
          <div className="w-8 h-px bg-cream" />
          <Flower className="w-2 h-2 text-lavender opacity-40" />
          <div className="flex-1 h-px bg-cream" />
        </div>
      </div>

      {/* Posts list */}
      <div className="flex-1 space-y-3 mb-4">
        {posts === null ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-paper rounded-xl border border-cream p-4 animate-pulse space-y-2">
              <div className="h-3 bg-cream rounded w-1/3" />
              <div className="h-2 bg-cream rounded w-full" />
              <div className="h-2 bg-cream rounded w-2/3" />
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-paper rounded-2xl border border-cream">
            <Sprig className="w-10 h-16 mx-auto text-sage mb-2" />
            <p className="text-ink-light">还没有人分享</p>
            <p className="text-xs text-ink-light/50 mt-1">成为第一个分享资源的人吧</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="relative bg-paper rounded-xl border border-cream p-4 shadow-sm paper-texture">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-lavender text-paper flex items-center justify-center text-xs font-bold">
                  {post.nickname.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-ink">{post.nickname}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-cream/60 text-ink-light rounded ml-1.5">{post.goal}</span>
                </div>
                <span className="text-xs text-ink-light/50 shrink-0">{timeAgo(post.created_at)}</span>
              </div>
              <h3 className="text-sm font-semibold text-ink mb-1" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>{post.title}</h3>
              <p className="text-sm text-ink-light leading-relaxed whitespace-pre-wrap">{post.content}</p>
              {post.link && (
                <a
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-lavender hover:text-lavender-light transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  查看链接
                </a>
              )}
            </div>
          ))
        )}
      </div>

      {/* Post form — fixed at bottom */}
      {ready && userId && (
        <div className="sticky bottom-16 bg-paper rounded-2xl border border-cream p-4 shadow-md paper-texture">
          {todayPosted ? (
            <p className="text-center text-sm text-ink-light py-2">今日已发布，明天再来吧 🌸</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <input
                type="text"
                placeholder="分享标题"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-paper-warm border border-cream rounded-lg focus:outline-none focus:border-lavender transition-colors"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              />
              <textarea
                placeholder="写下你想分享的内容..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={2}
                className="w-full text-sm px-3 py-2 bg-paper-warm border border-cream rounded-lg focus:outline-none focus:border-lavender resize-none transition-colors"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              />
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="链接（选填）"
                  value={link}
                  onChange={e => setLink(e.target.value)}
                  className="flex-1 text-sm px-3 py-2 bg-paper-warm border border-cream rounded-lg focus:outline-none focus:border-lavender transition-colors"
                />
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !content.trim()}
                  className="px-4 py-2 bg-lavender text-paper rounded-lg text-sm font-medium disabled:opacity-30 active:scale-95 transition-all"
                >
                  {submitting ? '发布中...' : '发布'}
                </button>
              </div>
              {error && <p className="text-xs text-rose-dark">{error}</p>}
            </form>
          )}
        </div>
      )}
    </div>
  )
}
