import { useEffect, useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useWorkflowStore } from "../stores/workflowStore";
import { logger } from "../lib/logger";
import type { EngineEvent } from "../types/workflow";

const MOD = "Engine";

export function useEngine() {
  const {
    currentWorkflow,
    isRunning,
    setRunning,
    addEngineEvent,
    setNodeStatus,
    resetNodeStatuses,
  } = useWorkflowStore();

  const [error, setError] = useState<string | null>(null);
  const [captchaStepId, setCaptchaStepId] = useState<string | null>(null);

  useEffect(() => {
    const unlisten = listen<EngineEvent>("rpa-event", (event) => {
      const { event_type, data } = event.payload;
      addEngineEvent(event.payload);

      const stepId = data.step_id as string | undefined;
      const detail = typeof data === "object" ? JSON.stringify(data) : undefined;

      switch (event_type) {
        case "CACHE_HIT":
          if (stepId) setNodeStatus(stepId, "success");
          logger.engine("success", MOD, "缓存命中，跳过 LLM 调用", detail, stepId);
          break;
        case "SELF_HEAL":
          if (stepId) setNodeStatus(stepId, "healing");
          logger.engine("warn", MOD, "页面变动，AI 自愈中...", detail, stepId);
          break;
        case "STEP_START":
          if (stepId) setNodeStatus(stepId, "running");
          logger.engine("info", MOD, `${data.step || ""} ${data.instruction || data.url || ""}`.trim(), detail, stepId);
          break;
        case "ACTION_COMPLETED":
        case "STEP_COMPLETE":
          if (stepId) setNodeStatus(stepId, "success");
          logger.engine("success", MOD, `${data.step || "步骤"} 完成`, detail, stepId);
          break;
        case "ENGINE_BOOT":
          logger.engine("success", MOD, `引擎就绪 (${data.model || ""})`, detail);
          break;
        case "DATA_EXTRACTED":
          logger.engine("success", MOD, "数据提取完成", detail, stepId);
          break;
        case "AGENT_START":
          logger.engine("info", MOD, `智能体启动: ${data.task || ""}`, detail, stepId);
          break;
        case "AGENT_SUCCESS":
          logger.engine("success", MOD, "智能体任务完成", detail, stepId);
          break;
        case "CAPTCHA_PAUSE":
          logger.engine("warn", MOD, "检测到验证码，等待手动处理", detail, stepId);
          if (stepId) {
            setNodeStatus(stepId, "healing");
            setCaptchaStepId(stepId);
          }
          break;
        case "PAGINATION_FINISHED":
          logger.engine("success", MOD, `翻页完成，共 ${data.totalPages || "?"} 页`, detail, stepId);
          break;
        case "FINISHED":
          logger.engine("success", MOD, "工作流执行完成", detail);
          setRunning(false);
          break;
        case "ERROR":
          logger.engine("error", MOD, `${data.message || "未知错误"}`, detail, stepId);
          if (stepId) setNodeStatus(stepId, "error");
          if (data.message) setError(data.message as string);
          break;
        case "LOG":
          logger.engine("debug", "Engine-IO", `${data.log || data.message || ""}`, detail);
          break;
        default:
          logger.engine("debug", MOD, `事件: ${event_type}`, detail);
      }
    });

    return () => { unlisten.then((fn) => fn()); };
  }, [addEngineEvent, setNodeStatus, setRunning]);

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

    const workflowJson = JSON.stringify(currentWorkflow);

    try {
      await invoke("run_workflow", {
        workflowJson,
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
    logger.info(MOD, "用户确认验证码，继续执行");
    setCaptchaStepId(null);
    invoke("continue_engine").catch((err) => {
      logger.error(MOD, `发送继续信号失败: ${err}`);
    });
  }, []);

  return { runWorkflow, stopWorkflow, isRunning, error, clearError, captchaStepId, continueAfterCaptcha };
}
