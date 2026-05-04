// Deterministic per-user avatar aura. Each user_id maps to one of six
// low-saturation gradient pairs so avatars feel distinct without being noisy.

const AURA_PALETTE: ReadonlyArray<{ primary: string; soft: string }> = [
  { primary: 'rgba(168, 213, 186, 0.35)', soft: 'rgba(168, 213, 186, 0.175)' }, // 绿
  { primary: 'rgba(197, 181, 221, 0.30)', soft: 'rgba(197, 181, 221, 0.15)'  }, // 紫
  { primary: 'rgba(244, 196, 161, 0.30)', soft: 'rgba(244, 196, 161, 0.15)'  }, // 暖橙
  { primary: 'rgba(173, 198, 219, 0.32)', soft: 'rgba(173, 198, 219, 0.16)'  }, // 蓝灰
  { primary: 'rgba(220, 195, 175, 0.30)', soft: 'rgba(220, 195, 175, 0.15)'  }, // 米褐
  { primary: 'rgba(192, 209, 188, 0.32)', soft: 'rgba(192, 209, 188, 0.16)'  }, // 灰绿
]

function hashUserId(userId: string): number {
  let h = 0
  for (let i = 0; i < userId.length; i++) {
    h = (h * 31 + userId.charCodeAt(i)) >>> 0
  }
  return h
}

export function avatarAuraGradient(userId: string | null | undefined): string {
  const idx = userId ? hashUserId(userId) % AURA_PALETTE.length : 0
  const { primary, soft } = AURA_PALETTE[idx]
  return `radial-gradient(circle, ${primary} 0%, ${soft} 70%)`
}
