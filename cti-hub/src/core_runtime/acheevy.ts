import { ntntn, NormalizedIntent } from './ntntn';
import { mim, MIMContextPack } from './mim';
import { pickerAng } from './picker_ang';
import { boomerAngs, BoomerAngResult } from '../execution_branches/boomer_angs';
import { buildSmith } from './buildsmith';
import { reviewHone } from './review_hone';
import { packaging } from './packaging';
import { agentFleet, AgentWorkloadStep } from './agent_fleet';

export interface ActionBoardState {
  status: 'planning' | 'running' | 'review' | 'blocked' | 'approved' | 'packaged' | 'delivered';
  current_step: number;
  total_steps: number;
  checkpoints: string[];
  normalized_intent?: NormalizedIntent;
  results: BoomerAngResult[];
}

export const acheevy = {
  huddle: async (rawIntent: string, orgId: string) => {
    console.log('ACHEEVY: Starting Huddle...');

    // 1. Normalize Intent (NTNTN)
    const normalized = await ntntn.normalize(rawIntent);
    console.log('ACHEEVY: Intent Normalized:', normalized.objective);

    // 2. Get Governed Context (MIM)
    const context = await mim.getGovernedContext(orgId);
    console.log('ACHEEVY: Governed Context Retrieved with', context.policies.length, 'policies.');

    // 3. Sequence Work Branches (Route via Picker_Ang)
    const plannedSteps = agentFleet.planWorkload(normalized);
    const executionPlan: AgentWorkloadStep[] = [];

    for (const plannedStep of plannedSteps) {
      const capability = await pickerAng.route(plannedStep.capability, normalized.constraints);
      executionPlan.push({
        ...plannedStep,
        capability: capability?.id ?? plannedStep.capability,
      });
    }

    // Update Board State
    const initialState: ActionBoardState = {
      status: 'planning',
      current_step: 0,
      total_steps: executionPlan.length,
      checkpoints: [],
      normalized_intent: normalized,
      results: []
    };

    return {
      plan: executionPlan,
      state: initialState,
      context
    };
  },

  execute: async (plan: AgentWorkloadStep[], state: ActionBoardState, context: MIMContextPack) => {
    console.log('ACHEEVY: Executing Work Plan...');
    const currentState: ActionBoardState = { ...state, status: 'running' };

    for (const step of plan) {
      currentState.current_step = step.step;
      await acheevy.updateBoard(currentState);

      // 1. Policy Re-Validation (MIM)
      const validation = await mim.validateExecution({ type: 'task', ...step }, context);
      if (!validation.approved) {
        currentState.status = 'blocked';
        currentState.checkpoints.push(`BLOCKED: ${validation.reason}`);
        await acheevy.updateBoard(currentState);
        return { success: false, state: currentState };
      }

      // 2. Perform Specialized Task (Boomer_Angs)
      const taskResult = await boomerAngs.execute({
        id: `step-${step.step}`,
        role: step.role,
        directive: step.directive,
        context: {
          ...context,
          previous_results: currentState.results,
          assigned_agent: step.agentId,
          expected_output: step.expectedOutput,
          execution_reason: step.reason,
        }
      });

      if (taskResult.status === 'failed') {
        currentState.status = 'blocked';
        currentState.checkpoints.push(`FAILED Step ${step.step}: ${taskResult.error}`);
        await acheevy.updateBoard(currentState);
        return { success: false, state: currentState };
      }

      if (!taskResult.result) {
        currentState.status = 'blocked';
        currentState.checkpoints.push(`FAILED Step ${step.step}: worker returned no result.`);
        await acheevy.updateBoard(currentState);
        return { success: false, state: currentState };
      }

      currentState.results.push(taskResult.result);
      currentState.checkpoints.push(`COMPLETED Step ${step.step}: ${taskResult.result.name} finished.`);
    }

    // 3. Assemble and Review
    currentState.status = 'review';
    await acheevy.updateBoard(currentState);

    const manifest = await buildSmith.assemble(currentState.results);
    const review = await reviewHone.validate(manifest);

    if (!review.approved) {
      currentState.status = 'blocked';
      currentState.checkpoints.push(`REVIEW FAILED: ${review.feedback.join(', ')}`);
      await acheevy.updateBoard(currentState);
      return { success: false, state: currentState };
    }

    currentState.status = 'approved';
    currentState.checkpoints.push(`REVIEW PASSED: score ${review.score}`);
    await acheevy.updateBoard(currentState);

    // 4. Package and Deliver
    currentState.status = 'packaged';
    await acheevy.updateBoard(currentState);

    const bundle = await packaging.package(manifest);
    
    currentState.status = 'delivered';
    currentState.checkpoints.push(`SUCCESS: Package delivered to ${bundle.retrieval_path}`);
    await acheevy.updateBoard(currentState);

    return { 
      success: true, 
      state: currentState,
      bundle 
    };
  },

  updateBoard: async (state: Partial<ActionBoardState>) => {
    // Push updates to Board_Monitor via WebSocket/Postgres
    console.log('ACHEEVY Board Update:', state.status, `Step: ${state.current_step}/${state.total_steps}`);
  }
};
