import {
  AI_PROVIDERS,
  type AIProvider,
  type ChatMessage,
} from "@/lib/ai/types";

export const MAX_MESSAGES = 50;
export const MAX_MESSAGE_LENGTH = 8000;

export type ValidatedChatRequest = {
  messages: ChatMessage[];
  provider?: AIProvider;
  concise: boolean;
  stream: boolean;
};

export type ChatValidationResult =
  | { ok: true; data: ValidatedChatRequest }
  | { ok: false; error: string; status: number };

/** Parse the stream flag — defaults to true unless explicitly false. */
export function parseStreamFlag(value: unknown): boolean {
  if (value === false || value === "false") return false;
  return true;
}

/** Parse the concise reply flag. */
export function parseConciseFlag(value: unknown): boolean {
  return value === true || value === "true";
}

function isValidMessage(message: unknown): message is ChatMessage {
  if (typeof message !== "object" || message === null) return false;

  const candidate = message as ChatMessage;
  return (
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string" &&
    candidate.content.length <= MAX_MESSAGE_LENGTH
  );
}

/** Validate the full messages array. */
export function validateMessages(messages: unknown): string | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "Messages array is required";
  }

  if (messages.length > MAX_MESSAGES) {
    return `Too many messages (max ${MAX_MESSAGES})`;
  }

  for (let i = 0; i < messages.length; i++) {
    if (!isValidMessage(messages[i])) {
      return `Invalid message at index ${i}`;
    }

    const expectedRole: ChatMessage["role"] =
      i % 2 === 0 ? "user" : "assistant";

    if (messages[i].role !== expectedRole) {
      return `Invalid message order at index ${i}`;
    }
  }

  const lastMessage = messages[messages.length - 1] as ChatMessage;
  if (lastMessage.role !== "user" || !lastMessage.content.trim()) {
    return "Last message must be a non-empty user message";
  }

  return null;
}

function parseRequestedProvider(value: unknown): {
  provider?: AIProvider;
  error?: string;
} {
  if (value === undefined || value === null) {
    return {};
  }

  if (
    typeof value !== "string" ||
    !AI_PROVIDERS.includes(value as AIProvider)
  ) {
    return { error: "Invalid AI provider" };
  }

  return { provider: value as AIProvider };
}

/** Validate and normalize a POST /api/chat request body. */
export function validateChatRequest(
  body: unknown,
  allowProviderSwitch: boolean
): ChatValidationResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request body", status: 400 };
  }

  const payload = body as Record<string, unknown>;
  const stream = parseStreamFlag(payload.stream);
  const concise = parseConciseFlag(payload.concise);

  const providerResult = parseRequestedProvider(payload.provider);
  if (providerResult.error) {
    return { ok: false, error: providerResult.error, status: 400 };
  }

  const messagesError = validateMessages(payload.messages);
  if (messagesError) {
    return { ok: false, error: messagesError, status: 400 };
  }

  if (providerResult.provider && !allowProviderSwitch) {
    return {
      ok: false,
      error: "AI provider switching is disabled",
      status: 403,
    };
  }

  return {
    ok: true,
    data: {
      messages: payload.messages as ChatMessage[],
      provider: providerResult.provider,
      concise,
      stream,
    },
  };
}
