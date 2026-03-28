export type RuntimeConfig = {
  enableVoice: boolean;
  enableVision: boolean;
  defaultModel: string;
};

export const defaultRuntimeConfig: RuntimeConfig = {
  enableVoice: true,
  enableVision: true,
  defaultModel: "gpt-default"
};
