import type { ChatShellState } from "./chat-shell";

export function renderChatShellScaffold(state: ChatShellState): string {
  return [
    `${state.headerLabel} [Model: ${state.selectedModel}]`,
    `[+ Attach] [Voice: ${state.selectedVoice}] [Data Sources] [Build Source] [Send]`,
    `Selected Sources: ${state.selectedDataSources.join(", ") || "none"}`
  ].join("\n");
}
