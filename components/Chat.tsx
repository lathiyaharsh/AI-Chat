/**
 * Main chat UI (client component).
 *
 * Flow:
 * 1. User types a message or clicks a suggestion
 * 2. Frontend sends POST /api/chat with full message history
 * 3. API streams tokens back (SSE)
 * 4. UI updates the assistant bubble while streaming
 * 5. Chat history is saved to localStorage
 */
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AIProvider, ChatMessage } from "@/lib/ai/types";
import { getProviderLabel } from "@/lib/ai/types";
import {
  clearStoredChat,
  loadStoredChat,
  saveStoredChat,
} from "@/lib/chat-storage";
import { readChatStream } from "@/lib/sse-client";

const ASSISTANT_AVATAR = "/assistant-avatar.svg";

/** Small avatar shown next to assistant messages. */
function AssistantAvatar({ size = 32 }: { size?: number }) {
  return (
    <Image
      src={ASSISTANT_AVATAR}
      alt="Assistant"
      width={size}
      height={size}
      className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
    />
  );
}

/** Animated dots shown before the first stream chunk arrives. */
function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar />
      <div
        className="flex items-center gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-assistant-bubble)] px-4 py-3"
        aria-label="Assistant is typing"
      >
        <span className="typing-dot h-2 w-2 rounded-full bg-[var(--color-text-muted)]" />
        <span className="typing-dot h-2 w-2 rounded-full bg-[var(--color-text-muted)]" />
        <span className="typing-dot h-2 w-2 rounded-full bg-[var(--color-text-muted)]" />
      </div>
    </div>
  );
}

/** Copies assistant message text to the clipboard. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable in some browsers.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy message"
      className="rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text)]"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function MessageContent({
  content,
  isUser,
  isStreaming,
}: {
  content: string;
  isUser: boolean;
  isStreaming?: boolean;
}) {
  if (isUser) {
    return <p className="m-0 whitespace-pre-wrap break-words">{content}</p>;
  }

  // While streaming, render plain text for smooth updates.
  // After streaming finishes, render markdown formatting.
  if (isStreaming) {
    return (
      <p className="m-0 whitespace-pre-wrap break-words">
        {content}
        <span className="stream-cursor" aria-hidden="true" />
      </p>
    );
  }

  return (
    <div className="chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

/** Renders one chat bubble (user or assistant). */
function MessageBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-end gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && <AssistantAvatar />}
      <div className="flex max-w-[85%] flex-col gap-1 sm:max-w-[75%]">
        <div
          className={`rounded-[var(--radius-lg)] px-4 py-3 text-[15px] leading-relaxed break-words ${
            isUser
              ? "bg-[var(--color-user-bubble)] text-white"
              : "bg-[var(--color-assistant-bubble)] text-[var(--color-text)] border border-[var(--color-border)]"
          }`}
        >
          <MessageContent
            content={message.content}
            isUser={isUser}
            isStreaming={isStreaming}
          />
        </div>
        {!isUser && message.content && !isStreaming && (
          <div className="flex justify-start pl-1">
            <CopyButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Welcome screen with quick-start suggestion chips. */
function EmptyState({
  allowProviderSwitch,
  onSuggestion,
  disabled,
}: {
  allowProviderSwitch: boolean;
  onSuggestion: (text: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <AssistantAvatar size={56} />
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">
          Start a conversation
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {allowProviderSwitch
            ? "Choose an AI provider above and ask anything."
            : "Ask anything. Providers are selected automatically with fallback."}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {[
          "Explain quantum computing simply",
          "Write a haiku about coding",
          "What can you help me with?",
        ].map((suggestion) => (
          <SuggestionChip
            key={suggestion}
            text={suggestion}
            disabled={disabled}
            onClick={() => onSuggestion(suggestion)}
          />
        ))}
      </div>
    </div>
  );
}

function SuggestionChip({
  text,
  onClick,
  disabled,
}: {
  text: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {text}
    </button>
  );
}

/** Header dropdown to pick Groq / Gemini / Hugging Face (when enabled). */
function ProviderSelect({
  providers,
  value,
  onChange,
  disabled,
}: {
  providers: AIProvider[];
  value: AIProvider;
  onChange: (provider: AIProvider) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as AIProvider)}
      disabled={disabled}
      aria-label="AI provider"
      className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-sm text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] focus:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {providers.map((provider) => (
        <option key={provider} value={provider}>
          {getProviderLabel(provider)}
        </option>
      ))}
    </select>
  );
}

