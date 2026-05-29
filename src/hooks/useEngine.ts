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
  const [screenshot, setScreenshot] = useState<string | null>(null);

  useEffect(() => {
    logger.info(MOD, "正在监听引擎事件...");

    const unlisten = listen<EngineEvent>("rpa-event", (event) => {
      const { event_type, data } = event.payload;
      logger.debug(MOD, `收到事件: ${event_type}`, data);
      addEngineEvent(event.payload);

      switch (event_type) {
        case "CACHE_HIT":
          if (data.step_id) setNodeStatus(data.step_id as string, "success");
          break;
        case "SELF_HEAL":
          if (data.step_id) setNodeStatus(data.step_id as string, "healing");
          break;
        case "ACTION_COMPLETED":
        case "STEP_COMPLETE":
          if (data.step_id) setNodeStatus(data.step_id as string, "success");
          break;
        case "STEP_START":
          if (data.step_id) setNodeStatus(data.step_id as string, "running");
          break;
        case "ENGINE_BOOT":
          logger.info(MOD, "引擎启动完成", data);
          break;
        case "DATA_EXTRACTED":
          logger.info(MOD, "数据提取完成", data);
          break;
        case "AGENT_SUCCESS":
          logger.info(MOD, "智能体任务完成", data);
          break;
        case "CAPTCHA_PAUSE":
          // 指南 5: 人工介入握手 — 验证码/2FA 暂停
          logger.warn(MOD, "检测到验证码，等待用户手动处理", data);
          if (data.step_id) {
            setNodeStatus(data.step_id as string, "healing");
            setCaptchaStepId(data.step_id as string);
          }
          break;
        case "SCREENSHOT":
          // 指南 3: 浏览器预览截图
          if (data.image) setScreenshot(data.image as string);
          break;
        case "FINISHED":
          logger.info(MOD, "工作流执行结束", data);
          setRunning(false);
          break;
        case "ERROR":
          logger.error(MOD, "引擎错误", data);
          if (data.step_id) setNodeStatus(data.step_id as string, "error");
          if (data.message) setError(data.message as string);
          break;
        default:
          logger.debug(MOD, `未处理事件: ${event_type}`, data);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
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
      logger.warn(MOD, "已有任务在运行中，忽略");
      return;
    }

    const steps = currentWorkflow.steps || [];
    if (steps.length === 0) {
      const msg = "工作流没有任何步骤，请先添加步骤";
      logger.warn(MOD, msg);
      setError(msg);
      return;
    }

    logger.info(MOD, `开始运行工作流: ${currentWorkflow.name}, ${steps.length} 步`, steps);

    setError(null);
    resetNodeStatuses();
    setRunning(true);

    const workflowJson = JSON.stringify(currentWorkflow);
    logger.debug(MOD, "workflowJson 长度:", workflowJson.length);

    try {
      logger.info(MOD, "调用 invoke run_workflow...");
      const result = await invoke("run_workflow", {
        workflowJson,
        workflowId: currentWorkflow.id ?? 0,
      });
      logger.info(MOD, "invoke 成功:", result);
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || String(err);
      logger.error(MOD, "invoke 失败:", msg);
      setError(msg);
      setRunning(false);
    }
  }, [currentWorkflow, isRunning, resetNodeStatuses, setRunning]);

  const stopWorkflow = useCallback(async () => {
    logger.info(MOD, "点击停止按钮");
    try {
      await invoke("stop_workflow");
      setRunning(false);
      logger.info(MOD, "停止信号已发送");
    } catch (err: any) {
      logger.error(MOD, "停止失败:", err);
    }
  }, [setRunning]);

  const clearError = useCallback(() => setError(null), []);

  const continueAfterCaptcha = useCallback(() => {
    logger.info(MOD, "用户确认验证码处理完成，继续执行");
    setCaptchaStepId(null);
    // 通过 Tauri 命令向 bun 进程 stdin 发送继续信号
    invoke("continue_engine").catch((err) => {
      logger.error(MOD, "发送继续信号失败:", err);
    });
  }, []);

  return { runWorkflow, stopWorkflow, isRunning, error, clearError, captchaStepId, continueAfterCaptcha, screenshot };
}
