'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTimer } from './TimerContext'

const tabs = [
  { href: '/',            label: '计时' },
  { href: '/leaderboard', label: '排行榜' },
  { href: '/square',      label: '广场' },
  { href: '/profile',     label: '我的' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { state } = useTimer()
  const isTimerRunning = state === 'running' || state === 'paused'

  useEffect(() => {
    tabs.forEach((tab) => {
      if (tab.href !== pathname) router.prefetch(tab.href)
    })
  }, [pathname, router])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)]"
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0, 0, 0, 0.04)',
        zIndex: 50,
      }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto" style={{ height: 64 }}>
        {tabs.map((tab) => {
          const active = pathname === tab.href
          const isTimer = tab.href === '/'
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-col items-center justify-center"
              style={{ gap: 6, minWidth: 56, padding: '4px 8px' }}
            >
              <span
                style={{
                  fontFamily: active ? 'var(--aura-font-serif)' : 'var(--aura-font-sans)',
                  fontSize: active ? 14 : 13,
                  fontWeight: 400,
                  color: active ? 'var(--aura-text-primary)' : 'var(--aura-text-muted)',
                  letterSpacing: '0.05em',
                  position: 'relative',
                  transition: 'color 0.3s ease',
                }}
              >
                {tab.label}
                {/* Live timer indicator: tiny green dot, no halo (nav stays quiet) */}
                {isTimer && isTimerRunning && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -8,
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'var(--aura-green-solid)',
                    }}
                  />
                )}
              </span>

              {/* Active indicator: 4px dot beneath the label */}
              <span
                aria-hidden="true"
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: active ? 'var(--aura-text-primary)' : 'transparent',
                  transition: 'background 0.3s ease',
                }}
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
