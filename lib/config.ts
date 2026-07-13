/**
 * Reads app configuration from environment variables.
 * Used by the server (API route + providers + page.tsx).
 */
import { AI_PROVIDERS, type AIProvider } from "@/lib/ai/types";

/** Default models used when GROQ_MODEL / GEMINI_MODEL / HUGGINGFACE_MODEL are missing. */
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

/** Feature flag: show provider dropdown in the UI when true. */
export function isProviderSwitchAllowed(): boolean {
  return parseBooleanFlag(process.env.ALLOW_AI_PROVIDER_SWITCH);
}

/** First provider used when the user does not manually select one. */
export function getDefaultProvider(): AIProvider {
  return parseDefaultProvider();
}

/** Read model name from env, e.g. GROQ_MODEL, GEMINI_MODEL, HUGGINGFACE_MODEL. */
export function getProviderModel(provider: AIProvider): string {
  const envKey = `${provider.toUpperCase()}_MODEL` as
    | "GROQ_MODEL"
    | "GEMINI_MODEL"
    | "HUGGINGFACE_MODEL";

  const fromEnv = process.env[envKey]?.replace(/['"]/g, "").trim();
  return fromEnv || DEFAULT_MODELS[provider];
}

/** Config passed from the server page into the client Chat component. */
export function getChatConfig() {
  return {
    allowProviderSwitch: isProviderSwitchAllowed(),
    defaultProvider: getDefaultProvider(),
    providers: AI_PROVIDERS,
  };
}
