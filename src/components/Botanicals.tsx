'use client'

// Decorative SVG botanical elements for the journal theme
export function Leaf({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 58C20 58 2 40 2 24C2 8 20 2 20 2C20 2 38 8 38 24C38 40 20 58 20 58Z" fill="currentColor" opacity="0.15"/>
      <path d="M20 2V58" stroke="currentColor" strokeWidth="0.8" opacity="0.25"/>
      <path d="M20 15C25 12 30 14 32 18" stroke="currentColor" strokeWidth="0.5" opacity="0.2" fill="none"/>
      <path d="M20 25C14 22 10 24 8 28" stroke="currentColor" strokeWidth="0.5" opacity="0.2" fill="none"/>
      <path d="M20 35C26 32 30 34 32 38" stroke="currentColor" strokeWidth="0.5" opacity="0.2" fill="none"/>
    </svg>
  )
}

export function Flower({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="4" fill="currentColor" opacity="0.3"/>
      <ellipse cx="20" cy="10" rx="5" ry="8" fill="currentColor" opacity="0.1" transform="rotate(0 20 20)"/>
      <ellipse cx="20" cy="10" rx="5" ry="8" fill="currentColor" opacity="0.1" transform="rotate(72 20 20)"/>
      <ellipse cx="20" cy="10" rx="5" ry="8" fill="currentColor" opacity="0.1" transform="rotate(144 20 20)"/>
      <ellipse cx="20" cy="10" rx="5" ry="8" fill="currentColor" opacity="0.1" transform="rotate(216 20 20)"/>
      <ellipse cx="20" cy="10" rx="5" ry="8" fill="currentColor" opacity="0.1" transform="rotate(288 20 20)"/>
    </svg>
  )
}

export function Branch({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 35C20 30 40 20 60 18C80 16 100 20 115 15" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none"/>
      <ellipse cx="30" cy="22" rx="6" ry="10" fill="currentColor" opacity="0.08" transform="rotate(-30 30 22)"/>
      <ellipse cx="50" cy="17" rx="5" ry="9" fill="currentColor" opacity="0.08" transform="rotate(-15 50 17)"/>
      <ellipse cx="75" cy="16" rx="6" ry="10" fill="currentColor" opacity="0.08" transform="rotate(10 75 16)"/>
      <ellipse cx="95" cy="17" rx="5" ry="8" fill="currentColor" opacity="0.08" transform="rotate(25 95 17)"/>
      <circle cx="40" cy="15" r="2.5" fill="currentColor" opacity="0.12"/>
      <circle cx="65" cy="13" r="2" fill="currentColor" opacity="0.12"/>
      <circle cx="88" cy="14" r="2.5" fill="currentColor" opacity="0.12"/>
    </svg>
  )
}

export function Sprig({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 30 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 48V10" stroke="currentColor" strokeWidth="0.8" opacity="0.2"/>
      <ellipse cx="10" cy="15" rx="5" ry="8" fill="currentColor" opacity="0.1" transform="rotate(-20 10 15)"/>
      <ellipse cx="20" cy="22" rx="5" ry="8" fill="currentColor" opacity="0.1" transform="rotate(20 20 22)"/>
      <ellipse cx="11" cy="30" rx="4" ry="7" fill="currentColor" opacity="0.1" transform="rotate(-15 11 30)"/>
      <circle cx="15" cy="8" r="3" fill="currentColor" opacity="0.15"/>
    </svg>
  )
}
