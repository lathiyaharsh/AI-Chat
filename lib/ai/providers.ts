/**
 * AI provider layer.
 *
 * Responsibilities:
 * 1. Call Groq / Gemini / Hugging Face APIs
 * 2. Convert chat messages into each provider's required format
 * 3. Stream responses back to the API route as SSE events
 * 4. Fall back to the next provider if one fails
 */
import type { ChatMessage, AIProvider } from "./types";
import { AI_PROVIDERS, getProviderLabel } from "./types";
import { getDefaultProvider, getProviderModel } from "@/lib/config";
import { encodeSSE } from "@/lib/sse";
import {
  buildSystemPrompt,
  toGeminiContents,
  toOpenAIMessages,
} from "./prompts";

/** Custom error type so we can show friendly messages in the UI. */
class ProviderError extends Error {
  provider: AIProvider;
  status?: number;

  constructor(
    provider: AIProvider,
    status: number | undefined,
    message: string
  ) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.status = status;
  }
}

type ProviderStream = {
  format: "openai" | "gemini";
  body: ReadableStream<Uint8Array>;
};

/** Convert HTTP status codes into short user-friendly messages. */
function friendlyMessage(provider: AIProvider, status?: number): string {
  const label = getProviderLabel(provider);
  switch (status) {
    case 401:
    case 403:
      return provider === "huggingface"
        ? `${label} rejected the request (check API key has "Make calls to Inference Providers" permission).`
        : `${label} rejected the request (check the API key).`;
    case 429:
      return `${label} is rate-limited or out of quota.`;
    case 500:
    case 502:
    case 503:
    case 504:
      return `${label} is temporarily unavailable.`;
    default:
      return `${label} request failed${status ? ` (${status})` : ""}.`;
  }
}

/**
 * Decide which providers to try, and in what order.
 * Example: selected gemini -> gemini, groq, huggingface
 */
function getProviderOrder(selectedProvider?: AIProvider): AIProvider[] {
  const primary = selectedProvider ?? getDefaultProvider();
  const others = AI_PROVIDERS.filter((provider) => provider !== primary);
  return [primary, ...others];
}

/** Read API keys from server env. Never expose these to the browser. */
function getApiKey(provider: AIProvider): string | undefined {
  switch (provider) {
    case "groq":
      return process.env.GROQ_API_KEY;
    case "gemini":
      return process.env.GEMINI_API_KEY;
    case "huggingface":
      return process.env.HUGGINGFACE_API_KEY;
  }
}

async function* parseOpenAIStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload);
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Skip malformed chunks.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Parse Gemini SSE streaming chunks. */
async function* parseGeminiStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload);
          const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) yield content;
        } catch {
          // Skip malformed chunks.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function* parseProviderStream(
  providerStream: ProviderStream,
  signal?: AbortSignal
): AsyncGenerator<string> {
  if (providerStream.format === "openai") {
    yield* parseOpenAIStream(providerStream.body, signal);
    return;
  }

  yield* parseGeminiStream(providerStream.body, signal);
}

async function startGroqStream(
  messages: ChatMessage[],
  apiKey: string,
  concise: boolean,
  signal?: AbortSignal
): Promise<ProviderStream> {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify({
        model: getProviderModel("groq"),
        messages: toOpenAIMessages(messages, concise),
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(`Groq API error (${response.status}):`, body);
    throw new ProviderError(
      "groq",
      response.status,
      friendlyMessage("groq", response.status)
    );
  }

  if (!response.body) {
    throw new ProviderError("groq", undefined, "Groq returned an empty stream.");
  }

  return { format: "openai", body: response.body };
}

async function startGeminiStream(
  messages: ChatMessage[],
  apiKey: string,
  concise: boolean,
  signal?: AbortSignal
): Promise<ProviderStream> {
  const model = getProviderModel("gemini");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt(concise) }],
        },
        contents: toGeminiContents(messages),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(`Gemini API error (${response.status}):`, body);
    throw new ProviderError(
      "gemini",
      response.status,
      friendlyMessage("gemini", response.status)
    );
  }

  if (!response.body) {
    throw new ProviderError("gemini", undefined, "Gemini returned an empty stream.");
  }

  return { format: "gemini", body: response.body };
}

async function startHuggingFaceStream(
  messages: ChatMessage[],
  apiKey: string,
  concise: boolean,
  signal?: AbortSignal
): Promise<ProviderStream> {
  const response = await fetch(
    "https://router.huggingface.co/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify({
        model: getProviderModel("huggingface"),
        messages: toOpenAIMessages(messages, concise),
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(`HuggingFace API error (${response.status}):`, body);
    throw new ProviderError(
      "huggingface",
      response.status,
      friendlyMessage("huggingface", response.status)
    );
  }

  if (!response.body) {
    throw new ProviderError(
      "huggingface",
      undefined,
      "Hugging Face returned an empty stream."
    );
  }

  return { format: "openai", body: response.body };
}

