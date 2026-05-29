import { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type OnConnect,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useWorkflowStore } from "../../stores/workflowStore";
import { GotoNode } from "./nodes/GotoNode";
import { ActNode } from "./nodes/ActNode";
import { ExtractNode } from "./nodes/ExtractNode";
import { LoopNode } from "./nodes/LoopNode";
import { AgentNode } from "./nodes/AgentNode";
import { ConditionNode } from "./nodes/ConditionNode";

const nodeTypes = {
  goto: GotoNode,
  act: ActNode,
  extract: ExtractNode,
  loop: LoopNode,
  agent: AgentNode,
  condition: ConditionNode,
};

const TYPE_TO_NODE: Record<string, string> = {
  GOTO: "goto",
  ACT: "act",
  EXTRACT: "extract",
  OBSERVE: "act",
  LOOP: "loop",
  AUTONOMOUS_AGENT: "agent",
  CONDITION: "condition",
};

function buildNodes(
  steps: any[],
  nodeStatuses: Record<string, string>,
  onUpdate: (id: string, updates: Record<string, unknown>) => void,
  onRemove: (id: string) => void
): Node[] {
  return steps.map((step, i) => ({
    id: step.id,
    type: TYPE_TO_NODE[step.type] || "act",
    position: { x: 250, y: i * 140 },
    data: {
      ...step,
      status: nodeStatuses[step.id] || "idle",
      onUpdate: (updates: Record<string, unknown>) => onUpdate(step.id, updates),
      onRemove: () => onRemove(step.id),
    },
  }));
}

function buildEdges(steps: any[], nodeStatuses: Record<string, string>): Edge[] {
  return steps.slice(0, -1).map((step, i) => ({
    id: `${step.id}-${steps[i + 1].id}`,
    source: step.id,
    target: steps[i + 1].id,
    type: "smoothstep",
    animated: nodeStatuses[step.id] === "running",
    style: { stroke: "#6366f1" },
  }));
}

export function WorkflowCanvas() {
  const currentWorkflow = useWorkflowStore((s) => s.currentWorkflow);
  const nodeStatuses = useWorkflowStore((s) => s.nodeStatuses);
  const updateStep = useWorkflowStore((s) => s.updateStep);
  const removeStep = useWorkflowStore((s) => s.removeStep);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  // [Perf: 用 ref 记录上次 steps 引用，避免 status 变化时重建全部节点]
  const prevStepsRef = useRef<any[] | null>(null);

  // 步骤变化时：重建全部节点和边
  useEffect(() => {
    if (!currentWorkflow) {
      setNodes([]);
      setEdges([]);
      prevStepsRef.current = null;
      return;
    }

    prevStepsRef.current = currentWorkflow.steps;
    const newNodes = buildNodes(currentWorkflow.steps, nodeStatuses, updateStep, removeStep);
    const newEdges = buildEdges(currentWorkflow.steps, nodeStatuses);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [currentWorkflow, currentWorkflow?.steps, updateStep, removeStep, setNodes, setEdges]);

  // [Perf: 状态变化时：只更新受影响节点的 data，不重建全部节点]
  useEffect(() => {
    if (!prevStepsRef.current) return;
    setNodes((nds) =>
      nds.map((node) => {
        const newStatus = nodeStatuses[node.id] || "idle";
        if (node.data.status === newStatus) return node;
        return { ...node, data: { ...node.data, status: newStatus } };
      })
    );
    setEdges((eds) =>
      eds.map((edge) => {
        const isRunning = nodeStatuses[edge.source] === "running";
        if (edge.animated === isRunning) return edge;
        return { ...edge, animated: isRunning };
      })
    );
  }, [nodeStatuses, setNodes, setEdges]);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: "smoothstep", style: { stroke: "#6366f1" } }, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        colorMode="light"
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "#6366f1" },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ddd" />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const status = nodeStatuses[node.id];
            switch (status) {
              case "running": return "#eab308";
              case "success": return "#22c55e";
              case "error": return "#ef4444";
              case "healing": return "#f97316";
              default: return "#d1d5db";
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}
