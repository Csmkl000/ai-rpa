// 对话式 AI 执行引擎
// 用户输入一句话 → LLM 理解意图 + 页面状态 → 生成一条指令

import OpenAI from "openai";
import type { Stagehand } from "@browserbasehq/stagehand";

interface ChatStep {
  type: string;
  instruction?: string;
  value?: string;
  fields?: Array<{ name: string; type: string }>;
  extractInstruction?: string;
  condition?: string;
  done?: boolean;
  message?: string;
}

const SYSTEM_PROMPT = `你是一个浏览器自动化助手。用户会用自然语言告诉你下一步要做什么，你需要输出一条可执行的指令。

可用指令类型:
- ACT: 点击/输入/选择操作。格式: { "type": "ACT", "instruction": "自然语言描述" }
- EXTRACT: 提取页面数据。格式: { "type": "EXTRACT", "instruction": "提取什么", "fields": [{"name":"字段名","type":"string或number"}] }
- GOTO: 打开新网页。格式: { "type": "GOTO", "value": "完整网址" }
- DONE: 任务完成。格式: { "type": "DONE", "message": "完成说明" }

规则:
1. 每次只输出一条指令
2. instruction 用中文大白话
3. 如果用户说的不明确，输出 ACT 类型，instruction 用用户的原话
4. 如果用户说"完成"、"好了"、"结束"，输出 DONE
5. 只输出 JSON，不要其他文字`;

export async function chatGenerateStep(
  stagehand: Stagehand,
  userMessage: string,
  apiKey: string,
  model: string,
  baseURL?: string
): Promise<ChatStep> {
  // 获取当前页面状态
  let pageInfo = "";
  try {
    const pages = stagehand.context.pages();
    if (pages.length > 0) {
      const page = pages[pages.length - 1];
      const url = page.url();
      pageInfo = `当前页面: ${url}`;
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
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("LLM 未返回内容");

  const step: ChatStep = JSON.parse(content);
  return step;
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
