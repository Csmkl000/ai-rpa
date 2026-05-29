import { useState, useRef, useEffect } from "react";
import { useChat } from "../../hooks/useChat";
import { useAppStore } from "../../stores/appStore";

export function ChatPanel() {
  const { messages, isProcessing, waitingConfirm, send, confirmStep, skipStep, clearMessages } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const controlLevel = useAppStore((s) => s);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !isProcessing) {
      send(input.trim());
      setInput("");
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-700">AI 对话</span>
        <button onClick={clearMessages} className="text-xs text-gray-400 hover:text-gray-600">清空</button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-xs py-8">
            <p className="mb-1">输入你想做的事</p>
            <p className="text-gray-300">如"搜索Python教程"、"提取商品价格"</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : msg.role === "system"
                  ? "bg-gray-100 text-gray-500"
                  : "bg-gray-50 text-gray-700"
              }`}
            >
              {msg.content}
              {msg.step && (
                <div className="mt-1 text-xs opacity-70">
                  [{msg.step.type}] {msg.step.instruction || msg.step.value}
                </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-400">
              <span className="animate-pulse">AI 思考中...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 确认栏 */}
      {waitingConfirm && (
        <div className="px-3 py-2 bg-yellow-50 border-t border-yellow-200 flex gap-2">
          <button
            onClick={confirmStep}
            className="flex-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium"
          >
            确认执行
          </button>
          <button
            onClick={skipStep}
            className="flex-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded text-xs font-medium"
          >
            跳过
          </button>
        </div>
      )}

      {/* 输入框 */}
      <div className="px-3 py-2 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={isProcessing}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            placeholder="输入指令..."
          />
          <button
            onClick={handleSend}
            disabled={isProcessing || !input.trim()}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
