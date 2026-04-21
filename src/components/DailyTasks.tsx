'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSmartSuggestions } from '@/lib/taskSuggestions'
import { useTimer } from './TimerContext'

interface Task {
  id: string
  title: string
  completed: boolean
}

export default function DailyTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [goal, setGoal] = useState('')
  const [newTask, setNewTask] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)
  const fetchedRef = useRef(false)
  const { state: timerState, taskName, start: startTimer } = useTimer()

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const supabase = createClient()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase.from('profiles').select('goal').eq('id', user.id).single()
      if (profile) setGoal(profile.goal)

      const { data: rows, error } = await supabase.from('daily_tasks').select('id, title, completed')
        .eq('user_id', user.id).eq('date', today).order('created_at')

      if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        setTableExists(false)
      } else if (rows) {
        setTasks(rows)
      }
      setLoading(false)
    }
    init()
  }, [today])

  async function addTask(title: string) {
    if (!title.trim() || !tableExists) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('daily_tasks').insert({
      user_id: user.id,
      title: title.trim(),
      date: today,
    }).select('id, title, completed').single()

    if (data) setTasks(prev => [...prev, data])
    setNewTask('')
    setShowSuggestions(false)
  }

  async function toggleTask(id: string, completed: boolean) {
    const supabase = createClient()
    await supabase.from('daily_tasks').update({ completed: !completed }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  async function deleteTask(id: string) {
    const supabase = createClient()
    await supabase.from('daily_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function handleStartTask(title: string) {
    startTimer(title)
  }

  const isTimerBusy = timerState !== 'idle'
  const completedCount = tasks.filter(t => t.completed).length
  const suggestions = getSmartSuggestions(goal, tasks.map(t => t.title))

  if (loading) return null

  if (!tableExists) {
    return (
      <div className="bg-paper rounded-2xl border border-cream p-4 shadow-sm">
        <div className="text-sm text-ink-light text-center py-4">
          任务功能需要执行数据库迁移后才可使用
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-paper rounded-2xl border border-cream p-4 shadow-sm paper-texture">
      {/* Washi tape */}
      <div className="absolute -top-1.5 left-8 w-20 h-2.5 bg-rose-light opacity-50 rounded-sm rotate-[-1deg]" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
            今日任务
          </span>
          {tasks.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-sage-light/40 text-sage-dark">
              {completedCount}/{tasks.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-xs px-3 py-1.5 rounded-full bg-lavender text-paper font-medium shadow-sm hover:shadow-md transition-all active:scale-95"
        >
          AI 推荐
        </button>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="h-1.5 bg-cream rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-sage rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / tasks.length) * 100}%` }}
          />
        </div>
      )}

      {/* AI suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mb-3 p-3 bg-lavender-light/40 rounded-xl border border-lavender-light notebook-lines">
          <p className="text-xs text-lavender font-medium mb-2">基于「{goal}」推荐：</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => addTask(s)}
                className="text-xs px-2.5 py-1.5 bg-paper rounded-lg border border-lavender-light text-ink-light hover:bg-lavender-light/30 transition-colors active:scale-95"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-1 mb-3">
        {tasks.map((task) => {
          const isActiveTask = isTimerBusy && taskName === task.title
          return (
            <div key={task.id} className={`flex items-center gap-2 group py-2 px-1.5 rounded-lg transition-colors ${
              isActiveTask ? 'bg-sage-light/20' : ''
            }`}>
              <button
                onClick={() => toggleTask(task.id, task.completed)}
                className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  task.completed
                    ? 'bg-sage border-sage text-paper'
                    : 'border-ink-light/30 hover:border-sage'
                }`}
              >
                {task.completed && (
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className={`text-sm flex-1 ${task.completed ? 'line-through text-ink-light/40' : 'text-ink'} ${isActiveTask ? 'text-sage-dark font-medium' : ''}`}>
                {task.title}
                {isActiveTask && <span className="ml-1.5 text-xs text-sage animate-pulse">计时中</span>}
              </span>

              {!task.completed && !isActiveTask && (
                <button
                  onClick={() => handleStartTask(task.title)}
                  disabled={isTimerBusy}
                  className="opacity-0 group-hover:opacity-100 disabled:opacity-30 text-sage hover:text-sage-dark transition-all active:scale-90 p-0.5"
                  title="开始计时"
                >
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              )}

              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-ink-light/30 hover:text-rose-dark transition-all text-xs p-0.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      {/* Add task input */}
      <form
        onSubmit={(e) => { e.preventDefault(); addTask(newTask) }}
        className="flex gap-2"
      >
        <input
          type="text"
          placeholder="写下新任务..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          className="flex-1 text-sm px-3 py-2 bg-paper-warm border border-cream rounded-lg focus:outline-none focus:border-sage transition-colors"
          style={{ fontFamily: "'Noto Serif SC', serif" }}
        />
        <button
          type="submit"
          disabled={!newTask.trim()}
          className="px-3 py-2 bg-sage text-paper rounded-lg text-sm font-medium disabled:opacity-30 active:scale-95 transition-transform"
        >
          添加
        </button>
      </form>
    </div>
  )
}
