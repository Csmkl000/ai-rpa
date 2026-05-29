// 对话式 AI 执行引擎
import OpenAI from "openai";
import type { Stagehand } from "@browserbasehq/stagehand";

interface ChatStep {
  type: string;
  instruction?: string;
  value?: string;
  fields?: Array<{ name: string; type: string }>;
  done?: boolean;
  message?: string;
}

const SYSTEM_PROMPT = `你是一个浏览器自动化助手。用户会用自然语言告诉你下一步要做什么。

你必须输出一个 JSON 对象，格式如下:
{"type": "ACT", "instruction": "点击登录按钮"}
或
{"type": "GOTO", "value": "https://example.com"}
或
{"type": "EXTRACT", "instruction": "提取标题", "fields": [{"name":"title","type":"string"}]}
或
{"type": "DONE", "message": "任务完成"}

type 的值只能是: ACT, GOTO, EXTRACT, DONE
不要输出任何其他文字，只输出 JSON 对象。`;

function extractJSON(text: string): any {
  // 尝试直接解析
  try { return JSON.parse(text); } catch {}

  // 尝试提取 ```json ... ```
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1].trim()); } catch {}
  }

  // 尝试提取第一个 { ... }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }

  throw new Error(`无法从 LLM 响应中提取 JSON: ${text.slice(0, 200)}`);
}

export async function chatGenerateStep(
  stagehand: Stagehand,
  userMessage: string,
  apiKey: string,
  model: string,
  baseURL?: string
): Promise<ChatStep> {
  let pageInfo = "";
  try {
    const pages = stagehand.context.pages();
    if (pages.length > 0) {
      const page = pages[pages.length - 1];
      pageInfo = `当前页面 URL: ${page.url()}`;
    }
  } catch {}

  const client = new OpenAI({ apiKey, baseURL: baseURL || undefined });

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: pageInfo },
      { role: "user", content: userMessage },
    ],
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("LLM 未返回内容");

  return extractJSON(content);
}

export async function chatExecuteStep(
  stagehand: Stagehand,
  step: ChatStep
): Promise<string> {
  switch (step.type) {
    case "GOTO":
      if (!step.value) throw new Error("GOTO 缺少网址");
      const page = await stagehand.context.newPage(step.value);
      await page.waitForLoadState("domcontentloaded");
      return `已打开 ${step.value}`;

    case "ACT":
      if (!step.instruction) throw new Error("ACT 缺少指令");
      await stagehand.act(step.instruction);
      return `已执行: ${step.instruction}`;

    case "EXTRACT": {
      if (!step.instruction) throw new Error("EXTRACT 缺少指令");
      const { generateDynamicSchema } = require("./utils/schema");
      const schema = generateDynamicSchema(step.fields || []);
      const data = await stagehand.extract(step.instruction, schema);
      return `提取结果: ${JSON.stringify(data)}`;
    }

    case "DONE":
      return step.message || "任务完成";

    default:
      return `未知指令类型: ${step.type}`;
  }
}
