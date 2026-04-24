const SYSTEM_PROMPT = `你是备考辅导助手。根据用户目标，拆解3个今日小任务。每个任务有简短标题和一句话说明。只返回JSON：{"today":[{"task":"标题","detail":"一句话说明","duration":"时长"}],"week":"本周概览一句话"}`

const GLM_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

export async function POST(request: Request) {
  try {
    const { goal } = await request.json()

    if (!goal || typeof goal !== 'string' || goal.trim().length === 0) {
      return Response.json({ error: '请输入你的目标' }, { status: 400 })
    }

    const apiKey = process.env.ZHIPU_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'AI服务未配置（环境变量缺失）' }, { status: 500 })
    }

    let res: Response

    try {
      res = await fetch(GLM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          max_tokens: 300,
          temperature: 0.7,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: goal.trim() },
          ],
        }),
      })
    } catch (e) {
      return Response.json({ error: `网络异常: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 })
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return Response.json({ error: `AI 服务错误 ${res.status}: ${body.slice(0, 200)}` }, { status: 502 })
    }

    let data: { choices?: { message?: { content?: string } }[] }
    try {
      data = await res.json()
    } catch {
      return Response.json({ error: 'AI 返回格式错误' }, { status: 500 })
    }

    const content = data.choices?.[0]?.message?.content || ''

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ error: 'AI 返回格式错误，请重试' }, { status: 500 })
    }

    try {
      const parsed = JSON.parse(jsonMatch[0])
      return Response.json(parsed)
    } catch {
      return Response.json({ error: 'AI 返回格式错误，请重试' }, { status: 500 })
    }
  } catch (e) {
    return Response.json({ error: `服务器错误: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 })
  }
}
