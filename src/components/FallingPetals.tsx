'use client'

const PETALS = [
  { emoji: '🌸', left: '8%', delay: '0s', duration: '12s', size: 'text-base' },
  { emoji: '🍃', left: '22%', delay: '3s', duration: '15s', size: 'text-sm' },
  { emoji: '🌸', left: '45%', delay: '1s', duration: '13s', size: 'text-lg' },
  { emoji: '🍃', left: '65%', delay: '5s', duration: '14s', size: 'text-xs' },
  { emoji: '🌸', left: '80%', delay: '2s', duration: '11s', size: 'text-sm' },
  { emoji: '🍃', left: '35%', delay: '7s', duration: '16s', size: 'text-base' },
]

export default function FallingPetals() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className={`absolute ${p.size} animate-petal-fall`}
          style={{
            left: p.left,
            top: '-2rem',
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  )
}
