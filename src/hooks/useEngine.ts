import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkflowStore } from "../stores/workflowStore";
import { logger } from "../lib/logger";

const MOD = "Engine";

// 引擎事件监听已移到 EngineListener 组件（全局只注册一次）

export function useEngine() {
  const currentWorkflow = useWorkflowStore((s) => s.currentWorkflow);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const setRunning = useWorkflowStore((s) => s.setRunning);
  const resetNodeStatuses = useWorkflowStore((s) => s.resetNodeStatuses);

  const [error, setError] = useState<string | null>(null);
  const [captchaStepId, setCaptchaStepId] = useState<string | null>(null);

  // captchaStepId 通过 EngineListener 设置到 store，这里从 store 读取
  // 临时保留 local state 直到 store 重构
  const storeCaptcha = useWorkflowStore((s) => (s as any).captchaStepId);
  const effectiveCaptcha = storeCaptcha || captchaStepId;

  const runWorkflow = useCallback(async () => {
    logger.info(MOD, "点击运行按钮");

    if (!currentWorkflow) {
      const msg = "请先创建或选择一个工作流";
      logger.warn(MOD, msg);
      setError(msg);
      return;
    }
    if (isRunning) {
      logger.warn(MOD, "已有任务在运行中");
      return;
    }

    const steps = currentWorkflow.steps || [];
    if (steps.length === 0) {
      const msg = "工作流没有任何步骤";
      logger.warn(MOD, msg);
      setError(msg);
      return;
    }

    logger.info(MOD, `运行: ${currentWorkflow.name} (${steps.length} 步)`);

    setError(null);
    resetNodeStatuses();
    setRunning(true);

    try {
      await invoke("run_workflow", {
        workflowJson: JSON.stringify(currentWorkflow),
        workflowId: currentWorkflow.id ?? 0,
      });
      logger.success(MOD, "任务已部署到执行引擎");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(MOD, `启动失败: ${msg}`);
      setError(msg);
      setRunning(false);
    }
  }, [currentWorkflow, isRunning, resetNodeStatuses, setRunning]);

  const stopWorkflow = useCallback(async () => {
    logger.info(MOD, "点击停止按钮");
    try {
      await invoke("stop_workflow");
      setRunning(false);
    } catch (err: unknown) {
      logger.error(MOD, `停止失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [setRunning]);

  const clearError = useCallback(() => setError(null), []);

  const continueAfterCaptcha = useCallback(() => {
    logger.info(MOD, "用户确认验证码");
    setCaptchaStepId(null);
    invoke("continue_engine").catch((err) => {
      logger.error(MOD, `继续信号失败: ${err}`);
    });
  }, []);

  return { runWorkflow, stopWorkflow, isRunning, error, clearError, captchaStepId: effectiveCaptcha, continueAfterCaptcha };
}
