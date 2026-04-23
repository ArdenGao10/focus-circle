'use client'

import { Flower, Sprig } from '@/components/Botanicals'

export default function FeedbackPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="relative bg-paper rounded-2xl border border-cream p-6 shadow-sm paper-texture overflow-hidden">
        <Flower className="absolute top-3 right-4 w-8 h-8 text-rose opacity-40" />
        <div className="absolute top-0 left-10 w-16 h-2.5 bg-lavender-light opacity-50 -translate-y-0.5 rounded-b-sm rotate-[-1deg]" />

        <div className="pt-2">
          <h1 className="text-xl font-bold text-ink mb-2" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
            听你吐槽，是我今天最想做的事
          </h1>
          <p className="text-sm text-ink-light leading-relaxed">
            专注圈还在非常早期的阶段。你遇到的每个 bug、每个困惑、每个"这里应该怎样才好"的想法，对我来说都是珍贵的礼物。
          </p>
        </div>
      </div>

      {/* WeChat */}
      <div className="bg-paper rounded-2xl border border-cream p-5 shadow-sm paper-texture">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">💬</span>
          <h2 className="text-sm font-semibold text-ink" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
            加我微信直接聊
          </h2>
        </div>
        <div className="bg-paper-warm rounded-xl border border-cream p-6 text-center">
          <div className="w-40 h-40 mx-auto bg-cream rounded-lg flex items-center justify-center text-ink-light text-sm mb-3">
            {/* Placeholder for QR code — replace public/feedback/wechat-qr.png */}
            <span className="text-xs text-ink-light/50">微信二维码占位</span>
          </div>
          <p className="text-xs text-ink-light">扫码加好友，备注「专注圈反馈」</p>
        </div>
      </div>

      {/* Survey */}
      <div className="bg-paper rounded-2xl border border-cream p-5 shadow-sm paper-texture">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📝</span>
          <h2 className="text-sm font-semibold text-ink" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
            或者匿名填个问卷
          </h2>
        </div>
        <p className="text-sm text-ink-light mb-3">不方便加微信？可以匿名说出你的想法。</p>
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-2.5 bg-lavender text-paper rounded-xl text-sm font-medium text-center active:scale-[0.98] transition-all"
        >
          打开反馈问卷
        </a>
      </div>

      {/* Email */}
      <div className="bg-paper rounded-2xl border border-cream p-5 shadow-sm paper-texture">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📧</span>
          <h2 className="text-sm font-semibold text-ink" style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>
            也可以直接邮件
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Sprig className="w-3 h-5 text-sage-dark shrink-0" />
          <a href="mailto:your-email@example.com" className="text-sm text-lavender hover:underline">
            your-email@example.com
          </a>
        </div>
      </div>
    </div>
  )
}
