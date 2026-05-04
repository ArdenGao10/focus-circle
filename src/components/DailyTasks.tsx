'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSmartSuggestions } from '@/lib/taskSuggestions'
import { useTimer } from './TimerContext'
import { useAppData } from './AppDataContext'
import AITaskModal from './AITaskModal'

// Chinese text-button: sans + 0.2em tracking + 1px underline beneath the
// glyphs themselves (no hover-extend — the underline matches the text width).
const cnButton: React.CSSProperties = {
  fontFamily: 'var(--aura-font-sans)',
  letterSpacing: '0.2em',
  fontWeight: 500,
}

interface DailyTasksProps {
  titleStyle?: React.CSSProperties
}

export default function DailyTasks({ titleStyle }: DailyTasksProps) {
  const [newTask, setNewTask] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { state: timerState, taskName, start: startTimer } = useTimer()
  const { ready, userId, profile, dailyTasks: tasks, setDailyTasks: setTasks } = useAppData()

  function showError(msg: string) {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(null), 3000)
  }

  const goal = profile?.goal || ''
  const today = new Date().toISOString().split('T')[0]

  async function addTask(title: string) {
    if (!title.trim() || !userId) return
    const trimmed = title.trim()
    const tempId = `temp-${Date.now()}`
    const optimistic = { id: tempId, title: trimmed, completed: false, date: today, source: 'manual' as const }

    setTasks(prev => [...prev, optimistic])
    setNewTask('')
    setShowSuggestions(false)

    const supabase = createClient()
    const { data, error } = await supabase.from('daily_tasks').insert({
      user_id: userId,
      title: trimmed,
      date: today,
      source: 'manual',
    }).select('id, title, completed, date, source').single()

    if (error || !data) {
      setTasks(prev => prev.filter(t => t.id !== tempId))
      showError('添加失败，请重试')
    } else {
      setTasks(prev => prev.map(t => t.id === tempId ? data : t))
    }
  }

  async function addMultipleTasks(titles: string[]) {
    if (!userId) return
    const supabase = createClient()
    const rows = titles.map(t => ({ user_id: userId, title: t.trim(), date: today, source: 'ai_suggested' as const }))
    const { data } = await supabase.from('daily_tasks').insert(rows).select('id, title, completed, date, source')
    if (data) setTasks(prev => [...prev, ...data])
  }

  async function toggleTask(id: string, completed: boolean) {
    const newCompleted = !completed
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newCompleted } : t))

    const supabase = createClient()
    const { error } = await supabase.from('daily_tasks').update({ completed: newCompleted }).eq('id', id)
    if (error) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed } : t))
      showError('标记失败，请重试')
    }
  }

  async function deleteTask(id: string) {
    const removed = tasks.find(t => t.id === id)
    setTasks(prev => prev.filter(t => t.id !== id))

    const supabase = createClient()
    const { error } = await supabase.from('daily_tasks').delete().eq('id', id)
    if (error && removed) {
      setTasks(prev => [...prev, removed])
      showError('删除失败，请重试')
    }
  }

  function handleStartTask(title: string, source: 'ai_suggested' | 'manual') {
    startTimer(title, source)
  }

  const isTimerBusy = timerState !== 'idle'
  const todayTasks = tasks.filter(t => t.date === today)
  const completedCount = todayTasks.filter(t => t.completed).length
  const suggestions = getSmartSuggestions(goal, todayTasks.map(t => t.title))

  if (!ready) {
    return (
      <div style={{ marginTop: 40 }}>
        <div className="h-3 w-24 animate-pulse" style={{ background: 'rgba(0,0,0,0.06)' }} />
      </div>
    )
  }

  const mergedTitleStyle: React.CSSProperties = {
    fontFamily: 'var(--aura-font-sans)',
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.18em',
    color: 'var(--aura-text-muted)',
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    ...titleStyle,
  }

  return (
    <div>
      {errorMsg && (
        <div
          className="mb-3 px-3 py-2"
          style={{
            fontFamily: 'var(--aura-font-sans)',
            fontSize: 12,
            color: 'var(--aura-text-secondary)',
            background: 'rgba(0,0,0,0.03)',
            borderRadius: 8,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Header: title + count + AI 推荐 */}
      <div className="flex items-baseline justify-between" style={{ marginTop: 48, marginBottom: 20 }}>
        <h3 style={mergedTitleStyle}>
          今日任务
          <span
            style={{
              fontFamily: 'var(--aura-font-mono)',
              fontSize: 11,
              color: 'var(--aura-text-muted)',
              letterSpacing: '0.1em',
              fontVariantNumeric: 'tabular-nums lining-nums',
            }}
          >
            {todayTasks.length > 0 ? `${completedCount}/${todayTasks.length}` : '0/0'}
          </span>
        </h3>
        <button
          onClick={() => setShowAIModal(true)}
          style={{
            ...cnButton,
            fontSize: 12,
            letterSpacing: '0.18em',
            color: 'var(--aura-text-primary)',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--aura-text-primary)',
            paddingBottom: 2,
            cursor: 'pointer',
          }}
        >
          AI 推荐
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => addTask(s)}
              style={{
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 13,
                color: 'var(--aura-text-secondary)',
                background: 'transparent',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 999,
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {/* Tasks list — padding-based rows mirroring 今日记录 */}
      <div>
        {todayTasks.map((task) => {
          const isActiveTask = isTimerBusy && taskName === task.title
          return (
            <div
              key={task.id}
              className="group"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 0',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
              }}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleTask(task.id, task.completed)}
                aria-label={task.completed ? '取消完成' : '标记完成'}
                style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: task.completed ? 'var(--aura-text-primary)' : 'transparent',
                  border: task.completed ? 'none' : '1px solid rgba(0,0,0,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                {task.completed && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <span
                className="flex-1 truncate"
                style={{
                  fontFamily: 'var(--aura-font-sans)',
                  fontSize: 15,
                  color: 'var(--aura-text-primary)',
                  textDecoration: task.completed ? 'line-through' : 'none',
                  opacity: task.completed ? 0.4 : 1,
                }}
              >
                {task.title}
                {isActiveTask && (
                  <span
                    className="ml-2"
                    style={{
                      fontFamily: 'var(--aura-font-sans)',
                      fontSize: 11,
                      letterSpacing: '0.2em',
                      color: 'var(--aura-green-solid)',
                    }}
                  >
                    计时中
                  </span>
                )}
              </span>

              {/* Hover-revealed actions: start + delete */}
              {!task.completed && !isActiveTask && (
                <button
                  onClick={() => handleStartTask(task.title, task.source)}
                  disabled={isTimerBusy}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    fontFamily: 'var(--aura-font-sans)',
                    letterSpacing: '0.2em',
                    fontSize: 11,
                    color: 'var(--aura-text-secondary)',
                    background: 'transparent',
                    border: 'none',
                    padding: '0 4px',
                    cursor: 'pointer',
                  }}
                  title="开始计时"
                >
                  开始
                </button>
              )}
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  fontFamily: 'var(--aura-font-mono)',
                  fontSize: 14,
                  lineHeight: 1,
                  color: 'var(--aura-text-muted)',
                  background: 'transparent',
                  border: 'none',
                  padding: '0 4px',
                  cursor: 'pointer',
                }}
                aria-label="删除"
              >
                ×
              </button>
            </div>
          )
        })}

        {/* Add task — dashed-circle marker + input + 添加 */}
        <form
          onSubmit={(e) => { e.preventDefault(); addTask(newTask) }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 0',
          }}
        >
          <span
            style={{
              width: 16, height: 16, borderRadius: '50%',
              border: '1px dashed rgba(0,0,0,0.2)',
              flexShrink: 0,
            }}
          />
          <input
            type="text"
            placeholder="写下新任务..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="flex-1 focus:outline-none"
            style={{
              fontFamily: 'var(--aura-font-sans)',
              fontSize: 15,
              color: 'var(--aura-text-primary)',
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
          />
          <button
            type="submit"
            disabled={!newTask.trim()}
            style={{
              ...cnButton,
              fontSize: 12,
              letterSpacing: '0.18em',
              color: newTask.trim() ? 'var(--aura-text-primary)' : 'var(--aura-text-muted)',
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${newTask.trim() ? 'var(--aura-text-primary)' : 'rgba(0,0,0,0.15)'}`,
              paddingBottom: 2,
              cursor: newTask.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            添加
          </button>
        </form>
      </div>

      {showAIModal && (
        <AITaskModal
          defaultGoal={goal}
          onClose={() => setShowAIModal(false)}
          onAddTasks={addMultipleTasks}
        />
      )}
    </div>
  )
}
