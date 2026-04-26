# Focus Circle 专注圈

一款面向学习社群的专注计时与协作应用，帮助用户追踪专注时间、管理每日任务，并在排行榜上与伙伴共同进步。

## 功能特性

- **专注计时** — 正计时模式，支持暂停/继续，跨设备实时同步
- **每日任务** — 可勾选的细粒度任务清单，支持 AI 智能建议
- **实时排行榜** — 按当日专注时长排名，支持按目标筛选，活跃用户脉冲指示
- **学习广场** — 社区分享学习资源（每日限发一条）
- **个人档案** — 设定每日专注目标和个人目标，查看历史记录
- **离线支持** — 网络异常时自动缓存，恢复后补传
- **僵尸恢复** — 超时 12 小时的遗忘计时器自动检测，可保存/丢弃/继续
- **PWA** — 可安装至桌面，支持离线访问

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 前端 | React 19 · TypeScript 5 |
| 样式 | Tailwind CSS 4 |
| 后端/数据库 | Supabase (PostgreSQL + Auth + Realtime) |
| 部署 | Cloudflare Workers (opennextjs-cloudflare) |
| AI | 智谱 GLM API（任务建议） |
| PWA | next-pwa |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

在 `.env.local` 中配置环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
ZHIPU_API_KEY=your_zhipu_api_key
```

## 项目结构

```
src/
├── app/
│   ├── (main)/                # 需登录的主路由
│   │   ├── page.tsx           # 计时器（首页）
│   │   ├── leaderboard/      # 排行榜
│   │   ├── square/            # 学习广场
│   │   └── profile/           # 个人档案
│   ├── auth/                  # 登录/注册/找回密码
│   ├── onboarding/            # 新用户引导
│   └── api/ai-tasks/          # AI 任务建议接口
├── components/                # UI 组件与 Context
└── lib/supabase/              # Supabase 客户端与中间件
```

## 部署

```bash
# 构建并部署到 Cloudflare Workers
npm run deploy
```

## License

MIT
