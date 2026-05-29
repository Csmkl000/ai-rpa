// 指南 5: 智能录制 — 将用户点击转化为语义指令
// 注入浏览器，拦截点击事件，提取元素文本生成大白话指令

export const RECORD_SCRIPT = `
(function() {
  if (window.__STAGEHAND_RECORDER__) return;
  window.__STAGEHAND_RECORDER__ = true;
  window.__RECORDED_ACTIONS__ = [];

  function getElementInfo(el) {
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || '').trim().slice(0, 50);
    const placeholder = el.getAttribute('placeholder') || '';
    const ariaLabel = el.getAttribute('aria-label') || '';
    const type = el.getAttribute('type') || '';
    const role = el.getAttribute('role') || '';
    return { tag, text, placeholder, ariaLabel, type, role };
  }

  function toInstruction(info) {
    const { tag, text, placeholder, ariaLabel, type, role } = info;
    const label = ariaLabel || text || placeholder || '';

    // 输入框
    if (tag === 'input' || tag === 'textarea') {
      if (type === 'search' || placeholder.includes('搜索') || placeholder.includes('search')) {
        return '在搜索框输入';
      }
      return placeholder ? '在"' + placeholder + '"输入' : '在输入框输入';
    }

    // 下拉框
    if (tag === 'select') return '选择下拉选项';

    // 链接
    if (tag === 'a') return label ? '点击"' + label + '"链接' : '点击链接';

    // 按钮
    if (tag === 'button' || role === 'button' || type === 'button' || type === 'submit') {
      return label ? '点击"' + label + '"按钮' : '点击按钮';
    }

    // 有文字的可点击元素
    if (label) return '点击"' + label + '"';

    return '点击元素';
  }

  document.addEventListener('click', function(e) {
    if (!window.__RECORDING_ACTIVE__) return;

    const el = e.target;
    const info = getElementInfo(el);
    const instruction = toInstruction(info);

    // 高亮被点击的元素
    const orig = el.style.outline;
    el.style.outline = '3px solid #22c55e';
    setTimeout(() => { el.style.outline = orig; }, 1000);

    const action = {
      type: 'ACT',
      instruction: instruction,
      timestamp: Date.now(),
      element: { tag: info.tag, text: info.text },
    };

    window.__RECORDED_ACTIONS__.push(action);

    // 通过自定义事件通知页面内的监听器
    window.dispatchEvent(new CustomEvent('stagehand-recorded', { detail: action }));
  }, true);

  // 拦截表单提交
  document.addEventListener('submit', function(e) {
    if (!window.__RECORDING_ACTIVE__) return;
    const form = e.target;
    const action = {
      type: 'ACT',
      instruction: '提交表单',
      timestamp: Date.now(),
      element: { tag: 'form', text: '' },
    };
    window.__RECORDED_ACTIONS__.push(action);
    window.dispatchEvent(new CustomEvent('stagehand-recorded', { detail: action }));
  }, true);
})();
`;

export function getRecordScript(): string {
  return RECORD_SCRIPT;
}

export function getStartRecordingScript(): string {
  return "window.__RECORDING_ACTIVE__ = true; window.__RECORDED_ACTIONS__ = [];";
}

export function getStopRecordingScript(): string {
  return "window.__RECORDING_ACTIVE__ = false;";
}

export function getGetActionsScript(): string {
  return "JSON.stringify(window.__RECORDED_ACTIONS__ || [])";
}
