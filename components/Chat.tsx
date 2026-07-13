"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AIProvider, ChatMessage } from "@/lib/ai/types";
import { getProviderLabel } from "@/lib/ai/types";

const ASSISTANT_AVATAR = "/assistant-avatar.svg";

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

function MessageContent({
  content,
  isUser,
}: {
  content: string;
  isUser: boolean;
}) {
  if (isUser) {
    return <p className="m-0 whitespace-pre-wrap break-words">{content}</p>;
  }

  return (
    <div className="chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-end gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && <AssistantAvatar />}
      <div
        className={`max-w-[85%] rounded-[var(--radius-lg)] px-4 py-3 text-[15px] leading-relaxed break-words sm:max-w-[75%] ${
          isUser
            ? "bg-[var(--color-user-bubble)] text-white"
            : "bg-[var(--color-assistant-bubble)] text-[var(--color-text)] border border-[var(--color-border)]"
        }`}
      >
        <MessageContent content={message.content} isUser={isUser} />
      </div>
    </div>
  );
}

function EmptyState({ allowProviderSwitch }: { allowProviderSwitch: boolean }) {
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
          <SuggestionChip key={suggestion} text={suggestion} />
        ))}
      </div>
    </div>
  );
}

function SuggestionChip({ text }: { text: string }) {
  return (
    <button
      type="button"
      data-suggestion={text}
      className="rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-text)]"
    >
      {text}
    </button>
  );
}

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

type ChatProps = {
  allowProviderSwitch: boolean;
  defaultProvider: AIProvider;
  providers: AIProvider[];
};

export default function Chat({
  allowProviderSwitch,
  defaultProvider,
  providers,
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<AIProvider | null>(null);
  const [selectedProvider, setSelectedProvider] =
    useState<AIProvider>(defaultProvider);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleSuggestionClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const suggestion = target.closest("[data-suggestion]")?.getAttribute(
        "data-suggestion"
      );
      if (suggestion) {
        setInput(suggestion);
        inputRef.current?.focus();
      }
    };

    container.addEventListener("click", handleSuggestionClick);
    return () => container.removeEventListener("click", handleSuggestionClick);
  }, []);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          ...(allowProviderSwitch ? { provider: selectedProvider } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setActiveProvider(data.provider);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to get a response";
      setError(message);
    } finally {
      setIsLoading(false);
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
    inputRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="flex h-dvh flex-col bg-[var(--color-bg)]"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:px-6">
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
        <div className="flex items-center gap-3">
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
          <EmptyState allowProviderSwitch={allowProviderSwitch} />
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
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
