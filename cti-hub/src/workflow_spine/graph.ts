import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { NormalizedIntent } from "../core_runtime/ntntn";
import { mim, MIMContextPack } from "../core_runtime/mim";
import { acheevy, ActionBoardState } from "../core_runtime/acheevy";
import type { AgentWorkloadStep } from "../core_runtime/agent_fleet";
import type { BoomerAngResult } from "../execution_branches/boomer_angs";

/**
 * Workflow Spine - LangGraph Definition
 * Orchestrates the huddle loop and branch execution.
 */

// 1. Define the State
const StateAnnotation = Annotation.Root({
  intent: Annotation<string>(),
  orgId: Annotation<string>(),
  normalized: Annotation<NormalizedIntent | null>(),
  context: Annotation<MIMContextPack | null>(),
  plan: Annotation<AgentWorkloadStep[]>(),
  boardState: Annotation<ActionBoardState | null>(),
  outputs: Annotation<BoomerAngResult[]>(),
  error: Annotation<string | null>(),
});

// 2. Define Nodes
const huddleNode = async (state: typeof StateAnnotation.State) => {
  try {
    const result = await acheevy.huddle(state.intent, state.orgId);
    return {
      normalized: result.state.normalized_intent,
      context: result.context,
      plan: result.plan,
      boardState: result.state
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Huddle failed' };
  }
};

const validateNode = async (state: typeof StateAnnotation.State) => {
  if (!state.context || !state.normalized) return { error: "Missing context or intention" };
  
  // Example validation check
  const validation = await mim.validateExecution({ type: 'huddle_plan', plan: state.plan }, state.context);
  if (!validation.approved) {
    return { error: `Policy Violation: ${validation.reason}` };
  }
  return {};
};

const executeNode = async (state: typeof StateAnnotation.State) => {
  if (!state.plan || !state.boardState || !state.context) {
    return { error: "Execution blocked: missing plan, state, or context." };
  }

  try {
    const result = await acheevy.execute(state.plan, state.boardState, state.context);
    if (!result.success) {
      return { 
        error: `Execution Failed: ${result.state.checkpoints.slice(-1)[0]}`,
        boardState: result.state 
      };
    }
    return {
      boardState: result.state,
      outputs: result.state.results
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown runtime error';
    return { error: `Runtime Error: ${message}` };
  }
};

// 3. Create the Graph
const workflow = new StateGraph(StateAnnotation)
  .addNode("huddle", huddleNode)
  .addNode("validate", validateNode)
  .addNode("execute", executeNode)
  .addEdge(START, "huddle")
  .addEdge("huddle", "validate")
  .addEdge("validate", "execute")
  .addEdge("execute", END);

// 4. Export the Runnable
export const grammarGraph = workflow.compile();
