// 指南 5: 验证码检测与人工介入握手
import { emit } from "../protocol/messages";
import { existsSync, unlinkSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
// [Refactor: page 类型从 any 改为 Page by Claude]
import type { Page } from "@browserbasehq/stagehand";

const SIGNAL_FILE = join(tmpdir(), "ai-rpa-continue.signal");

// 检测页面是否包含验证码特征
const CAPTCHA_KEYWORDS = [
  "cf-challenge-running",
  "captcha",
  "验证码",
  "滑块",
  "人机验证",
  "security check",
  "verify you are human",
  "2fa",
  "two-factor",
  "双重验证",
];

// [Refactor: 用 evaluate 替代 content()，适配 Stagehand Page 类型 by Claude]
export async function detectCaptcha(page: Page): Promise<boolean> {
  try {
    const content = await page.evaluate(() => document.documentElement.outerHTML);
    const lower = (content as string).toLowerCase();
    return CAPTCHA_KEYWORDS.some((kw) => lower.includes(kw));
  } catch {
    return false;
  }
}

// 发出暂停信号并等待用户手动处理
export function waitForUserContinue(stepId: string): Promise<void> {
  return new Promise((resolve) => {
    emit("CAPTCHA_PAUSE", { step_id: stepId });

    // 清除旧信号
    try { unlinkSync(SIGNAL_FILE); } catch {}

    // #15: 使用轮询代替 fs.watch，更可靠
    let lastMtime = 0;
    const poll = setInterval(() => {
      try {
        if (existsSync(SIGNAL_FILE)) {
          const stat = statSync(SIGNAL_FILE);
          if (stat.mtimeMs > lastMtime) {
            lastMtime = stat.mtimeMs;
            // 等文件写入完成
            clearInterval(poll);
            try { unlinkSync(SIGNAL_FILE); } catch {}
            resolve();
          }
        }
      } catch {}
    }, 500);

    // 超时 5 分钟
    setTimeout(() => {
      clearInterval(poll);
      resolve();
    }, 5 * 60 * 1000);
  });
}
