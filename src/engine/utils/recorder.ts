// 指南 5: 智能录制 — 将用户点击转化为语义指令

export const RECORD_SCRIPT = `
(function() {
  if (window.__STAGEHAND_RECORDER__) return;
  window.__STAGEHAND_RECORDER__ = true;
  window.__RECORDED_ACTIONS__ = [];
  window.__RECORDING_ACTIVE__ = false;

  function getElementInfo(el) {
    if (!el || !el.tagName) return { tag: 'unknown', text: '', placeholder: '', ariaLabel: '', type: '', role: '' };
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 60);
    const placeholder = el.getAttribute('placeholder') || '';
    const ariaLabel = el.getAttribute('aria-label') || '';
    const type = el.getAttribute('type') || '';
    const role = el.getAttribute('role') || '';
    const value = el.value || '';
    return { tag, text, placeholder, ariaLabel, type, role, value };
  }

  function toInstruction(info) {
    const { tag, text, placeholder, ariaLabel, type, role } = info;
    const label = ariaLabel || text || placeholder || '';

    // 输入框
    if (tag === 'input' || tag === 'textarea') {
      if (type === 'search' || placeholder.includes('搜索') || placeholder.includes('search')) {
        return '在搜索框输入';
      }
      return placeholder ? '在"' + placeholder + '"中输入' : '在输入框中输入';
    }

    // 下拉框
    if (tag === 'select') return '选择下拉选项';

    // 链接
    if (tag === 'a') return label ? '点击"' + label.slice(0, 20) + '"链接' : '点击链接';

    // 按钮
    if (tag === 'button' || role === 'button' || type === 'button' || type === 'submit') {
      return label ? '点击"' + label.slice(0, 20) + '"按钮' : '点击按钮';
    }

    // 图片
    if (tag === 'img') {
      const alt = el.getAttribute('alt') || '';
      return alt ? '点击"' + alt.slice(0, 20) + '"图片' : '点击图片';
    }

    // 有文字的可点击元素
    if (label && label.length > 0) return '点击"' + label.slice(0, 20) + '"';

    return '点击元素';
  }

  // 使用捕获阶段监听所有点击
  document.addEventListener('click', function(e) {
    if (!window.__RECORDING_ACTIVE__) return;

    const el = e.target;
    const info = getElementInfo(el);
    const instruction = toInstruction(info);

    // 高亮被点击的元素
    try {
      const orig = el.style.outline;
      el.style.outline = '3px solid #22c55e';
      setTimeout(() => { el.style.outline = orig; }, 800);
    } catch {}

    const action = {
      type: 'ACT',
      instruction: instruction,
      timestamp: Date.now(),
      tag: info.tag,
      text: info.text.slice(0, 30),
    };

    window.__RECORDED_ACTIONS__.push(action);
    console.log('[RECORDER] ' + instruction);
  }, true);

  // 拦截表单提交
  document.addEventListener('submit', function(e) {
    if (!window.__RECORDING_ACTIVE__) return;
    window.__RECORDED_ACTIONS__.push({
      type: 'ACT',
      instruction: '提交表单',
      timestamp: Date.now(),
      tag: 'form',
      text: '',
    });
    console.log('[RECORDER] 提交表单');
  }, true);

  console.log('[RECORDER] 录制脚本已加载');
})();
`;

export function getRecordScript(): string {
  return RECORD_SCRIPT;
}

export function getStartRecordingScript(): string {
  return `
    window.__RECORDING_ACTIVE__ = true;
    window.__RECORDED_ACTIONS__ = [];
    console.log('[RECORDER] 录制已启动，请操作页面');
  `;
}

export function getGetActionsScript(): string {
  return "JSON.stringify(window.__RECORDED_ACTIONS__ || [])";
}
