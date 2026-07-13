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
import { createChatStream, generateChatResponse } from "@/lib/ai/providers";
import { AI_PROVIDERS, type AIProvider, type ChatMessage } from "@/lib/ai/types";
import { isProviderSwitchAllowed } from "@/lib/config";

/** Validate incoming request before calling any AI provider. */
function validateRequest(
  messages: ChatMessage[],
  requestedProvider?: AIProvider
): string | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "Messages array is required";
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user" || !lastMessage.content?.trim()) {
    return "Last message must be a non-empty user message";
  }

  if (requestedProvider) {
    if (!isProviderSwitchAllowed()) {
      return "AI provider switching is disabled";
    }

    if (!AI_PROVIDERS.includes(requestedProvider)) {
      return "Invalid AI provider";
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages;
    const requestedProvider = body.provider as AIProvider | undefined;
    const concise = body.concise === true; // UI toggle: short vs detailed answers
    const stream = body.stream !== false; // streaming is enabled by default

    const validationError = validateRequest(messages, requestedProvider);
    if (validationError) {
      const status =
        validationError === "AI provider switching is disabled" ? 403 : 400;

      // Return validation errors in the same format the client expects.
      if (stream) {
        const encoder = new TextEncoder();
        const errorStream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", error: validationError })}\n\n`
              )
            );
            controller.close();
          },
        });

        return new Response(errorStream, {
          status,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      return Response.json({ error: validationError }, { status });
    }

    // Main path: stream tokens back to the browser as Server-Sent Events (SSE).
    if (stream) {
      const readableStream = createChatStream(
        messages,
        requestedProvider,
        concise
      );

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Fallback path: wait for the full response, then return JSON.
    const result = await generateChatResponse(
      messages,
      requestedProvider,
      concise
    );

    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate response";

    return Response.json({ error: message }, { status: 500 });
  }
}
