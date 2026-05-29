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
    logger.info(MOD, "正在监听引擎事件...");

    const unlisten = listen<EngineEvent>("rpa-event", (event) => {
      const { event_type, data } = event.payload;
      addEngineEvent(event.payload);

      switch (event_type) {
        case "CACHE_HIT":
          if (data.step_id) setNodeStatus(data.step_id as string, "success");
          logger.info(MOD, "缓存命中，跳过 AI 调用");
          break;
        case "SELF_HEAL":
          if (data.step_id) setNodeStatus(data.step_id as string, "healing");
          logger.warn(MOD, "检测到页面变动，AI 正在自动寻找新元素...");
          break;
        case "STEP_START":
          if (data.step_id) setNodeStatus(data.step_id as string, "running");
          logger.info(MOD, `${data.step || ""} ${data.instruction || data.url || ""}`.trim());
          break;
        case "ACTION_COMPLETED":
        case "STEP_COMPLETE":
          if (data.step_id) setNodeStatus(data.step_id as string, "success");
          logger.success(MOD, `${data.step || "步骤"} 执行完成`);
          break;
        case "ENGINE_BOOT":
          logger.success(MOD, `引擎就绪 (${data.model || ""})`);
          break;
        case "DATA_EXTRACTED":
          logger.success(MOD, "数据提取完成");
          break;
        case "AGENT_SUCCESS":
          logger.success(MOD, "智能体任务完成");
          break;
        case "AGENT_START":
          logger.info(MOD, `智能体启动: ${data.task || ""}`);
          break;
        case "CAPTCHA_PAUSE":
          logger.warn(MOD, "检测到验证码，请手动处理");
          if (data.step_id) {
            setNodeStatus(data.step_id as string, "healing");
            setCaptchaStepId(data.step_id as string);
          }
          break;
        case "PAGINATION_FINISHED":
          logger.success(MOD, `翻页抓取完成，共 ${data.totalPages || "?"} 页`);
          break;
        case "FINISHED":
          console.log("[useEngine] 收到 FINISHED 事件, 即将 setRunning(false)");
          logger.success(MOD, "工作流执行完成");
          setRunning(false);
          console.log("[useEngine] setRunning(false) 已调用");
          break;
        case "ERROR":
          logger.error(MOD, `引擎错误: ${data.message || "未知错误"}`);
          if (data.step_id) setNodeStatus(data.step_id as string, "error");
          if (data.message) setError(data.message as string);
          break;
        default:
          logger.debug(MOD, `未处理事件: ${event_type}`);
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

    logger.info(MOD, `开始运行工作流: ${currentWorkflow.name}, ${steps.length} 步`);

    setError(null);
    resetNodeStatuses();
    setRunning(true);

    const workflowJson = JSON.stringify(currentWorkflow);
    logger.debug(MOD, `workflowJson 长度: ${workflowJson.length}`);

    try {
      logger.info(MOD, "调用 invoke run_workflow...");
      const result = await invoke("run_workflow", {
        workflowJson,
        workflowId: currentWorkflow.id ?? 0,
      });
      logger.success(MOD, "任务已部署到执行引擎");
    // [Refactor: err 类型从 any 改为 unknown by Claude]
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
      logger.info(MOD, "停止信号已发送");
    } catch (err: unknown) {
      logger.error(MOD, `停止失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [setRunning]);

  const clearError = useCallback(() => setError(null), []);

  const continueAfterCaptcha = useCallback(() => {
    logger.info(MOD, "用户确认验证码处理完成，继续执行");
    setCaptchaStepId(null);
    // 通过 Tauri 命令向 bun 进程 stdin 发送继续信号
    invoke("continue_engine").catch((err) => {
      logger.error(MOD, `发送继续信号失败: ${err}`);
    });
  }, []);

  return { runWorkflow, stopWorkflow, isRunning, error, clearError, captchaStepId, continueAfterCaptcha };
}
