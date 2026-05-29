import { useEngine } from "../../hooks/useEngine";

export function BrowserPreview() {
  const { screenshot, isRunning } = useEngine();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <span className="text-gray-400 text-xs font-medium">浏览器预览</span>
        {isRunning && (
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>

      <div className="flex-1 overflow-hidden bg-gray-950 flex items-center justify-center">
        {screenshot ? (
          <img
            src={screenshot}
            alt="Browser Preview"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-gray-600 text-sm text-center">
            <p className="mb-2">运行工作流后，浏览器画面将在此显示</p>
            <p className="text-xs">每步执行后自动截图</p>
          </div>
        )}
      </div>
    </div>
  );
}
