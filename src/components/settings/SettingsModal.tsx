import { useState, useEffect } from "react";
import { useAppStore } from "../../stores/appStore";
import { useWorkflowStore } from "../../stores/workflowStore";
import { getSettings, updateSettings } from "../../lib/tauri";
import { logger } from "../../lib/logger";
import type { AppSettings } from "../../types/workflow";

export function SettingsModal() {
  const { settingsOpen, setSettingsOpen } = useAppStore();
  const settings = useWorkflowStore((s) => s.settings);
  const setSettings = useWorkflowStore((s) => s.setSettings);
  const [local, setLocal] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settingsOpen) {
      getSettings().then(setSettings).catch(console.error);
    }
  }, [settingsOpen, setSettings]);

  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  const handleSave = async () => {
    logger.info("Settings", `保存设置: ${local.llm_provider} / ${local.llm_model}`);
    try {
      await updateSettings(local);
      setSettings(local);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      logger.error("Settings", `保存失败: ${err}`);
    }
  };

  if (!settingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => setSettingsOpen(false)}
      />

      {/* 弹窗 */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">设置</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 space-y-5">
          {/* 提供商 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">大模型提供商</label>
            <select
              value={local.llm_provider}
              onChange={(e) => setLocal({ ...local, llm_provider: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="google">Google (Gemini)</option>
              <option value="ollama">Ollama (本地)</option>
              <option value="custom">自定义 (OpenAI 兼容)</option>
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              value={local.llm_api_key}
              onChange={(e) => setLocal({ ...local, llm_api_key: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="sk-..."
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
            <input
              type="text"
              value={local.base_url || ""}
              onChange={(e) => setLocal({ ...local, base_url: e.target.value || undefined })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://api.openai.com/v1"
            />
            <p className="text-xs text-gray-400 mt-1">留空使用官方地址，第三方中转站填此处</p>
          </div>

          {/* 模型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
            <input
              type="text"
              value={local.llm_model}
              onChange={(e) => setLocal({ ...local, llm_model: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="gpt-4o"
            />
          </div>

          {/* 代理 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">代理地址</label>
            <input
              type="text"
              value={local.proxy_url || ""}
              onChange={(e) => setLocal({ ...local, proxy_url: e.target.value || undefined })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="http://127.0.0.1:7890"
            />
          </div>

          {/* 无头浏览器 */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">无头浏览器</label>
              <p className="text-xs text-gray-400">关闭后可看到浏览器操作过程</p>
            </div>
            <button
              onClick={() => setLocal({ ...local, headless: !local.headless })}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                local.headless ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${local.headless ? "translate-x-5" : ""}`} />
            </button>
          </div>

          {/* 控制级别 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">AI 对话控制级别</label>
            <div className="space-y-2">
              {[
                { value: "auto", label: "自动模式", desc: "AI 生成指令后直接执行，全程不干预" },
                { value: "confirm", label: "确认模式", desc: "每条指令生成后暂停，确认才执行（默认）" },
                { value: "step", label: "单步模式", desc: "每步都暂停，确认后只执行一步" },
              ].map((opt) => (
                <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="control_level"
                    value={opt.value}
                    checked={(local.control_level || "confirm") === opt.value}
                    onChange={() => setLocal({ ...local, control_level: opt.value as any })}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm text-gray-700">{opt.label}</span>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 缓存 TTL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">缓存过期天数</label>
            <input
              type="number"
              value={local.cache_ttl_days}
              onChange={(e) => setLocal({ ...local, cache_ttl_days: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min={1}
              max={365}
            />
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saved ? "已保存" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
