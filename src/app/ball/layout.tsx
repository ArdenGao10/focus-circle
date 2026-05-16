import { TimerProvider } from '@/components/TimerContext'
import { AppDataProvider } from '@/components/AppDataContext'

/**
 * Layout for the floating-ball window (PRD 二期).
 *
 * Lives outside the (main) route group on purpose: the ball window must
 * NOT carry BottomNav / SessionSummary / TimerRecovery. It still needs
 * AppDataProvider + TimerProvider so the orb reads the same server-backed
 * timer state (active_timers + Realtime) as the main window.
 *
 * The injected <style> does two things required by the desktop shell:
 *   1. overrides the opaque body background from globals.css to
 *      transparent, so the native frameless window shows only the orb;
 *   2. marks the body as an Electron drag region (-webkit-app-region),
 *      so the user can drag the whole ball to reposition it.
 * Both are harmless in a plain browser.
 */
export default function BallLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProvider>
      <TimerProvider>
        <style>{[
          'html,body{background:transparent!important;margin:0;height:100%;overflow:hidden}',
          'body{-webkit-app-region:drag}',
          '@keyframes ball-spin{to{transform:rotate(360deg)}}',
          '@keyframes ball-pulse{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.42);opacity:0}}',
          '@keyframes ball-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}',
        ].join('')}</style>
        {children}
      </TimerProvider>
    </AppDataProvider>
  )
}
