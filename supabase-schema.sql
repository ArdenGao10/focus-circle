-- 1. 创建 users 表（profiles）
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  nickname text not null default '',
  goal text not null default '',
  target_minutes integer not null default 120,
  created_at timestamptz not null default now()
);

-- 启用 RLS
alter table public.profiles enable row level security;

-- 所有人可读
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

-- 自己可改
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- 自己可插入
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- 2. 创建 sessions 表
create table public.sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  task_name text not null default '个人专注',
  duration_seconds integer not null default 0,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

-- 兼容已存在的库：补充 task_name 字段
alter table public.sessions add column if not exists task_name text not null default '个人专注';

alter table public.sessions enable row level security;

-- 所有人可读（排行榜需要）
create policy "Sessions are viewable by everyone"
  on public.sessions for select using (true);

-- 自己可插入
create policy "Users can insert own sessions"
  on public.sessions for insert with check (auth.uid() = user_id);

-- 3. 每日任务表（细分任务）
create table public.daily_tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  completed boolean not null default false,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.daily_tasks enable row level security;

create policy "Users can view own tasks"
  on public.daily_tasks for select using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.daily_tasks for insert with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.daily_tasks for update using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.daily_tasks for delete using (auth.uid() = user_id);

-- 4. 排行榜视图
create or replace view public.leaderboard as
select
  p.id,
  p.nickname,
  p.goal,
  p.target_minutes,
  count(distinct s.date) as total_days,
  coalesce(sum(case when s.date = current_date then s.duration_seconds else 0 end), 0) as today_seconds
from public.profiles p
left join public.sessions s on s.user_id = p.id
where p.nickname != '' and p.goal != ''
group by p.id, p.nickname, p.goal, p.target_minutes
order by today_seconds desc;

-- 4. 注册时自动创建 profile 的触发器
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. 学习资源分享（广场）
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  content text not null,
  link text,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "Anyone can read posts" on public.posts for select using (true);
create policy "Users can insert own posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can delete own posts" on public.posts for delete using (auth.uid() = user_id);

-- 6. 鼓励（encouragements）：让发帖人感受到被支持，但不公开示众
create table public.post_encouragements (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.post_encouragements enable row level security;

-- 仅可读：自己发出的鼓励 + 别人对自己帖子的鼓励（外人看不到任何数字）
create policy "Read own encouragements or on own posts"
  on public.post_encouragements for select using (
    auth.uid() = user_id
    or post_id in (select id from public.posts where user_id = auth.uid())
  );

-- 只能给别人帖子鼓励，user_id 必须是自己
create policy "Users can encourage others' posts"
  on public.post_encouragements for insert with check (
    auth.uid() = user_id
    and (select user_id from public.posts where id = post_id) <> auth.uid()
  );

-- 不开放 update / delete（无策略 = 默认拒绝），避免"取消鼓励"的尴尬

-- 加入 realtime publication（让发帖人能实时收到鼓励事件）
alter publication supabase_realtime add table public.post_encouragements;

-- 7. focus source 埋点（为将来计算"AI 任务实际执行率"留数据）
-- 历史行无值，默认 'manual'；写入时由应用层显式传值。
alter table public.sessions
  add column if not exists source text not null default 'manual'
  check (source in ('ai_suggested', 'manual', 'free'));

alter table public.daily_tasks
  add column if not exists source text not null default 'manual'
  check (source in ('ai_suggested', 'manual'));

-- active_timers 是瞬时表（session 结束即删），无历史回填问题，默认 'free'
alter table public.active_timers
  add column if not exists task_source text not null default 'free'
  check (task_source in ('ai_suggested', 'manual', 'free'));

-- 周/月统计走 user_id + created_at 范围扫描
create index if not exists sessions_user_created_at_idx
  on public.sessions(user_id, created_at desc);

-- ──────────────────────────────────────────────────────────
-- 查询示例：过去 7 天 AI 任务实际执行率
-- 两种口径任选：

-- (A) daily_tasks 维度的完成率（推荐：直接表达"AI 推荐了 N 个，做完了 M 个"）
-- select
--   count(*) filter (where completed) as ai_completed,
--   count(*)                          as ai_total,
--   round(100.0 * count(*) filter (where completed) / nullif(count(*), 0), 1) as completion_rate_pct
-- from public.daily_tasks
-- where user_id = auth.uid()
--   and source  = 'ai_suggested'
--   and date   >= current_date - interval '7 days';

-- (B) sessions 维度的产出占比（"专注时长里 AI 任务占多少"）
-- select
--   sum(duration_seconds) filter (where source = 'ai_suggested') / 60 as ai_minutes,
--   sum(duration_seconds)                                          / 60 as total_minutes,
--   round(100.0 * sum(duration_seconds) filter (where source = 'ai_suggested') / nullif(sum(duration_seconds), 0), 1) as ai_share_pct
-- from public.sessions
-- where user_id     = auth.uid()
--   and created_at >= now() - interval '7 days';
