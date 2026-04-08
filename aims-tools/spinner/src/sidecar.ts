/**
 * Sidecar interface
 * =================
 * The integration point between any chat surface (Deploy, AIMS,
 * CTI Hub, Per|Form, SmelterOS) and the Spinner brain.
 *
 * Usage from a chat surface:
 *   const sidecar = createSidecar({ surface: 'deploy' });
 *   const action = await sidecar.onUserMessage({ userId, message });
 *   // chat UI handles the action: chat / transition / handoff
 */

import { classify } from './intent-classifier.js';
import { startJob, getJob, cancelJob } from './background-worker.js';
import type {
  ChatSurface,
  SpinnerSidecar,
  SpinnerAction,
  SpinnerJob,
  IntentClassification,
} from './types.js';

export interface SidecarOptions {
  surface: ChatSurface;
  /** If true, runs the LLM verification pass after the heuristic. */
  llmVerify?: boolean;
}

export function createSidecar(opts: SidecarOptions): SpinnerSidecar {
  return {
    surface: opts.surface,

    async onUserMessage(input: { userId: string; message: string }): Promise<SpinnerAction> {
      const classification: IntentClassification = await classify(input.message, {
        llmVerify: opts.llmVerify,
      });

      // For build-intent / larger-project / handoff, spawn a job so we
      // have something to track + stream from. For pure chat, no job.
      const action = classification.recommendedAction;
      if (action.type !== 'continue-chat') {
        startJob({
          surface: opts.surface,
          userId: input.userId,
          userMessage: input.message,
          classification,
        });
      }

      return action;
    },

    async startJob(input): Promise<SpinnerJob> {
      return startJob({
        surface: opts.surface,
        userId: input.userId,
        userMessage: input.message,
        classification: input.classification,
      });
    },

    getJob(jobId: string): SpinnerJob | undefined {
      return getJob(jobId);
    },

    async cancelJob(jobId: string): Promise<void> {
      return cancelJob(jobId);
    },
  };
}
