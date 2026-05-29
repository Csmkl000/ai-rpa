import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkflowStore } from "../stores/workflowStore";
import { useAppStore } from "../stores/appStore";
import { logger } from "../lib/logger";
import type { WorkflowStep } from "../types/workflow";

const MOD = "AI 规划";

export function usePlanner() {
  const [isPlanning, setIsPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setCurrentWorkflow = useWorkflowStore((s) => s.setCurrentWorkflow);
  const setPage = useAppStore((s) => s.setPage);

  const plan = useCallback(async (userInput: string) => {
    if (!userInput.trim()) return;

    logger.info(MOD, `开始规划: ${userInput}`);
    setIsPlanning(true);
    setError(null);

    try {
      const resultJson = await invoke<string>("plan_workflow", { userInput });
      const result = JSON.parse(resultJson);

      if (!result.steps || result.steps.length === 0) {
        throw new Error("AI 未能生成有效步骤");
      }

      // 为每个步骤生成 id（如果没有）
      const steps: WorkflowStep[] = result.steps.map((s: any) => ({
        id: s.id || crypto.randomUUID(),
        type: s.type,
        label: s.label || s.type,
        value: s.value,
        instruction: s.instruction,
        fields: s.fields,
        condition: s.condition,
        maxIterations: s.maxIterations,
        body: s.body,
        task: s.task,
        maxSteps: s.maxSteps,
      }));

      // 创建工作流并跳转到编辑页
      setCurrentWorkflow({
        name: userInput.slice(0, 30),
        steps,
      });
      setPage("workflow");

      logger.success(MOD, `生成 ${steps.length} 个步骤`);
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || String(err);
      logger.error(MOD, `规划失败: ${msg}`);
      setError(msg);
    } finally {
      setIsPlanning(false);
    }
  }, [setCurrentWorkflow, setPage]);

  return { plan, isPlanning, error, clearError: () => setError(null) };
}
