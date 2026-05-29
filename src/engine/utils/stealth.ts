// 指南 7.2: 指纹防检测（Stealth Mode）
// 注入脚本屏蔽 WebDriver 标志、伪造 Navigator 指纹

export const STEALTH_SCRIPTS = [
  // 隐藏 webdriver 标志
  `Object.defineProperty(navigator, 'webdriver', { get: () => undefined });`,

  // #14: 伪造 plugins（模拟真实 Plugin 对象结构）
  `Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const plugins = [
        { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', description: '', filename: 'internal-nacl-plugin' },
      ];
      plugins.length = 3;
      return plugins;
    },
  });`,

  // 伪造 languages
  `Object.defineProperty(navigator, 'languages', {
    get: () => ['zh-CN', 'zh', 'en-US', 'en'],
  });`,

  // 隐藏 Chrome 自动化特征
  `window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){} };`,

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

  // 伪造 hardwareConcurrency
  `Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });`,

  // 伪造 deviceMemory
  `Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });`,
];

export function getStealthScript(): string {
  return STEALTH_SCRIPTS.join("\n");
}