async function startProviderStream(
  provider: AIProvider,
  messages: ChatMessage[],
  concise: boolean,
  signal?: AbortSignal
): Promise<ProviderStream> {
  const apiKey = getApiKey(provider);

  if (!apiKey) {
    throw new ProviderError(
      provider,
      undefined,
      `${getProviderLabel(provider)} API key is not configured.`
    );
  }

  switch (provider) {
    case "groq":
      return startGroqStream(messages, apiKey, concise, signal);
    case "gemini":
      return startGeminiStream(messages, apiKey, concise, signal);
    case "huggingface":
      return startHuggingFaceStream(messages, apiKey, concise, signal);
  }
}

/**
 * Main streaming function used by /api/chat.
 * Tries providers in order and forwards chunks to the browser.
 */
export function createChatStream(
  messages: ChatMessage[],
  selectedProvider?: AIProvider,
  concise = false,
  signal?: AbortSignal
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const providersToTry = getProviderOrder(selectedProvider);
      const errors: string[] = [];

      for (const provider of providersToTry) {
        if (signal?.aborted) {
          controller.close();
          return;
        }

        try {
          const upstream = await startProviderStream(
            provider,
            messages,
            concise,
            signal
          );

          if (signal?.aborted) {
            controller.close();
            return;
          }

          controller.enqueue(
            encoder.encode(encodeSSE({ type: "meta", provider }))
          );

          for await (const chunk of parseProviderStream(upstream, signal)) {
            if (signal?.aborted) {
              controller.close();
              return;
            }

            controller.enqueue(
              encoder.encode(encodeSSE({ type: "chunk", content: chunk }))
            );
          }

          if (signal?.aborted) {
            controller.close();
            return;
          }

          controller.enqueue(
            encoder.encode(encodeSSE({ type: "done", provider }))
          );
          controller.close();
          return;
        } catch (error) {
          if (signal?.aborted) {
            controller.close();
            return;
          }

          const msg =
            error instanceof Error ? error.message : "Unknown provider error";
          errors.push(msg);
        }
      }

      if (signal?.aborted) {
        controller.close();
        return;
      }

      controller.enqueue(
        encoder.encode(
          encodeSSE({
            type: "error",
            error: `Couldn't get a response. ${errors.join(" ")}`.trim(),
          })
        )
      );
      controller.close();
    },
  });
}

// Non-streaming fallback for direct API use.
async function callGroq(
  messages: ChatMessage[],
  apiKey: string,
  concise: boolean
): Promise<string> {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getProviderModel("groq"),
        messages: toOpenAIMessages(messages, concise),
        temperature: 0.7,
        max_tokens: 1024,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(`Groq API error (${response.status}):`, body);
    throw new ProviderError(
      "groq",
      response.status,
      friendlyMessage("groq", response.status)
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new ProviderError("groq", undefined, "Groq returned an empty response.");
  }

  return content;
}

async function callGemini(
  messages: ChatMessage[],
  apiKey: string,
  concise: boolean
): Promise<string> {
  const model = getProviderModel("gemini");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt(concise) }],
        },
        contents: toGeminiContents(messages),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(`Gemini API error (${response.status}):`, body);
    throw new ProviderError(
      "gemini",
      response.status,
      friendlyMessage("gemini", response.status)
    );
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new ProviderError(
      "gemini",
      undefined,
      "Gemini returned an empty response."
    );
  }

  return content;
}

async function callHuggingFace(
  messages: ChatMessage[],
  apiKey: string,
  concise: boolean
): Promise<string> {
  const response = await fetch(
    "https://router.huggingface.co/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getProviderModel("huggingface"),
        messages: toOpenAIMessages(messages, concise),
        temperature: 0.7,
        max_tokens: 1024,
        stream: false,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(`HuggingFace API error (${response.status}):`, body);
    throw new ProviderError(
      "huggingface",
      response.status,
      friendlyMessage("huggingface", response.status)
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new ProviderError(
      "huggingface",
      undefined,
      "Hugging Face returned an empty response."
    );
  }

  return content;
}

async function callProvider(
  provider: AIProvider,
  messages: ChatMessage[],
  concise: boolean
): Promise<string> {
  const apiKey = getApiKey(provider);

  if (!apiKey) {
    throw new ProviderError(
      provider,
      undefined,
      `${getProviderLabel(provider)} API key is not configured.`
    );
  }

  switch (provider) {
    case "groq":
      return callGroq(messages, apiKey, concise);
    case "gemini":
      return callGemini(messages, apiKey, concise);
    case "huggingface":
      return callHuggingFace(messages, apiKey, concise);
  }
}

/**
 * Non-streaming fallback.
 * Useful for testing or when stream: false is sent to the API.
 */
export async function generateChatResponse(
  messages: ChatMessage[],
  selectedProvider?: AIProvider,
  concise = false
): Promise<{ message: string; provider: AIProvider }> {
  const providersToTry = getProviderOrder(selectedProvider);
  const errors: string[] = [];

  for (const provider of providersToTry) {
    try {
      const message = await callProvider(provider, messages, concise);
      return { message, provider };
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unknown provider error";
      errors.push(msg);
    }
  }

  throw new Error(`Couldn't get a response. ${errors.join(" ")}`.trim());
}
