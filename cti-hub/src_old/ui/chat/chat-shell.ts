export type ChatShellState = {
  headerLabel: "Chat w/ACHEEVY";
  selectedModel: string;
  selectedVoice: string;
  selectedDataSources: string[];
  hasAttachment: boolean;
};

export function createChatShellState(): ChatShellState {
  return {
    headerLabel: "Chat w/ACHEEVY",
    selectedModel: "gpt-default",
    selectedVoice: "alloy",
    selectedDataSources: [],
    hasAttachment: false
  };
}

export function toggleDataSource(state: ChatShellState, sourceId: string): ChatShellState {
  const exists = state.selectedDataSources.includes(sourceId);
  return {
    ...state,
    selectedDataSources: exists
      ? state.selectedDataSources.filter((id) => id !== sourceId)
      : [...state.selectedDataSources, sourceId]
  };
}
