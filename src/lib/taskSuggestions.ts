// AI-like task breakdown suggestions based on goal
const SUGGESTIONS: Record<string, string[]> = {
  '备考雅思': [
    '听力 Section 1-2 精听练习',
    '阅读 Passage 1 限时训练',
    '写作 Task 1 小作文练习',
    '写作 Task 2 大作文构思',
    '口语 Part 1 话题练习',
    '口语 Part 2 话题卡练习',
    '词汇背诵 50 个',
    '语法错题整理',
    '听力 Section 3-4 精听',
    '阅读 Passage 2-3 限时训练',
  ],
  '考研备考': [
    '数学高数章节复习',
    '英语阅读真题 2 篇',
    '政治选择题刷题 30 道',
    '专业课笔记整理',
    '数学线代练习题',
    '英语完形填空练习',
    '政治大题背诵',
    '数学概率论复习',
    '英语作文模板整理',
    '专业课真题研究',
  ],
  '学习编程': [
    '完成 1 个算法题',
    '阅读技术文档/书籍 30 分钟',
    '编写项目功能模块',
    '代码复盘与重构',
    'Git 提交今日代码',
    '学习新的 API/框架',
    '写技术笔记/博客',
    '做一个小 demo 练习',
  ],
  '健身打卡': [
    '热身拉伸 10 分钟',
    '有氧运动 30 分钟',
    '力量训练 - 上肢',
    '力量训练 - 下肢',
    '核心训练 15 分钟',
    '瑜伽/冥想 20 分钟',
    '记录饮食与摄入',
    '拉伸放松 10 分钟',
  ],
  '读书计划': [
    '阅读 30 页',
    '写读书笔记/摘抄',
    '思维导图整理',
    '章节总结回顾',
    '查阅相关资料',
    '与他人讨论书中观点',
  ],
}

export function getSuggestions(goal: string): string[] {
  // Try exact match first, then partial match
  if (SUGGESTIONS[goal]) return SUGGESTIONS[goal]
  for (const [key, tasks] of Object.entries(SUGGESTIONS)) {
    if (goal.includes(key) || key.includes(goal)) return tasks
  }
  // Generic suggestions
  return [
    '制定今日学习计划',
    '完成核心任务 1 小时',
    '复习与回顾',
    '整理笔记',
    '练习与应用',
    '总结今日收获',
  ]
}

export function getSmartSuggestions(goal: string, existingTasks: string[]): string[] {
  const all = getSuggestions(goal)
  // Filter out already added tasks
  const available = all.filter(s => !existingTasks.includes(s))
  // Return up to 4 suggestions
  return available.slice(0, 4)
}
