// 指南 7.2: 指纹防检测（Stealth Mode）
// 注入脚本屏蔽 WebDriver 标志、伪造 Navigator 指纹

export const STEALTH_SCRIPTS = [
  // 隐藏 webdriver 标志
  `Object.defineProperty(navigator, 'webdriver', { get: () => undefined });`,

  // 伪造 plugins（正常浏览器有 plugins，自动化浏览器通常为空）
  `Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5],
  });`,

  // 伪造 languages
  `Object.defineProperty(navigator, 'languages', {
    get: () => ['zh-CN', 'zh', 'en-US', 'en'],
  });`,

  // 隐藏 Chrome 自动化特征
  `window.chrome = { runtime: {} };`,

  // 隐藏 automation 相关属性
  `delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
   delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
   delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;`,

  // 伪造 permission query
  `const originalQuery = window.navigator.permissions.query;
   window.navigator.permissions.query = (parameters) =>
     parameters.name === 'notifications'
       ? Promise.resolve({ state: Notification.permission })
       : originalQuery(parameters);`,
];

export function getStealthScript(): string {
  return STEALTH_SCRIPTS.join("\n");
}
