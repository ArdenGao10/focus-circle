'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTimer } from './TimerContext'

const tabs = [
  { href: '/', label: '计时', icon: '⏱' },
  { href: '/leaderboard', label: '排行', icon: '🏆' },
  { href: '/profile', label: '我的', icon: '👤' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { state } = useTimer()
  const isTimerRunning = state === 'running' || state === 'paused'

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          const isTimer = tab.href === '/'
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center gap-0.5 text-xs transition-colors ${
                active ? 'text-violet-600 font-medium' : 'text-gray-400'
              }`}
            >
              <span className="text-lg relative">
                {tab.icon}
                {isTimer && isTimerRunning && (
                  <span className="absolute -top-0.5 -right-1.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                )}
              </span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
