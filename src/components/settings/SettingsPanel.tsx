import { useState, useEffect } from "react";
import { useWorkflowStore } from "../../stores/workflowStore";
import { getSettings, updateSettings } from "../../lib/tauri";
import { logger } from "../../lib/logger";
import type { AppSettings } from "../../types/workflow";

export function SettingsPanel() {
  const settings = useWorkflowStore((s) => s.settings);
  const setSettings = useWorkflowStore((s) => s.setSettings);
  const [local, setLocal] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
  }, [setSettings]);

  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  const handleSave = async () => {
    logger.info("Settings", `保存设置: ${local.llm_provider} / ${local.llm_model}`);
    try {
      await updateSettings(local);
      setSettings(local);
      setSaved(true);
      logger.info("Settings", "设置保存成功");
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      logger.error("Settings", `保存设置失败: ${err}`);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 max-w-xl">
      <h2 className="text-lg font-semibold mb-6">设置</h2>

      <div className="space-y-6">
        {/* LLM Provider */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">大模型提供商</label>
          <select
            value={local.llm_provider}
            onChange={(e) => setLocal({ ...local, llm_provider: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
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
          <label className="block text-sm text-gray-400 mb-1">API Key</label>
          <input
            type="password"
            value={local.llm_api_key}
            onChange={(e) => setLocal({ ...local, llm_api_key: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="sk-..."
          />
        </div>

        {/* Base URL */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">API Base URL（可选）</label>
          <input
            type="text"
            value={local.base_url || ""}
            onChange={(e) => setLocal({ ...local, base_url: e.target.value || undefined })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="https://api.openai.com/v1"
          />
          <p className="text-xs text-gray-500 mt-1">
            留空使用官方地址。第三方中转站填此处，如 https://api.example.com/v1
          </p>
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">模型</label>
          <input
            type="text"
            value={local.llm_model}
            onChange={(e) => setLocal({ ...local, llm_model: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="gpt-4o"
          />
        </div>

        {/* Proxy */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">代理地址（可选）</label>
          <input
            type="text"
            value={local.proxy_url || ""}
            onChange={(e) => setLocal({ ...local, proxy_url: e.target.value || undefined })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="http://127.0.0.1:7890"
          />
        </div>

        {/* Headless toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-400">无头浏览器</label>
            <p className="text-xs text-gray-500">关闭后可看到浏览器操作过程</p>
          </div>
          <button
            onClick={() => setLocal({ ...local, headless: !local.headless })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              local.headless ? "bg-blue-600" : "bg-gray-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                local.headless ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Cache TTL */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">缓存过期天数</label>
          <input
            type="number"
            value={local.cache_ttl_days}
            onChange={(e) => setLocal({ ...local, cache_ttl_days: Number(e.target.value) })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            min={1}
            max={365}
          />
          <p className="text-xs text-gray-500 mt-1">
            超过此天数未使用的缓存将自动清理
          </p>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-500 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          {saved ? "已保存 ✓" : "保存设置"}
        </button>
      </div>
    </div>
  );
}
