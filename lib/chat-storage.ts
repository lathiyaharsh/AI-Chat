/**
 * Saves chat state in the browser so history survives page refresh.
 * This runs only on the client (localStorage is not available on the server).
 */
import type { AIProvider, ChatMessage } from "@/lib/ai/types";

const STORAGE_KEY = "ai-chat-storage";

export type StoredChat = {
  messages: ChatMessage[];
  selectedProvider: AIProvider;
  conciseMode: boolean;
  activeProvider: AIProvider | null;
};

/** Load previous chat from localStorage. */
export function loadStoredChat(): StoredChat | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredChat;
    if (!Array.isArray(parsed.messages)) return null;

    return parsed;
  } catch {
    return null;
  }
}

/** Save current chat to localStorage. */
export function saveStoredChat(data: StoredChat): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota or serialization errors.
  }
}

/** Remove saved chat from localStorage. */
export function clearStoredChat(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