/** Toggles shorter vs longer assistant replies (sent to the API). */
function ReplyModeToggle({
  concise,
  onChange,
  disabled,
}: {
  concise: boolean;
  onChange: (concise: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1"
      role="group"
      aria-label="Reply mode"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={`rounded-[var(--radius-full)] px-3 py-1 text-xs transition-colors disabled:opacity-50 ${
          !concise
            ? "bg-[var(--color-primary)] text-white"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        }`}
      >
        Detailed
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={`rounded-[var(--radius-full)] px-3 py-1 text-xs transition-colors disabled:opacity-50 ${
          concise
            ? "bg-[var(--color-primary)] text-white"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        }`}
      >
        Concise
      </button>
    </div>
  );
}

type ChatProps = {
  allowProviderSwitch: boolean; // from env: ALLOW_AI_PROVIDER_SWITCH
  defaultProvider: AIProvider; // from env: DEFAULT_AI_PROVIDER
  providers: AIProvider[]; // list of configured providers
};

export default function Chat({
  allowProviderSwitch,
  defaultProvider,
  providers,
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false); // waiting for API response
  const [isStreaming, setIsStreaming] = useState(false); // tokens still arriving
  const [error, setError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<AIProvider | null>(null); // who answered last
  const [selectedProvider, setSelectedProvider] =
    useState<AIProvider>(defaultProvider);
  const [conciseMode, setConciseMode] = useState(false);
  const [hydrated, setHydrated] = useState(false); // localStorage loaded
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingStreamRef = useRef(""); // buffer for incoming stream chunks
  const flushStreamRef = useRef<number | null>(null); // requestAnimationFrame id

  // Load saved chat from localStorage after the component mounts in the browser.
  useEffect(() => {
    const stored = loadStoredChat();
    if (stored) {
      setMessages(stored.messages);
      setSelectedProvider(stored.selectedProvider ?? defaultProvider);
      setConciseMode(stored.conciseMode ?? false);
      setActiveProvider(stored.activeProvider ?? null);
    }
    setHydrated(true);
  }, [defaultProvider]);

  // Save chat to localStorage, but not on every streaming token.
  useEffect(() => {
    if (!hydrated || isStreaming) return;

    saveStoredChat({
      messages,
      selectedProvider,
      conciseMode,
      activeProvider,
    });
  }, [messages, selectedProvider, conciseMode, activeProvider, hydrated, isStreaming]);

  // Keep the latest message visible while chatting.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: isStreaming ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, isLoading, isStreaming]);

  // Apply buffered stream text to React state in animation frames (smoother UI).
  const flushStreamBuffer = () => {
    const chunk = pendingStreamRef.current;
    if (!chunk) return;

    pendingStreamRef.current = "";
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant") {
        next[next.length - 1] = {
          ...last,
          content: last.content + chunk,
        };
      }
      return next;
    });
  };

  // Collect incoming chunks and flush them at most once per animation frame.
  const appendStreamChunk = (chunk: string) => {
    pendingStreamRef.current += chunk;

    if (flushStreamRef.current !== null) return;

    flushStreamRef.current = window.requestAnimationFrame(() => {
      flushStreamRef.current = null;
      flushStreamBuffer();
    });
  };

  /** Send a user message to the backend and stream the assistant reply. */
  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setError(null);
    setIsLoading(true);
    setIsStreaming(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          stream: true,
          concise: conciseMode,
          ...(allowProviderSwitch ? { provider: selectedProvider } : {}),
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("text/event-stream")) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Something went wrong");
        }
      }

      // Create an empty assistant message first, then fill it as chunks arrive.
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      setIsStreaming(true);

      let streamError: string | null = null;

      // Read SSE events from the response body.
      for await (const event of readChatStream(response)) {
        if (event.type === "meta") {
          setActiveProvider(event.provider);
        }

        if (event.type === "chunk") {
          appendStreamChunk(event.content);
        }

        if (event.type === "done") {
          setActiveProvider(event.provider);
        }

        if (event.type === "error") {
          streamError = event.error;
        }
      }

      if (flushStreamRef.current !== null) {
        window.cancelAnimationFrame(flushStreamRef.current);
        flushStreamRef.current = null;
      }
      flushStreamBuffer();

      if (streamError) {
        // Remove empty assistant bubble if the stream failed.
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && !last.content) {
            return next.slice(0, -1);
          }
          return next;
        });
        throw new Error(streamError);
      }

      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant" && !last.content.trim()) {
          return next.slice(0, -1);
        }
        return next;
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to get a response";
      setError(message);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
    setActiveProvider(null);
    clearStoredChat();
    inputRef.current?.focus();
  };

  // Avoid hydration mismatch: wait until localStorage is read before rendering chat.
  if (!hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[var(--color-bg)] text-sm text-[var(--color-text-muted)]">
        Loading chat...
      </div>
    );
  }

  // Show dots only before streaming starts (not while tokens are flowing).
  const showTypingIndicator =
    isLoading && !isStreaming && messages[messages.length - 1]?.role !== "assistant";

  return (
    <div className="flex h-dvh flex-col bg-[var(--color-bg)]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <AssistantAvatar size={36} />
          <div>
            <h1 className="text-base font-semibold text-[var(--color-text)]">
              AI Chat
            </h1>
            {activeProvider && (
              <p className="text-xs text-[var(--color-success)]">
                via {getProviderLabel(activeProvider)}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <ReplyModeToggle
            concise={conciseMode}
            onChange={setConciseMode}
            disabled={isLoading}
          />
          {allowProviderSwitch && (
            <ProviderSelect
              providers={providers}
              value={selectedProvider}
              onChange={setSelectedProvider}
              disabled={isLoading}
            />
          )}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text)]"
            >
              Clear chat
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        {messages.length === 0 && !isLoading ? (
          <EmptyState
            allowProviderSwitch={allowProviderSwitch}
            onSuggestion={sendMessage}
            disabled={isLoading}
          />
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  message={msg}
                  isStreaming={
                    isStreaming &&
                    i === messages.length - 1 &&
                    msg.role === "assistant"
                  }
                />
              ))}
              {showTypingIndicator && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mx-4 mb-2 rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-4 py-3 text-sm text-[var(--color-error)] sm:mx-6"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 sm:px-6"
        >
          <div className="mx-auto flex max-w-3xl items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              disabled={isLoading}
              aria-label="Message input"
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] transition-colors focus:border-[var(--color-primary)] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-[var(--color-text-muted)]">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </main>
    </div>
  );
}
