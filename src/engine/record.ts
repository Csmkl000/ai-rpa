// 指南 5: 智能录制引擎
// 独立进程: 打开浏览器 → 注入脚本 → 保持存活直到收到停止信号

import { emit } from "./protocol/messages";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { join } from "path";

const SIGNAL_FILE = join(tmpdir(), "ai-rpa-record-stop.signal");

function parseArgs() {
  const args = process.argv.slice(2);
  let url = "", outputFile = "";
  for (let i = 0; i < args.length; i++) {
    const next = args[i + 1];
    switch (args[i]) {
      case "--url": url = next; i++; break;
      case "--output": outputFile = next; i++; break;
      default: i++; break;
    }
  }
  return { url, outputFile };
}

const RECORD_SCRIPT = `
(function() {
  if (window.__STAGEHAND_RECORDER__) return;
  window.__STAGEHAND_RECORDER__ = true;
  window.__RECORDED_ACTIONS__ = [];
  window.__RECORDING_ACTIVE__ = true;

  function getElementInfo(el) {
    if (!el || !el.tagName) return { tag: 'unknown', text: '' };
    var tag = el.tagName.toLowerCase();
    var text = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 60);
    var placeholder = el.getAttribute('placeholder') || '';
    var ariaLabel = el.getAttribute('aria-label') || '';
    var type = el.getAttribute('type') || '';
    var role = el.getAttribute('role') || '';
    return { tag: tag, text: text, placeholder: placeholder, ariaLabel: ariaLabel, type: type, role: role };
  }

  function toInstruction(info) {
    var label = info.ariaLabel || info.text || info.placeholder || '';
    if (info.tag === 'input' || info.tag === 'textarea') {
      if (info.type === 'search' || info.placeholder.indexOf('搜索') >= 0) return '在搜索框输入';
      return info.placeholder ? '在"' + info.placeholder + '"中输入' : '在输入框中输入';
    }
    if (info.tag === 'select') return '选择下拉选项';
    if (info.tag === 'a') return label ? '点击"' + label.slice(0, 20) + '"链接' : '点击链接';
    if (info.tag === 'button' || info.role === 'button' || info.type === 'button' || info.type === 'submit') {
      return label ? '点击"' + label.slice(0, 20) + '"按钮' : '点击按钮';
    }
    if (label) return '点击"' + label.slice(0, 20) + '"';
    return '点击元素';
  }

  document.addEventListener('click', function(e) {
    if (!window.__RECORDING_ACTIVE__) return;
    var el = e.target;
    var info = getElementInfo(el);
    var instruction = toInstruction(info);
    try {
      var orig = el.style.outline;
      el.style.outline = '3px solid #22c55e';
      setTimeout(function() { el.style.outline = orig; }, 800);
    } catch(ex) {}
    window.__RECORDED_ACTIONS__.push({ instruction: instruction, ts: Date.now() });
  }, true);

  document.addEventListener('submit', function(e) {
    if (!window.__RECORDING_ACTIVE__) return;
    window.__RECORDED_ACTIONS__.push({ instruction: '提交表单', ts: Date.now() });
  }, true);
})();
`;

async function runRecorder() {
  const { url, outputFile } = parseArgs();
  console.log(`[RECORD] 启动录制, url=${url}`);

  // 用 Stagehand 打开浏览器
  const { createStagehand } = require("./stagehand/client");
  const stagehand = await createStagehand({
    cacheDir: "/tmp/stagehand-record-cache",
    headless: false,
    recordMode: true,
  });

  const pages = stagehand.context.pages();
  const page = pages[0];
  if (!page) {
    console.error("[RECORD] 没有可用的页面");
    process.exit(1);
  }

  // 导航
  if (url && url !== "about:blank") {
    await page.goto(url);
  }
  await new Promise(r => setTimeout(r, 2000));

  // 注入录制脚本
  console.log(`[RECORD] 注入录制脚本...`);
  try {
    await page.evaluate(RECORD_SCRIPT);
    console.log(`[RECORD] 脚本注入成功，请在浏览器中操作`);
  } catch (e: any) {
    console.error(`[RECORD] 脚本注入失败: ${e.message}`);
  }

  emit("ENGINE_BOOT", { message: "录制已启动，请在浏览器中操作", url });

  // 轮询录制结果
  const actions: any[] = [];
  let lastCount = 0;
  let running = true;

  const poll = setInterval(async () => {
    if (!running) return;
    try {
      const result = await page.evaluate(() => {
        return JSON.stringify((window as any).__RECORDED_ACTIONS__ || []);
      });
      const current: any[] = JSON.parse(result);
      if (current.length > lastCount) {
        const newActions = current.slice(lastCount);
        for (const action of newActions) {
          actions.push(action);
          console.log(`[RECORDER] ${action.instruction}`);
        }
        lastCount = current.length;
      }
    } catch {
      // 页面可能正在导航，忽略
    }
  }, 500);

  // 等待停止信号（三种方式）
  await new Promise<void>((resolve) => {
    // 方式1: stdin
    process.stdin.on("data", (data) => {
      if (data.toString().trim() === "stop") { running = false; resolve(); }
    });

    // 方式2: 进程信号
    process.on("SIGTERM", () => { running = false; resolve(); });
    process.on("SIGINT", () => { running = false; resolve(); });

    // 方式3: 信号文件
    try { unlinkSync(SIGNAL_FILE); } catch {}
    const pollFile = setInterval(() => {
      if (existsSync(SIGNAL_FILE)) {
        try { unlinkSync(SIGNAL_FILE); } catch {}
        clearInterval(pollFile);
        running = false;
        resolve();
      }
    }, 500);
  });

  clearInterval(poll);

  // 保存结果
  const mappedActions = actions.map((a) => ({
    id: randomUUID(),
    type: "ACT",
    label: a.instruction,
    instruction: a.instruction,
  }));

  const finalResult = { url, actions: mappedActions };
  if (outputFile) writeFileSync(outputFile, JSON.stringify(finalResult, null, 2));

  console.log(`[RECORD_DONE] 录制完成，共 ${mappedActions.length} 步`);
  console.log(`[RECORD_DONE] ${JSON.stringify(finalResult)}`);

  // 关闭浏览器
  try { await stagehand.close(); } catch {}
  process.exit(0);
}

runRecorder().catch((err) => {
  console.error(`[RECORD_ERROR] ${err.message}`);
  process.exit(1);
});
