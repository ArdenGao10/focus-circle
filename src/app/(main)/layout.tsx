import BottomNav from '@/components/BottomNav'
import { TimerProvider } from '@/components/TimerContext'
import { AppDataProvider } from '@/components/AppDataContext'
import SessionSummary from '@/components/SessionSummary'
import TimerRecovery from '@/components/TimerRecovery'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProvider>
      <TimerProvider>
        <div className="h-full flex flex-col">
          <main className="flex-1 pb-16 overflow-y-auto">{children}</main>
          <BottomNav />
          <SessionSummary />
          <TimerRecovery />
        </div>
      </TimerProvider>
    </AppDataProvider>
  )
}
