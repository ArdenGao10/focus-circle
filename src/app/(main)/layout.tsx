import BottomNav from '@/components/BottomNav'
import { TimerProvider } from '@/components/TimerContext'
import SessionSummary from '@/components/SessionSummary'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <TimerProvider>
      <div className="h-full flex flex-col">
        <main className="flex-1 pb-16 overflow-y-auto">{children}</main>
        <BottomNav />
        <SessionSummary />
      </div>
    </TimerProvider>
  )
}
