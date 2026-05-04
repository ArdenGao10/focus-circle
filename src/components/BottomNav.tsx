'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTimer } from './TimerContext'

const tabs = [
  { href: '/',            zh: '计时', en: 'TIMER' },
  { href: '/leaderboard', zh: '排行', en: 'RANK'  },
  { href: '/square',      zh: '广场', en: 'SQUARE'},
  { href: '/profile',     zh: '我的', en: 'ME'    },
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
        background: 'var(--aura-bg-elevated)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-4">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          const isTimer = tab.href === '/'
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-col items-center justify-center gap-1"
              style={{ minWidth: 56 }}
            >
              {/* Chinese label */}
              <span
                style={{
                  fontFamily: 'var(--aura-font-sans)',
                  fontSize: 14,
                  color: active ? 'var(--aura-text-primary)' : 'var(--aura-text-secondary)',
                  position: 'relative',
                }}
              >
                {tab.zh}
                {/* Live-timer indicator: tiny dot, no background pill */}
                {isTimer && isTimerRunning && (
                  <span
                    aria-hidden="true"
                    className="absolute"
                    style={{
                      top: -2, right: -8,
                      width: 5, height: 5, borderRadius: '50%',
                      background: 'var(--aura-green-solid)',
                    }}
                  />
                )}
              </span>

              {/* English label */}
              <span
                style={{
                  fontFamily: 'var(--aura-font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.3em',
                  color: 'var(--aura-text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                {tab.en}
              </span>

              {/* Active underline — width matches the Chinese label (text-only, 14px → ~28px for two CJK chars) */}
              {active && (
                <span
                  className="absolute"
                  style={{
                    bottom: -6,
                    height: 2,
                    width: 28,
                    background: 'var(--aura-green-solid)',
                  }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
