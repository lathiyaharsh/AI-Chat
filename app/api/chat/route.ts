import { NextRequest, NextResponse } from "next/server";
import { generateChatResponse } from "@/lib/ai/providers";
import { AI_PROVIDERS, type AIProvider, type ChatMessage } from "@/lib/ai/types";
import { isProviderSwitchAllowed } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages;
    const requestedProvider = body.provider as AIProvider | undefined;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "user" || !lastMessage.content?.trim()) {
      return NextResponse.json(
        { error: "Last message must be a non-empty user message" },
        { status: 400 }
      );
    }

    if (requestedProvider) {
      if (!isProviderSwitchAllowed()) {
        return NextResponse.json(
          { error: "AI provider switching is disabled" },
          { status: 403 }
        );
      }

      if (!AI_PROVIDERS.includes(requestedProvider)) {
        return NextResponse.json(
          { error: "Invalid AI provider" },
          { status: 400 }
        );
      }
    }

    const result = await generateChatResponse(messages, requestedProvider);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate response";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
