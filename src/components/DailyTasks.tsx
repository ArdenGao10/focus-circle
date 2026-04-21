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
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="text-sm text-gray-400 text-center py-4">
          任务功能需要执行数据库迁移后才可使用
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">今日任务</span>
          {tasks.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-600 font-medium">
              {completedCount}/{tasks.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white font-medium shadow-sm hover:shadow-md transition-all active:scale-95"
        >
          AI 推荐
        </button>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / tasks.length) * 100}%` }}
          />
        </div>
      )}

      {/* AI suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mb-3 p-3 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
          <p className="text-xs text-violet-600 font-medium mb-2">基于「{goal}」推荐：</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => addTask(s)}
                className="text-xs px-2.5 py-1.5 bg-white rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors active:scale-95"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-1.5 mb-3">
        {tasks.map((task) => {
          const isActiveTask = isTimerBusy && taskName === task.title
          return (
            <div key={task.id} className={`flex items-center gap-2 group py-1.5 px-1 rounded-lg transition-colors ${
              isActiveTask ? 'bg-violet-50' : ''
            }`}>
              <button
                onClick={() => toggleTask(task.id, task.completed)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  task.completed
                    ? 'bg-gradient-to-br from-emerald-400 to-teal-400 border-emerald-400 text-white'
                    : 'border-gray-300 hover:border-emerald-400'
                }`}
              >
                {task.completed && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className={`text-sm flex-1 ${task.completed ? 'line-through text-gray-400' : ''} ${isActiveTask ? 'text-violet-700 font-medium' : ''}`}>
                {task.title}
                {isActiveTask && <span className="ml-1.5 text-xs text-violet-400 animate-pulse">计时中</span>}
              </span>

              {/* Start timer for this task */}
              {!task.completed && !isActiveTask && (
                <button
                  onClick={() => handleStartTask(task.title)}
                  disabled={isTimerBusy}
                  className="opacity-0 group-hover:opacity-100 disabled:opacity-30 text-violet-400 hover:text-violet-600 transition-all active:scale-90 p-0.5"
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
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs p-0.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          placeholder="添加任务..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          className="flex-1 text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
        />
        <button
          type="submit"
          disabled={!newTask.trim()}
          className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-30 active:scale-95 transition-transform"
        >
          添加
        </button>
      </form>
    </div>
  )
}
