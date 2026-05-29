import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkflowStore } from "../stores/workflowStore";
import { logger } from "../lib/logger";
import type { WorkflowStep, ControlLevel } from "../types/workflow";

const MOD = "AI 对话";

export interface ChatMessage {
  id: string;
  role: "user" | "ai" | "system";
  content: string;
  step?: WorkflowStep;
  timestamp: number;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [waitingConfirm, setWaitingConfirm] = useState(false);
  const pendingStepRef = useRef<WorkflowStep | null>(null);

  const settings = useWorkflowStore((s) => s.settings);
  const addStep = useWorkflowStore((s) => s.addStep);

  const addMessage = useCallback((msg: Omit<ChatMessage, "id" | "timestamp">) => {
    setMessages((prev) => [...prev, { ...msg, id: crypto.randomUUID(), timestamp: Date.now() }]);
  }, []);

  const send = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isProcessing) return;

    // 添加用户消息
    addMessage({ role: "user", content: userInput });
    setIsProcessing(true);

    try {
      const cacheDir = (await invoke("get_settings") as any).cache_dir || "/tmp/stagehand-cache";

      // 调用 Rust 对话命令
      const resultJson = await invoke<string>("chat_step", {
        userMessage: userInput,
        apiKey: settings.llm_api_key,
        model: settings.llm_model,
        baseUrl: settings.base_url || "",
        cacheDir,
      });

      const { step, result } = JSON.parse(resultJson);

      if (step.type === "DONE") {
        addMessage({ role: "ai", content: step.message || "任务完成" });
        setIsProcessing(false);
        return;
      }

      // 生成工作流步骤
      const workflowStep: WorkflowStep = {
        id: crypto.randomUUID(),
        type: step.type,
        label: step.instruction || step.type,
        value: step.value,
        instruction: step.instruction,
        fields: step.fields,
      };

      // 根据控制级别决定行为
      const level: ControlLevel = settings.control_level || "confirm";

      if (level === "auto") {
        // 自动模式: 直接执行并添加到画布
        addMessage({ role: "ai", content: `${result}`, step: workflowStep });
        addStep(workflowStep);
      } else if (level === "confirm") {
        // 确认模式: 暂停等用户确认
        pendingStepRef.current = workflowStep;
        setWaitingConfirm(true);
        addMessage({ role: "ai", content: `准备执行: ${step.instruction || step.value}`, step: workflowStep });
      } else {
        // 单步模式: 暂停等用户确认，确认后只执行一步
        pendingStepRef.current = workflowStep;
        setWaitingConfirm(true);
        addMessage({ role: "ai", content: `[单步] ${step.instruction || step.value}`, step: workflowStep });
      }
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || String(err);
      addMessage({ role: "system", content: `错误: ${msg}` });
    } finally {
      setIsProcessing(false);
    }
  }, [settings, addStep, addMessage, isProcessing]);

  const confirmStep = useCallback(() => {
    const step = pendingStepRef.current;
    if (step) {
      addStep(step);
      addMessage({ role: "system", content: `已确认: ${step.instruction || step.value}` });
      pendingStepRef.current = null;
    }
    setWaitingConfirm(false);
  }, [addStep, addMessage]);

  const skipStep = useCallback(() => {
    addMessage({ role: "system", content: "已跳过" });
    pendingStepRef.current = null;
    setWaitingConfirm(false);
  }, [addMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setWaitingConfirm(false);
    pendingStepRef.current = null;
  }, []);

  return {
    messages,
    isProcessing,
    waitingConfirm,
    send,
    confirmStep,
    skipStep,
    clearMessages,
  };
}
