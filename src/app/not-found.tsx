import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm text-center">
        <div className="bg-paper rounded-2xl border border-cream p-8 shadow-sm paper-texture">
          <div className="text-5xl mb-4">🌱</div>
          <h1 className="text-xl font-bold text-ink mb-2" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
            这里好像什么都没有
          </h1>
          <p className="text-sm text-ink-light leading-relaxed mb-6">
            你可能点到了失效的链接，<br />
            或者这个页面还在发芽。
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/"
              className="px-5 py-2.5 bg-sage text-paper rounded-xl text-sm font-medium active:scale-[0.98] transition-all"
              style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}
            >
              去计时
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 bg-paper border border-cream text-ink rounded-xl text-sm font-medium hover:bg-paper-warm active:scale-[0.98] transition-all"
              style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}
            >
              回到首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
