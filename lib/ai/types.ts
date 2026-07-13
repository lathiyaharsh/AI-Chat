export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type AIProvider = "groq" | "gemini" | "huggingface";

export const AI_PROVIDERS: AIProvider[] = ["groq", "huggingface", "gemini"] as const;

export type ChatResponse = {
  message: string;
  provider: AIProvider;
};

export type ChatError = {
  error: string;
  provider?: AIProvider;
};

export function getProviderLabel(provider: AIProvider): string {
  switch (provider) {
    case "groq":
      return "Groq";
    case "gemini":
      return "Gemini";
    case "huggingface":
      return "Hugging Face";
  }
}
