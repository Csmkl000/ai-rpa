// AI 规划层: 用户输入一句话 → LLM 生成工作流步骤
import OpenAI from "openai";

const SYSTEM_PROMPT = `你是一个 RPA 工作流规划器。用户会用自然语言描述一个自动化任务，你需要输出可执行的步骤列表。

可用步骤类型:
- GOTO: 打开网页。字段: { "type": "GOTO", "value": "完整网址" }
- ACT: 执行操作（点击/输入/选择）。字段: { "type": "ACT", "instruction": "自然语言描述，如: 点击登录按钮、在搜索框输入手机" }
- EXTRACT: 从页面提取数据。字段: { "type": "EXTRACT", "instruction": "提取什么数据", "fields": [{"name":"字段名","type":"string或number"}] }
- LOOP: 循环执行。字段: { "type": "LOOP", "condition": "继续条件", "maxIterations": 10, "body": [子步骤数组] }
- OBSERVE: 观察页面元素。字段: { "type": "OBSERVE", "instruction": "观察什么" }

规则:
1. 每个步骤必须有唯一的 "id" 字段（用 UUID 格式）
2. instruction 用中文大白话描述，不要用技术术语
3. GOTO 的 value 必须是完整的 https:// 开头的网址
4. 提取数据时必须指定 fields 数组
5. 翻页场景用 LOOP，body 里放提取+翻页步骤
6. 只输出 JSON 数组，不要其他文字`;

interface PlanResult {
  steps: Array<{
    id: string;
    type: string;
    label?: string;
    value?: string;
    instruction?: string;
    fields?: Array<{ name: string; type: string }>;
    condition?: string;
    maxIterations?: number;
    body?: any[];
    task?: string;
    maxSteps?: number;
  }>;
}

export async function planWorkflow(
  userInput: string,
  apiKey: string,
  model: string,
  baseURL?: string
): Promise<PlanResult> {
  const client = new OpenAI({
    apiKey,
    baseURL: baseURL || undefined,
  });

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userInput },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("LLM 未返回内容");

  const parsed = JSON.parse(content);

  // 兼容两种格式: 直接数组 或 { steps: [...] }
  const steps = Array.isArray(parsed) ? parsed : parsed.steps;
  if (!Array.isArray(steps)) throw new Error("LLM 返回格式错误，期望步骤数组");

  // 为每个步骤添加 label
  const labels: Record<string, string> = {
    GOTO: "打开网页", ACT: "执行操作", EXTRACT: "提取数据",
    OBSERVE: "观察页面", LOOP: "循环", CONDITION: "条件分支",
    AUTONOMOUS_AGENT: "AI 智能体",
  };

  const enrichedSteps = steps.map((s: any) => ({
    ...s,
    id: s.id || crypto.randomUUID(),
    label: s.label || labels[s.type] || s.type,
  }));

  return { steps: enrichedSteps };
}
