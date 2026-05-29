// 指南 5: 智能录制引擎
import { emit } from "./protocol/messages";
import { writeFileSync } from "fs";
import { randomUUID } from "crypto";

// Playwright 通过 Stagehand 依赖可用
const { chromium } = require("playwright");

function parseArgs() {
  const args = process.argv.slice(2);
  let url = "", outputFile = "", apiKey = "", model = "gpt-4o", baseURL = "", proxyUrl = "";
  for (let i = 0; i < args.length; i++) {
    const next = args[i + 1];
    switch (args[i]) {
      case "--url": url = next; i++; break;
      case "--output": outputFile = next; i++; break;
      case "--api-key": apiKey = next; i++; break;
      case "--model": model = next; i++; break;
      case "--base-url": baseURL = next; i++; break;
      case "--proxy": proxyUrl = next; i++; break;
    }
  }
  return { url, outputFile, apiKey, model, baseURL, proxyUrl };
}

const RECORD_SCRIPT = `
(function() {
  if (window.__STAGEHAND_RECORDER__) return;
  window.__STAGEHAND_RECORDER__ = true;
  window.__RECORDED_ACTIONS__ = [];
  window.__RECORDING_ACTIVE__ = true;

  function getElementInfo(el) {
    if (!el || !el.tagName) return { tag: 'unknown', text: '' };
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 60);
    const placeholder = el.getAttribute('placeholder') || '';
    const ariaLabel = el.getAttribute('aria-label') || '';
    const type = el.getAttribute('type') || '';
    const role = el.getAttribute('role') || '';
    return { tag, text, placeholder, ariaLabel, type, role };
  }

  function toInstruction(info) {
    const { tag, text, placeholder, ariaLabel, type, role } = info;
    const label = ariaLabel || text || placeholder || '';
    if (tag === 'input' || tag === 'textarea') {
      if (type === 'search' || placeholder.includes('搜索')) return '在搜索框输入';
      return placeholder ? '在"' + placeholder + '"中输入' : '在输入框中输入';
    }
    if (tag === 'select') return '选择下拉选项';
    if (tag === 'a') return label ? '点击"' + label.slice(0, 20) + '"链接' : '点击链接';
    if (tag === 'button' || role === 'button' || type === 'button' || type === 'submit') {
      return label ? '点击"' + label.slice(0, 20) + '"按钮' : '点击按钮';
    }
    if (tag === 'img') return '点击图片';
    if (label) return '点击"' + label.slice(0, 20) + '"';
    return '点击元素';
  }

  document.addEventListener('click', function(e) {
    if (!window.__RECORDING_ACTIVE__) return;
    const el = e.target;
    const info = getElementInfo(el);
    const instruction = toInstruction(info);
    try {
      const orig = el.style.outline;
      el.style.outline = '3px solid #22c55e';
      setTimeout(() => { el.style.outline = orig; }, 800);
    } catch {}
    window.__RECORDED_ACTIONS__.push({
      instruction: instruction,
      timestamp: Date.now(),
    });
    console.log('[RECORDER] ' + instruction);
  }, true);

  document.addEventListener('submit', function(e) {
    if (!window.__RECORDING_ACTIVE__) return;
    window.__RECORDED_ACTIONS__.push({ instruction: '提交表单', timestamp: Date.now() });
  }, true);

  console.log('[RECORDER] 录制脚本已加载');
})();
`;

async function runRecorder() {
  const { url, outputFile } = parseArgs();

  console.log(`[RECORD] 启动录制, url=${url}`);

  // 直接用 Playwright 打开浏览器，不经过 Stagehand
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(url || "about:blank", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // 注入录制脚本
  console.log(`[RECORD] 注入录制脚本...`);
  await page.evaluate(RECORD_SCRIPT);
  console.log(`[RECORD] 脚本注入完成`);

  emit("ENGINE_BOOT", { message: "录制模式已启动，请在浏览器中操作", url });
  console.log(`[RECORD] 请在浏览器中操作...`);

  // 轮询
  const actions: any[] = [];
  let lastCount = 0;

  const poll = setInterval(async () => {
    try {
      const raw = await page.evaluate("JSON.stringify(window.__RECORDED_ACTIONS__ || [])");
      const current: any[] = JSON.parse(raw);
      if (current.length > lastCount) {
        const newActions = current.slice(lastCount);
        for (const action of newActions) {
          actions.push(action);
          console.log(`[RECORDER] ${action.instruction}`);
        }
        lastCount = current.length;
      }
    } catch {}
  }, 500);

  // 等待退出信号
  await new Promise<void>((resolve) => {
    process.on("SIGTERM", () => resolve());
    process.on("SIGINT", () => resolve());
    process.stdin.on("data", (data) => {
      if (data.toString().trim() === "stop") resolve();
    });
  });

  clearInterval(poll);

  const mappedActions = actions.map((a) => ({
    id: randomUUID(),
    type: "ACT",
    label: a.instruction,
    instruction: a.instruction,
  }));

  const finalResult = { url, actions: mappedActions };

  if (outputFile) {
    writeFileSync(outputFile, JSON.stringify(finalResult, null, 2));
  }

  console.log(`[RECORD_DONE] 录制完成，共 ${mappedActions.length} 步`);
  console.log(`[RECORD_DONE] ${JSON.stringify(finalResult)}`);

  await browser.close();
  process.exit(0);
}

runRecorder().catch((err) => {
  console.error(`[RECORD_ERROR] ${err.message}`);
  process.exit(1);
});
