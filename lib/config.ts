import { AI_PROVIDERS, type AIProvider } from "@/lib/ai/types";

const DEFAULT_MODELS: Record<AIProvider, string> = {
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-flash-lite-latest",
  huggingface: "meta-llama/Llama-3.1-8B-Instruct",
};

function parseBooleanFlag(value: string | undefined): boolean {
  return value?.toLowerCase() === "true";
}

function parseDefaultProvider(): AIProvider {
  const raw = process.env.DEFAULT_AI_PROVIDER?.replace(/['"]/g, "").trim();
  if (raw && AI_PROVIDERS.includes(raw as AIProvider)) {
    return raw as AIProvider;
  }
  return "groq";
}

export function isProviderSwitchAllowed(): boolean {
  return parseBooleanFlag(process.env.ALLOW_AI_PROVIDER_SWITCH);
}

export function getDefaultProvider(): AIProvider {
  return parseDefaultProvider();
}

export function getProviderModel(provider: AIProvider): string {
  const envKey = `${provider.toUpperCase()}_MODEL` as
    | "GROQ_MODEL"
    | "GEMINI_MODEL"
    | "HUGGINGFACE_MODEL";

  const fromEnv = process.env[envKey]?.replace(/['"]/g, "").trim();
  return fromEnv || DEFAULT_MODELS[provider];
}

export function getChatConfig() {
  return {
    allowProviderSwitch: isProviderSwitchAllowed(),
    defaultProvider: getDefaultProvider(),
    providers: AI_PROVIDERS,
  };
}
