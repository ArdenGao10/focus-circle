'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTimer } from './TimerContext'

const tabs = [
  { href: '/', label: '计时', icon: '🌱' },
  { href: '/leaderboard', label: '排行', icon: '🌸' },
  { href: '/square', label: '广场', icon: '📖' },
  { href: '/profile', label: '我的', icon: '🍃' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { state } = useTimer()
  const isTimerRunning = state === 'running' || state === 'paused'

  useEffect(() => {
    tabs.forEach((tab) => {
      if (tab.href !== pathname) {
        router.prefetch(tab.href)
      }
    })
  }, [pathname, router])

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-paper/90 backdrop-blur-md border-t border-cream pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          const isTimer = tab.href === '/'
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center gap-0.5 text-xs transition-colors ${
                active ? 'text-ink font-medium' : 'text-ink-light/50'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="text-lg relative">
                {tab.icon}
                {isTimer && isTimerRunning && (
                  <span className="absolute -top-0.5 -right-1.5 w-2 h-2 bg-sage rounded-full animate-pulse" />
                )}
              </span>
              <span>{tab.label}</span>
              {active && (
                <span className="absolute -bottom-1 w-4 h-0.5 bg-sage rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
