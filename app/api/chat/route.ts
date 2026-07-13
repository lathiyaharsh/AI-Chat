/**
 * API route: POST /api/chat
 *
 * This is the backend entry point for the chat app.
 * The browser sends messages here, and this route calls the AI providers.
 *
 * Supports:
 * - streaming responses (SSE) — default
 * - non-streaming JSON responses (when stream: false)
 * - optional provider selection
 * - concise vs detailed reply mode
 */
import { NextRequest } from "next/server";
import {
  parseStreamFlag,
  validateChatRequest,
} from "@/lib/api/chat-validation";
import { checkRateLimit, getClientIp } from "@/lib/api/rate-limit";
import { createChatStream, generateChatResponse } from "@/lib/ai/providers";
import { isProviderSwitchAllowed } from "@/lib/config";
import { createSseErrorResponse, SSE_HEADERS } from "@/lib/sse";

export const runtime = "nodejs";

const GENERIC_ERROR = "Failed to generate response";
const RATE_LIMIT_ERROR = "Too many requests. Please try again later.";

function errorResponse(
  error: string,
  status: number,
  stream: boolean
): Response {
  if (stream) {
    return createSseErrorResponse(error, status);
  }

  return Response.json({ error }, { status });
}

function getStreamFlagFromBody(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return true;
  return parseStreamFlag((body as Record<string, unknown>).stream);
}

export async function POST(request: NextRequest) {
  let stream = true;

  try {
    const body = await request.json();
    stream = getStreamFlagFromBody(body);

    const clientIp = getClientIp(request.headers);
    if (!checkRateLimit(clientIp)) {
      return errorResponse(RATE_LIMIT_ERROR, 429, stream);
    }

    const validation = validateChatRequest(body, isProviderSwitchAllowed());
    if (!validation.ok) {
      return errorResponse(validation.error, validation.status, stream);
    }

    const { messages, provider, concise, stream: useStream } = validation.data;
    stream = useStream;

    if (useStream) {
      const readableStream = createChatStream(
        messages,
        provider,
        concise,
        request.signal
      );

      return new Response(readableStream, { headers: SSE_HEADERS });
    }

    const result = await generateChatResponse(messages, provider, concise);
    return Response.json(result);
  } catch (error) {
    console.error("Chat API error:", error);
    return errorResponse(GENERIC_ERROR, 500, stream);
  }
}
