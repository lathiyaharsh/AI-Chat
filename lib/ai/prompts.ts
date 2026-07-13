/**
 * Builds the system prompt sent to AI providers.
 *
 * The base prompt comes from SYSTEM_PROMPT in .env.
 * The concise/detailed toggle appends extra style instructions.
 */
import type { ChatMessage } from "./types";

const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful AI assistant. Answer clearly and accurately.";

/** Combine env prompt + concise/detailed style instructions. */
export function buildSystemPrompt(concise: boolean): string {
  const base =
    process.env.SYSTEM_PROMPT?.replace(/^['"]|['"]$/g, "").trim() ||
    DEFAULT_SYSTEM_PROMPT;

  const style = concise
    ? "Keep answers concise and to the point unless the user asks for more detail."
    : "Provide thorough, detailed answers when helpful.";

  return `${base}\n\n${style}`;
}

/**
 * Groq and Hugging Face use the OpenAI chat format.
 * We prepend a system message so the model knows how to behave.
 */
export function toOpenAIMessages(
  messages: ChatMessage[],
  concise: boolean
): Array<{ role: string; content: string }> {
  return [
    { role: "system", content: buildSystemPrompt(concise) },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

/**
 * Gemini uses different role names:
 * - user stays "user"
 * - assistant becomes "model"
 */
export function toGeminiContents(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}
