import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--aura-bg-primary)' }}
    >
      <div className="w-full max-w-sm text-center">
        <div
          style={{
            background: 'var(--aura-bg-elevated)',
            borderRadius: 24,
            border: '1px solid rgba(0,0,0,0.06)',
            padding: 32,
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--aura-font-serif)',
              fontSize: 20,
              fontWeight: 400,
              color: 'var(--aura-text-primary)',
              marginBottom: 10,
              letterSpacing: '0.04em',
            }}
          >
            这里好像什么都没有
          </h1>
          <p
            style={{
              fontFamily: 'var(--aura-font-sans)',
              fontSize: 13,
              color: 'var(--aura-text-secondary)',
              lineHeight: 1.7,
              marginBottom: 28,
            }}
          >
            你可能点到了失效的链接，
            <br />
            或者这个页面还在生成。
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/"
              style={{
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 13,
                letterSpacing: '0.2em',
                color: 'var(--aura-text-primary)',
                background: 'transparent',
                borderBottom: '1px solid var(--aura-text-primary)',
                paddingBottom: 4,
              }}
            >
              去计时
            </Link>
            <Link
              href="/"
              style={{
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 13,
                letterSpacing: '0.2em',
                color: 'var(--aura-text-muted)',
                background: 'transparent',
                borderBottom: '1px solid var(--aura-text-muted)',
                paddingBottom: 4,
              }}
            >
              回到首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
