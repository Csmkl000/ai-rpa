import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../../stores/appStore";
import { useWorkflowStore } from "../../stores/workflowStore";
import { logger } from "../../lib/logger";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewWorkflowDialog({ open, onClose }: Props) {
  const [url, setUrl] = useState("https://");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setPage = useAppStore((s) => s.setPage);
  const setCurrentWorkflow = useWorkflowStore((s) => s.setCurrentWorkflow);
  const settings = useWorkflowStore((s) => s.settings);

  if (!open) return null;

  const handleCreate = async () => {
    if (!url.trim() || url === "https://") {
      setError("请输入目标网址");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 启动 Chrome 打开目标页面
      logger.info("工作流", `启动 Chrome: ${url}`);
      const cdpUrl = await invoke<string>("launch_chrome", {
        url: url.trim(),
        chromePath: settings.chrome_path || null,
      });
      logger.success("工作流", `Chrome 已启动, CDP: ${cdpUrl}`);

      // 创建工作流并跳转
      const workflowName = name.trim() || new URL(url.trim()).hostname;
      setCurrentWorkflow({
        name: workflowName,
        steps: [{ id: crypto.randomUUID(), type: "GOTO", label: "打开网页", value: url.trim() }],
      });
      setPage("workflow");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      logger.error("工作流", `启动 Chrome 失败: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">新建工作流</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-500">
            输入目标网址，将打开你的 Chrome 浏览器。你可以在浏览器中登录、浏览，准备好后开始录制或手动添加步骤。
          </p>

          {/* 工作流名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">工作流名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="自动填入网站域名"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* 目标网址 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标网址</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
              placeholder="https://www.example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
          >
            {loading ? "正在启动 Chrome..." : "创建并打开浏览器"}
          </button>
        </div>
      </div>
    </div>
  );
}
