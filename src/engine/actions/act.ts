import type { Stagehand } from "@browserbasehq/stagehand";
import { emitStep, emitError } from "../protocol/messages";
import { detectCaptcha, waitForUserContinue } from "../utils/captcha";

export interface ActStep {
  type: "ACT";
  id: string;
  instruction: string;
}

export async function executeAct(stagehand: Stagehand, step: ActStep): Promise<void> {
  emitStep("STEP_START", step.id, { step: "ACT", instruction: step.instruction });

  try {
    const result = await stagehand.act(step.instruction);
    emitStep("ACTION_COMPLETED", step.id, { instruction: step.instruction, result });
    emitStep("STEP_COMPLETE", step.id, { step: "ACT" });
  } catch (err: any) {
    const msg = err?.message || String(err);

    // 指南 5: 检测是否因验证码卡住
    try {
      const pages = stagehand.context.pages();
      for (const page of pages) {
        if (await detectCaptcha(page)) {
          await waitForUserContinue(step.id);
          const retryResult = await stagehand.act(step.instruction);
          emitStep("ACTION_COMPLETED", step.id, { instruction: step.instruction, result: retryResult });
          emitStep("STEP_COMPLETE", step.id, { step: "ACT" });
          return;
        }
      }
    } catch {}

    // #5: 只 throw 不 emit，让顶层统一处理
    throw new Error(`ACT 失败: ${msg}`);
  }
}
