'use client'

export default function FeedbackPage() {
  return (
    <div style={{ background: 'var(--aura-bg-primary)' }}>
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5" style={{ color: 'var(--aura-text-primary)' }}>
        {/* Header */}
        <div
          style={{
            background: 'var(--aura-bg-elevated)',
            borderRadius: 24,
            border: '1px solid rgba(0,0,0,0.06)',
            padding: 24,
          }}
        >
          <div>
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
              听你吐槽，是我今天最想做的事
            </h1>
            <p
              style={{
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 13,
                color: 'var(--aura-text-secondary)',
                lineHeight: 1.7,
              }}
            >
              专注圈还在非常早期的阶段。你遇到的每个 bug、每个困惑、每个"这里应该怎样才好"的想法，对我来说都是珍贵的礼物。
            </p>
          </div>
        </div>

      {/* WeChat */}
        <div
          style={{
            background: 'var(--aura-bg-elevated)',
            borderRadius: 24,
            border: '1px solid rgba(0,0,0,0.06)',
            padding: 20,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span style={{ fontSize: 16 }}>💬</span>
            <h2
              style={{
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--aura-text-primary)',
              }}
            >
              加我微信直接聊
            </h2>
          </div>
          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.08)',
              padding: 20,
              textAlign: 'center',
            }}
          >
            <div
              className="w-40 h-40 mx-auto flex items-center justify-center text-sm mb-3"
              style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 12, color: 'var(--aura-text-muted)' }}
            >
              <img src="/feedback/wechat-qr.png" alt="微信二维码" className="w-full h-full object-contain" />
            </div>
            <p style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 11, color: 'var(--aura-text-muted)' }}>
              扫码加好友，备注「专注圈反馈」
            </p>
          </div>
        </div>

      {/* Survey */}
        <div
          style={{
            background: 'var(--aura-bg-elevated)',
            borderRadius: 24,
            border: '1px solid rgba(0,0,0,0.06)',
            padding: 20,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span style={{ fontSize: 16 }}>📝</span>
            <h2
              style={{
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--aura-text-primary)',
              }}
            >
              或者匿名填个问卷
            </h2>
          </div>
          <p style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 13, color: 'var(--aura-text-secondary)', marginBottom: 12 }}>
            不方便加微信？可以匿名说出你的想法。
          </p>
          <a
            href="https://wj.qq.com/s2/26444940/2dd3/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              fontFamily: 'var(--aura-font-sans)',
              fontSize: 13,
              letterSpacing: '0.2em',
              color: 'var(--aura-text-primary)',
              borderBottom: '1px solid var(--aura-text-primary)',
              paddingBottom: 4,
            }}
          >
            打开反馈问卷
          </a>
        </div>

      {/* Email */}
        <div
          style={{
            background: 'var(--aura-bg-elevated)',
            borderRadius: 24,
            border: '1px solid rgba(0,0,0,0.06)',
            padding: 20,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span style={{ fontSize: 16 }}>📧</span>
            <h2
              style={{
                fontFamily: 'var(--aura-font-sans)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--aura-text-primary)',
              }}
            >
              也可以直接邮件
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--aura-text-muted)' }} />
            <a
              href="mailto:18611965296@163.com"
              style={{ fontFamily: 'var(--aura-font-sans)', fontSize: 13, color: 'var(--aura-text-secondary)' }}
            >
              18611965296@163.com
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
