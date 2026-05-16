'use client'

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useTimer, useLiveElapsed } from './TimerContext'

/**
 * Document Picture-in-Picture floating timer (PRD 一期).
 *
 * Why a delegated native listener instead of React onClick:
 * the PiP window is a *separate document*. Native events can't bubble
 * across documents, so React's synthetic-event listener on the main
 * root never sees clicks inside the PiP window. We keep <MiniTimer/>
 * in the main React tree via createPortal (so useTimer() works and it
 * re-renders every second), but wire buttons through a click listener
 * attached to the PiP document itself.
 */

interface DocumentPiP {
  requestWindow(opts?: { width?: number; height?: number }): Promise<Window>
  window: Window | null
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPiP
  }
}

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`
  return `${pad2(m)}:${pad2(s)}`
}

const SERIF = "'LXGW WenKai', '霞鹜文楷', 'Source Han Serif SC', Georgia, serif"
const SANS = "'PingFang SC', 'Hiragino Sans GB', system-ui, sans-serif"

/** Rendered *inside* the PiP window via createPortal. Stays in the main
 *  React tree, so useTimer()/useLiveElapsed() keep working. */
function MiniTimer({ pipWindow }: { pipWindow: Window }) {
  const { state, taskName, pause, resume, end, saving } = useTimer()
  const elapsed = useLiveElapsed()
  const paused = state === 'paused'

  // Inject the one keyframe we need — PiP document has no stylesheet.
  useEffect(() => {
    const style = pipWindow.document.createElement('style')
    style.textContent = '@keyframes pip-pulse{0%,100%{opacity:1}50%{opacity:.25}}'
    pipWindow.document.head.appendChild(style)
    return () => { style.remove() }
  }, [pipWindow])

  // Delegated click listener on the PiP document (see file header).
  useEffect(() => {
    const handler = (e: Event) => {
      const el = (e.target as HTMLElement).closest('[data-pip-action]')
      if (!el) return
      const action = el.getAttribute('data-pip-action')
      if (action === 'toggle') {
        if (state === 'running') pause()
        else if (state === 'paused') resume()
      } else if (action === 'end') {
        end()
      }
    }
    const doc = pipWindow.document
    doc.addEventListener('click', handler)
    return () => doc.removeEventListener('click', handler)
  }, [pipWindow, state, pause, resume, end])

  const accent = paused ? '#B09CD9' : '#5C8A70'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        height: '100%',
        fontFamily: SANS,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accent,
            animation: paused ? 'none' : 'pip-pulse 2.4s ease-in-out infinite',
          }}
        />
        <span
          style={{
            fontSize: 12,
            letterSpacing: '0.08em',
            color: '#6B6B6B',
            maxWidth: 220,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {taskName?.trim() || (paused ? '已暂停' : '专注中')}
        </span>
      </div>

      <div
        style={{
          fontFamily: SERIF,
          fontSize: 46,
          fontWeight: 400,
          lineHeight: 1,
          color: '#1A1A1A',
          letterSpacing: '0.02em',
          fontVariantNumeric: 'tabular-nums lining-nums',
        }}
      >
        {formatTime(elapsed)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <button
          data-pip-action="toggle"
          style={{
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.16em',
            color: '#1A1A1A',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid #1A1A1A',
            paddingBottom: 3,
            cursor: 'pointer',
          }}
        >
          {paused ? '继续' : '暂停'}
        </button>
        <button
          data-pip-action="end"
          disabled={saving}
          style={{
            fontFamily: SANS,
            fontSize: 12,
            letterSpacing: '0.16em',
            color: '#A0A0A0',
            background: 'transparent',
            border: 'none',
            cursor: saving ? 'default' : 'pointer',
          }}
        >
          {saving ? '保存中…' : '结束'}
        </button>
      </div>
    </div>
  )
}

const noopSubscribe = () => () => {}

/** Client-only support flag read without a hydration mismatch:
 *  server snapshot is false, client snapshot reads the real API. */
function usePipSupported() {
  return useSyncExternalStore(
    noopSubscribe,
    () => 'documentPictureInPicture' in window,
    () => false,
  )
}

export default function PipTimerButton() {
  const { state } = useTimer()
  const supported = usePipSupported()
  const [pipWindow, setPipWindow] = useState<Window | null>(null)

  // Auto-close the floating window when the session ends.
  useEffect(() => {
    if (state === 'idle' && pipWindow) pipWindow.close()
  }, [state, pipWindow])

  // Close the window if this component unmounts (route change).
  useEffect(() => {
    return () => { pipWindow?.close() }
  }, [pipWindow])

  const open = useCallback(async () => {
    const pip = window.documentPictureInPicture
    if (!pip) return
    const win = await pip.requestWindow({ width: 320, height: 210 })
    const body = win.document.body
    body.style.margin = '0'
    body.style.height = '100vh'
    body.style.background = '#FBFBFB'
    body.style.color = '#1A1A1A'
    win.addEventListener('pagehide', () => setPipWindow(null), { once: true })
    setPipWindow(win)
  }, [])

  // Hidden unless a timer is active and the browser supports the API.
  if (state === 'idle' || !supported) return null

  return (
    <>
      <button
        onClick={pipWindow ? () => pipWindow.close() : open}
        className="mt-7"
        style={{
          fontFamily: 'var(--aura-font-sans)',
          fontSize: 12,
          letterSpacing: '0.2em',
          color: 'var(--aura-text-muted)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {pipWindow ? '收起悬浮窗' : '弹出悬浮窗'}
      </button>
      {pipWindow && createPortal(<MiniTimer pipWindow={pipWindow} />, pipWindow.document.body)}
    </>
  )
}
