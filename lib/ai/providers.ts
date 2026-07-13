import type { ChatMessage, AIProvider } from "./types";
import { AI_PROVIDERS, getProviderLabel } from "./types";
import { getDefaultProvider, getProviderModel } from "@/lib/config";

class ProviderError extends Error {
  provider: AIProvider;
  status?: number;

  constructor(provider: AIProvider, status: number | undefined, message: string) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.status = status;
  }
}

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

function getProviderOrder(selectedProvider?: AIProvider): AIProvider[] {
  const primary = selectedProvider ?? getDefaultProvider();
  const others = AI_PROVIDERS.filter((provider) => provider !== primary);
  return [primary, ...others];
}

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

async function callGroq(
  messages: ChatMessage[],
  apiKey: string
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
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 1024,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(`Groq API error (${response.status}):`, body);
    throw new ProviderError("groq", response.status, friendlyMessage("groq", response.status));
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
  apiKey: string
): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const model = getProviderModel("gemini");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
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
    throw new ProviderError("gemini", response.status, friendlyMessage("gemini", response.status));
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new ProviderError("gemini", undefined, "Gemini returned an empty response.");
  }

  return content;
}

async function callHuggingFace(
  messages: ChatMessage[],
  apiKey: string
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
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
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
  messages: ChatMessage[]
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
      return callGroq(messages, apiKey);
    case "gemini":
      return callGemini(messages, apiKey);
    case "huggingface":
      return callHuggingFace(messages, apiKey);
  }
}

export async function generateChatResponse(
  messages: ChatMessage[],
  selectedProvider?: AIProvider
): Promise<{ message: string; provider: AIProvider }> {
  const providersToTry = getProviderOrder(selectedProvider);
  const errors: string[] = [];

  for (const provider of providersToTry) {
    try {
      const message = await callProvider(provider, messages);
      return { message, provider };
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unknown provider error";
      errors.push(msg);
    }
  }

  throw new Error(
    `Couldn't get a response. ${errors.join(" ")}`.trim()
  );
}
