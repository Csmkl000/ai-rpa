import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkflowStore } from "../stores/workflowStore";
import { logger } from "../lib/logger";
import type { Workflow, WorkflowStep, StepType } from "../types/workflow";

const MOD = "Workflow";

export function useWorkflow() {
  const {
    workflows,
    currentWorkflow,
    setWorkflows,
    setCurrentWorkflow,
    addStep,
    updateStep,
    removeStep,
  } = useWorkflowStore();

  const loadWorkflows = useCallback(async () => {
    logger.info(MOD, "加载工作流列表...");
    try {
      const result = await invoke<any[]>("load_workflows");
      logger.debug(MOD, `从数据库读取 ${result.length} 条记录`);

      const parsed: Workflow[] = result.map((w) => ({
        id: w.id,
        name: w.name,
        steps: typeof w.steps_json === "string" ? JSON.parse(w.steps_json) : w.steps ?? [],
        created_at: w.created_at,
        updated_at: w.updated_at,
      }));

      setWorkflows(parsed);
      logger.info(MOD, `成功加载 ${parsed.length} 个工作流`);
    } // [Refactor: err 类型从 any 改为 unknown by Claude]
    catch (err: unknown) {
      logger.error(MOD, `加载工作流失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [setWorkflows]);

  const saveWorkflow = useCallback(async () => {
    if (!currentWorkflow) {
      logger.warn(MOD, "没有选中的工作流，跳过保存");
      return;
    }
    logger.info(MOD, `保存工作流: ${currentWorkflow.name} (${currentWorkflow.steps.length} 步)`);
    try {
      const id = await invoke<number>("save_workflow", {
        input: {
          id: currentWorkflow.id ?? null,
          name: currentWorkflow.name,
          steps: currentWorkflow.steps,
        },
      });
      setCurrentWorkflow({ ...currentWorkflow, id });
      logger.info(MOD, `保存成功, id=${id}`);
      await loadWorkflows();
    } // [Refactor: err 类型从 any 改为 unknown by Claude]
    catch (err: unknown) {
      logger.error(MOD, `保存失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [currentWorkflow, setCurrentWorkflow, loadWorkflows]);

  const deleteWorkflow = useCallback(
    async (id: number) => {
      logger.info(MOD, `删除工作流 id=${id}`);
      try {
        await invoke("delete_workflow", { id });
        await loadWorkflows();
        if (currentWorkflow?.id === id) {
          setCurrentWorkflow(null);
        }
        logger.info(MOD, "删除成功");
      } // [Refactor: err 类型从 any 改为 unknown by Claude]
    catch (err: unknown) {
        logger.error(MOD, `删除失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [currentWorkflow, loadWorkflows, setCurrentWorkflow]
  );

  const createNewWorkflow = useCallback(() => {
    logger.info(MOD, "创建新工作流");
    const workflow: Workflow = {
      name: "新建工作流",
      steps: [],
    };
    setCurrentWorkflow(workflow);
  }, [setCurrentWorkflow]);

  const addNewStep = useCallback(
    (type: StepType) => {
      const labels: Record<StepType, string> = {
        GOTO: "打开网页",
        ACT: "执行操作",
        EXTRACT: "提取数据",
        OBSERVE: "观察页面",
        LOOP: "循环",
        CONDITION: "条件分支",
        AUTONOMOUS_AGENT: "AI 智能体",
      };

      const step: WorkflowStep = {
        id: crypto.randomUUID(),
        type,
        label: labels[type],
      };
      logger.info(MOD, `添加步骤: ${type} (${labels[type]})`);
      addStep(step);
    },
    [addStep]
  );

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  return {
    workflows,
    currentWorkflow,
    loadWorkflows,
    saveWorkflow,
    deleteWorkflow,
    createNewWorkflow,
    addNewStep,
    updateStep,
    removeStep,
    setCurrentWorkflow,
  };
}
