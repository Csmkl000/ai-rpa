// 指南 5: 验证码检测与人工介入握手
import { emit } from "../protocol/messages";
import { watch } from "fs";

const SIGNAL_FILE = require("os").tmpdir() + "/ai-rpa-continue.signal";

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

export async function detectCaptcha(page: any): Promise<boolean> {
  try {
    const content = await page.content();
    const lower = content.toLowerCase();
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
    try { require("fs").unlinkSync(SIGNAL_FILE); } catch {}

    // 监听信号文件
    const dir = require("path").dirname(SIGNAL_FILE);
    const basename = require("path").basename(SIGNAL_FILE);
    const watcher = watch(dir, (event: string, filename: string | null) => {
      if (filename === basename) {
        try {
          require("fs").unlinkSync(SIGNAL_FILE);
        } catch {}
        watcher.close();
        resolve();
      }
    });

    // 超时 5 分钟
    setTimeout(() => {
      watcher.close();
      resolve();
    }, 5 * 60 * 1000);
  });
}
