export const AI_MODELS = [
  { id: "auto", label: "Auto", provider: null },
  { id: "claude-fable-5-1", label: "Claude Fable 5.1", provider: "anthropic" },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", provider: "anthropic" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", provider: "anthropic" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", provider: "anthropic" },
  { id: "gpt-6-astra", label: "GPT-6 Astra", provider: "openai" },
  { id: "gpt-6.1-sol", label: "GPT-6.1 Sol", provider: "openai" },
  { id: "gpt-6-luna", label: "GPT-6 Luna", provider: "openai" },
  { id: "gemini-3.1-pro", label: "Gemini 3.1 Pro", provider: "google" },
] as const;

export type ModelId = (typeof AI_MODELS)[number]["id"];
export type ModelProvider = Exclude<(typeof AI_MODELS)[number]["provider"], null>;

export const MODEL_PROVIDERS: { id: ModelProvider; label: string }[] = [
  { id: "google", label: "Google Gemini" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic Claude" },
];

export const MODEL_KEY_COLUMNS: Record<ModelProvider, "encrypted_google_key" | "encrypted_openai_key" | "encrypted_anthropic_key"> = {
  google: "encrypted_google_key",
  openai: "encrypted_openai_key",
  anthropic: "encrypted_anthropic_key",
};

export function isModelId(value: unknown): value is ModelId {
  return typeof value === "string" && AI_MODELS.some((model) => model.id === value);
}

export function getModelOption(value: unknown) {
  return AI_MODELS.find((model) => model.id === value);
}
