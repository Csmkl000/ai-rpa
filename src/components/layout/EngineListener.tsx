// 引擎事件监听器 — 全局只注册一次，避免重复日志
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useWorkflowStore } from "../../stores/workflowStore";
import { logger } from "../../lib/logger";
import type { EngineEvent } from "../../types/workflow";

const MOD = "Engine";

export function EngineListener() {
  const addEngineEvent = useWorkflowStore((s) => s.addEngineEvent);
  const setNodeStatus = useWorkflowStore((s) => s.setNodeStatus);
  const setRunning = useWorkflowStore((s) => s.setRunning);

  useEffect(() => {
    const unlisten = listen<EngineEvent>("rpa-event", (event) => {
      const { event_type, data } = event.payload;
      addEngineEvent(event.payload);

      const stepId = data.step_id as string | undefined;
      const detail = typeof data === "object" ? JSON.stringify(data) : undefined;

      switch (event_type) {
        case "CACHE_HIT":
          if (stepId) setNodeStatus(stepId, "success");
          logger.engine("success", MOD, "缓存命中，跳过 LLM", detail, stepId);
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
          logger.engine("info", MOD, `智能体: ${data.task || ""}`, detail, stepId);
          break;
        case "AGENT_SUCCESS":
          logger.engine("success", MOD, "智能体完成", detail, stepId);
          break;
        case "CAPTCHA_PAUSE":
          logger.engine("warn", MOD, "验证码，等待手动处理", detail, stepId);
          if (stepId) setNodeStatus(stepId, "healing");
          break;
        case "PAGINATION_FINISHED":
          logger.engine("success", MOD, `翻页完成 ${data.totalPages || "?"} 页`, detail, stepId);
          break;
        case "FINISHED":
          logger.engine("success", MOD, "工作流执行完成", detail);
          setRunning(false);
          break;
        case "ERROR":
          logger.engine("error", MOD, `${data.message || "未知错误"}`, detail, stepId);
          if (stepId) setNodeStatus(stepId, "error");
          break;
        case "LOG":
          // 引擎 IO 日志只在 debug 级别记录，不刷屏
          logger.engine("debug", "IO", `${data.log || data.message || ""}`, detail);
          break;
      }
    });

    return () => { unlisten.then((fn) => fn()); };
  }, [addEngineEvent, setNodeStatus, setRunning]);

  return null;
}
