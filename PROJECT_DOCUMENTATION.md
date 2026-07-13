# AI Chat Project Documentation

This document explains the full project: what it is, how it is structured, how the frontend and backend work, how AI providers are configured, and how to run, change, debug, and extend the app.

## Project Summary

This is a simple AI chat application built with **Next.js App Router**.

Next.js is used for both:

- **Frontend**: the chat page and UI components.
- **Backend**: the `/api/chat` API route that talks to external AI providers.

The app supports three AI providers:

- **Groq**
- **Gemini**
- **Hugging Face**

The app can either:

- automatically use a fallback chain, or
- allow the user to manually select a provider from the UI when the feature flag is enabled.

## Main Features

- Chat UI with message history.
- **Streaming responses** via Server-Sent Events (SSE) — tokens appear as they are generated.
- **localStorage persistence** — chat history, provider choice, and reply mode survive page refresh.
- **Concise / Detailed toggle** — controls how long assistant answers are.
- **Configurable system prompt** via `SYSTEM_PROMPT` in `.env.local`.
- Assistant avatar.
- Typing indicator (shown before the first stream chunk arrives).
- Empty state with clickable suggestion chips.
- Clear chat button (also clears localStorage).
- **Copy button** on completed assistant messages.
- **Regenerate** last assistant reply.
- **Stop generation** button — cancels in-flight streams (client + server).
- **Try again** button on failed requests.
- **Export chat** as Markdown (.md) or plain text (.txt).
- **Syntax highlighting** for code blocks in assistant markdown.
- Provider dropdown controlled by a feature flag.
- Markdown rendering for assistant responses (after streaming completes).
- Server-side API route for AI calls.
- Provider fallback support (works in both streaming and non-streaming modes).
- Environment-controlled provider models.
- Friendly error messages instead of raw provider JSON errors.
- **Rate limiting** on `/api/chat` (30 requests/minute per IP).
- **Request validation** with message count/length limits.
- Secrets stored in `.env.local`.
- **Prettier** code formatting and **Vitest** unit tests.

## Technology Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js |
| Router | App Router |
| Language | TypeScript |
| UI | React |
| Styling | Tailwind CSS v4 + CSS variables |
| Markdown | `react-markdown` + `remark-gfm` + `react-syntax-highlighter` |
| Testing | Vitest |
| Formatting | Prettier + ESLint |
| Backend | Next.js Route Handlers |
| AI Providers | Groq, Gemini, Hugging Face |

## Package Scripts

Defined in `package.json`:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run format
npm run format:check
npm run test
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Starts the development server with Turbopack. |
| `npm run build` | Builds the production app. |
| `npm run start` | Starts the production server after build. |
| `npm run lint` | Runs Next.js linting. |
| `npm run format` | Formats all files with Prettier. |
| `npm run format:check` | Checks formatting without writing (CI-friendly). |
| `npm run test` | Runs Vitest unit tests. |

## Important Dependencies

| Dependency | Purpose |
| --- | --- |
| `next` | Next.js framework. |
| `react` | React UI library. |
| `react-dom` | React DOM rendering. |
| `react-markdown` | Renders assistant markdown responses. |
| `remark-gfm` | Enables GitHub Flavored Markdown features like tables and task lists. |
| `react-syntax-highlighter` | Syntax highlighting for fenced code blocks. |
| `tailwindcss` | Utility styling framework. |
| `typescript` | Static typing. |
| `vitest` | Unit test runner (dev). |
| `prettier` | Code formatter (dev). |
| `eslint-config-prettier` | Disables ESLint rules that conflict with Prettier. |

## Directory Structure

Important source files:

```text
.
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Chat.tsx
│   └── MarkdownContent.tsx
├── lib/
│   ├── ai/
│   │   ├── providers.ts
│   │   ├── prompts.ts
│   │   └── types.ts
│   ├── api/
│   │   ├── chat-validation.ts
│   │   ├── chat-validation.test.ts
│   │   ├── rate-limit.ts
│   │   └── rate-limit.test.ts
│   ├── chat-storage.ts
│   ├── config.ts
│   ├── export-chat.ts
│   ├── sse.ts
│   ├── sse.test.ts
│   └── sse-client.ts
├── public/
│   └── assistant-avatar.svg
├── .env.example
├── .env.local
├── .prettierrc.json
├── .prettierignore
├── eslint.config.mjs
├── vitest.config.ts
├── package.json
├── README.md
└── PROJECT_DOCUMENTATION.md
```

Generated or dependency folders:

```text
.next/
node_modules/
```

These are generated and should not be edited manually.

## Environment Files

The project uses `.env.local` for real local secrets and `.env.example` for safe example values.

### `.env.local`

Use this file for real API keys and local configuration.

It should not be committed to git.

### `.env.example`

Use this file as a template for required environment variables.

It contains placeholders and safe default model names.

## Environment Variables

```env
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key

GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_MODEL=gemini-flash-lite-latest
HUGGINGFACE_MODEL=meta-llama/Llama-3.1-8B-Instruct

SYSTEM_PROMPT=You are a helpful AI assistant. Answer clearly and accurately.

DEFAULT_AI_PROVIDER=groq
ALLOW_AI_PROVIDER_SWITCH=false
```

| Variable | Purpose |
| --- | --- |
| `GROQ_API_KEY` | API key for Groq. |
| `GEMINI_API_KEY` | API key for Google Gemini. |
| `HUGGINGFACE_API_KEY` | API key/token for Hugging Face. |
| `GROQ_MODEL` | Groq model name. |
| `GEMINI_MODEL` | Gemini model name. |
| `HUGGINGFACE_MODEL` | Hugging Face model name. |
| `SYSTEM_PROMPT` | Base system prompt sent to all providers. Appends concise/detailed style instructions based on UI toggle. |
| `DEFAULT_AI_PROVIDER` | First provider used when no provider is manually selected. |
| `ALLOW_AI_PROVIDER_SWITCH` | Feature flag that controls whether users can choose the provider in the UI. |

## Default Models

If the model variables are missing, the app falls back to defaults in `lib/config.ts`.

| Provider | Default Model |
| --- | --- |
| Groq | `llama-3.3-70b-versatile` |
| Gemini | `gemini-flash-lite-latest` |
| Hugging Face | `meta-llama/Llama-3.1-8B-Instruct` |

## Provider Switch Feature Flag

The flag is:

```env
ALLOW_AI_PROVIDER_SWITCH=true
```

When set to `true`:

- the UI shows a provider dropdown,
- the user can select Groq, Gemini, or Hugging Face,
- the selected provider is tried first,
- if selected provider fails, the app falls back to the remaining providers.

When set to `false`:

- the UI hides the provider dropdown,
- the app starts from `DEFAULT_AI_PROVIDER`,
- fallback continues through the remaining providers.

## AI Provider Order

The available providers are defined in `lib/ai/types.ts`:

```ts
export const AI_PROVIDERS: AIProvider[] = ["groq", "huggingface", "gemini"] as const;
```

This order matters for fallback behavior after the primary provider.

Fallback order is computed in `lib/ai/providers.ts`:

1. Use selected provider if one is provided.
2. Otherwise use `DEFAULT_AI_PROVIDER`.
3. Try every other provider from `AI_PROVIDERS`.

Example:

```env
DEFAULT_AI_PROVIDER=groq
```

With no manual provider selected:

```text
groq -> huggingface -> gemini
```

If user selects `gemini`:

```text
gemini -> groq -> huggingface
```

## Application Flow

High-level request flow (streaming — default):

```text
User types message or clicks a suggestion
  -> Chat.tsx appends user message locally
  -> Chat.tsx sends POST /api/chat with stream: true and AbortSignal
  -> route.ts rate-limits, then validates via lib/api/chat-validation.ts
  -> createChatStream() picks provider order and tries each provider
  -> Provider API streams tokens back (cancellable via request.signal)
  -> Server re-wraps tokens as SSE events via lib/sse.ts (meta, chunk, done, error)
  -> lib/sse-client.ts parses SSE on the browser
  -> Chat.tsx appends chunks to the assistant bubble in real time
  -> After done, MarkdownContent renders markdown + syntax highlighting
  -> Chat history saved to localStorage
```

Non-streaming fallback (`stream: false`):

```text
User sends message
  -> route.ts calls generateChatResponse()
  -> Full response returned as JSON { message, provider }
```

## Frontend

Main frontend file:

```text
components/Chat.tsx
```

This file contains the complete chat UI.

### Main UI Pieces

| Component / Function | Purpose |
| --- | --- |
| `AssistantAvatar` | Renders the assistant bot image from `public/assistant-avatar.svg`. |
| `TypingIndicator` | Shows animated dots while waiting for the first stream chunk. |
| `CopyButton` | Copies assistant message text to the clipboard. |
| `MessageActionButton` | Reusable action button (used for Regenerate). |
| `MessageContent` | Renders user text, plain text while streaming, or markdown when complete. |
| `MessageBubble` | Renders a single user or assistant message bubble. |
| `EmptyState` | Shows initial empty chat screen and suggestion chips. |
| `SuggestionChip` | Clickable suggestion that calls `sendMessage()` directly. |
| `ExportMenu` | Header dropdown to download chat as `.md` or `.txt`. |
| `ProviderSelect` | Dropdown for manual provider selection. |
| `ReplyModeToggle` | Concise / Detailed toggle sent to the API as `concise: true/false`. |
| `Chat` | Main chat component with state, streaming, and localStorage. |
| `MarkdownContent` | Renders completed assistant markdown with syntax highlighting. |

### Frontend State

The chat component keeps these values in React state:

| State | Purpose |
| --- | --- |
| `messages` | Full chat history in the browser. |
| `input` | Current textarea value. |
| `isLoading` | Whether an API request is in progress. |
| `isStreaming` | Whether tokens are still arriving from the server. |
| `error` | User-friendly error message shown in the UI. |
| `activeProvider` | Provider that answered the latest message. |
| `selectedProvider` | Provider selected by the user when the flag is enabled. |
| `conciseMode` | Whether concise reply style is enabled. |
| `hydrated` | Whether localStorage has been loaded (avoids hydration mismatch). |
| `canRetry` | Whether the error banner should show a **Try again** button. |

### localStorage Persistence

Chat state is saved in the browser via `lib/chat-storage.ts`:

| Stored field | Purpose |
| --- | --- |
| `messages` | Full chat history |
| `selectedProvider` | User's provider choice |
| `conciseMode` | Concise / Detailed toggle state |
| `activeProvider` | Last provider that answered |

Storage key: `ai-chat-storage`

Behavior:

- Loaded once on mount (before rendering the chat UI).
- Saved after each completed message (not on every streaming token).
- Cleared when the user clicks **Clear chat**.

### Sending A Message

The `sendMessage()` function appends a user message and calls `executeChatRequest()`.

`executeChatRequest()` is the shared core used by send, retry, and regenerate:

1. creates an `AbortController` and passes `signal` to `fetch`,
2. sends `POST /api/chat` with `stream: true`,
3. creates an empty assistant message bubble,
4. reads SSE events via `readChatStream(response, signal)`,
5. on `meta` / `done` — updates the active provider label,
6. on `chunk` — appends text (batched with `requestAnimationFrame`),
7. on `error` — shows a friendly error and enables **Try again**,
8. after streaming — renders markdown (with syntax highlighting) and saves to localStorage.

### Stop, Retry, and Regenerate

| Action | Function | Behavior |
| --- | --- | --- |
| **Stop** | `stopGeneration()` | Aborts `fetch` via `AbortController`; server cancels provider streams via `request.signal`. Keeps partial response. |
| **Try again** | `handleRetry()` | Resends the last failed message history without adding a new user message. |
| **Regenerate** | `handleRegenerate()` | Removes the last assistant reply and resends the last user message. |

The send button becomes a **stop** (square) button while `isLoading` is true.

### API Call From Frontend

The frontend sends:

```ts
fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  signal: controller.signal,
  body: JSON.stringify({
    messages: updatedMessages,
    stream: true,
    concise: conciseMode,
    ...(allowProviderSwitch ? { provider: selectedProvider } : {}),
  }),
});
```

The `provider` field is only sent when provider switching is enabled.

### Export Chat

`lib/export-chat.ts` formats and downloads chat history:

| Format | Function |
| --- | --- |
| Plain text | `formatChatAsText()` → `chat-export-YYYY-MM-DD.txt` |
| Markdown | `formatChatAsMarkdown()` → `chat-export-YYYY-MM-DD.md` |

Triggered from the **Export** dropdown in the header.

## Markdown Rendering

Assistant messages are rendered with:

- `react-markdown` + `remark-gfm` (in `components/MarkdownContent.tsx`)
- `react-syntax-highlighter` (One Dark theme) for fenced code blocks

This means assistant responses can format:

- headings,
- bold text,
- italic text,
- bullet lists,
- numbered lists,
- links,
- blockquotes,
- inline code,
- **syntax-highlighted code blocks**,
- tables.

User messages are rendered as plain text.

During streaming, assistant messages are rendered as **plain text** (no markdown re-parsing on every token). After streaming completes, `MarkdownContent` renders the final message with highlighting.

Markdown styles are defined in:

```text
app/globals.css
```

with the `.chat-markdown` class.

## Styling

Global styles live in:

```text
app/globals.css
```

The app uses CSS variables for the design system:

```css
--color-bg
--color-surface
--color-surface-elevated
--color-border
--color-text
--color-text-muted
--color-primary
--color-primary-hover
--color-user-bubble
--color-assistant-bubble
--color-error
--color-success
--radius-sm
--radius-md
--radius-lg
--radius-full
```

The UI is dark themed.

## Assistant Avatar

The assistant image is:

```text
public/assistant-avatar.svg
```

It is displayed in:

- the header,
- the empty state,
- assistant message rows,
- the typing indicator.

To change the avatar, replace this file or change:

```ts
const ASSISTANT_AVATAR = "/assistant-avatar.svg";
```

inside `components/Chat.tsx`.

## Backend API

Main backend route:

```text
app/api/chat/route.ts
```

URL:

```text
POST /api/chat
```

Because this is a Next.js App Router route handler, there is no separate Express server.

The route is intentionally thin. It delegates to:

| Module | Responsibility |
| --- | --- |
| `lib/api/chat-validation.ts` | Parse and validate request body |
| `lib/api/rate-limit.ts` | Per-IP rate limiting (30 req/min) |
| `lib/sse.ts` | Shared SSE encoding and error responses |
| `lib/ai/providers.ts` | AI provider calls and streaming |

`export const runtime = "nodejs"` ensures provider streaming runs in the Node.js runtime.

## API Request Body

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello"
    }
  ],
  "provider": "groq",
  "stream": true,
  "concise": false
}
```

### Fields

| Field | Required | Default | Description |
| --- | --- | --- | --- |
| `messages` | Yes | — | Full chat history. |
| `provider` | No | — | Optional selected provider. Allowed only when `ALLOW_AI_PROVIDER_SWITCH=true`. |
| `stream` | No | `true` | When `true`, returns SSE stream. When `false`, returns JSON. |
| `concise` | No | `false` | When `true`, appends concise-style instructions to the system prompt. |

## API Response

### Streaming response (default, `stream: true`)

Content-Type: `text/event-stream`

The server sends SSE events, one per line:

```text
data: {"type":"meta","provider":"groq"}

data: {"type":"chunk","content":"Hello"}

data: {"type":"chunk","content":" there"}

data: {"type":"done","provider":"groq"}
```

| Event type | Purpose |
| --- | --- |
| `meta` | Stream started — which provider is answering. |
| `chunk` | A piece of assistant text to append. |
| `done` | Stream finished successfully. |
| `error` | All providers failed or validation error. |

Validation errors on streaming requests also return SSE with `type: "error"`.

### Non-streaming response (`stream: false`)

Successful response:

```json
{
  "message": "Hello! How can I help you?",
  "provider": "groq"
}
```

Error response:

```json
{
  "error": "Messages array is required"
}
```

## API Validation

Validation lives in `lib/api/chat-validation.ts` (not inline in the route).

Rules:

| Rule | Detail |
| --- | --- |
| Body shape | Must be a JSON object. |
| `messages` | Required array, max **50** messages. |
| Each message | Must have `role` (`user` \| `assistant`) and `content` string, max **8000** chars. |
| Message order | Must alternate `user` → `assistant` → `user` → … |
| Last message | Must be a non-empty `user` message. |
| `provider` | Must be a valid provider if provided. |
| Provider switch | Rejected with 403 when `ALLOW_AI_PROVIDER_SWITCH=false`. |
| `stream` | Defaults to `true`; `false` or `"false"` disables streaming. |
| `concise` | Only `true` or `"true"` enables concise mode. |

Validation and server errors respect the client's `stream` flag:

- `stream: true` → SSE `{ type: "error", error: "..." }`
- `stream: false` → JSON `{ error: "..." }`

Rate limit exceeded returns **429** with the same format rules.

## Shared Types

Defined in:

```text
lib/ai/types.ts
```

Important types:

```ts
export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type AIProvider = "groq" | "gemini" | "huggingface";
```

Provider labels are handled by:

```ts
getProviderLabel(provider)
```

## System Prompt

System prompt logic lives in:

```text
lib/ai/prompts.ts
```

The base prompt comes from `SYSTEM_PROMPT` in `.env.local`. If missing, a default is used:

```text
You are a helpful AI assistant. Answer clearly and accurately.
```

The UI **Concise / Detailed** toggle appends extra style instructions:

| Mode | Extra instruction |
| --- | --- |
| Concise | Keep answers concise and to the point unless the user asks for more detail. |
| Detailed | Provide thorough, detailed answers when helpful. |

How each provider receives the prompt:

| Provider | How system prompt is sent |
| --- | --- |
| Groq | Prepended as a `system` role message (OpenAI format). |
| Hugging Face | Prepended as a `system` role message (OpenAI format). |
| Gemini | Sent as `systemInstruction.parts` in the request body. |

## Streaming Architecture

### Shared SSE utilities (`lib/sse.ts`)

| Function | Purpose |
| --- | --- |
| `encodeSSE()` | Format one `data: {...}\n\n` line |
| `createSseResponse()` | Build a streaming HTTP response |
| `createSseErrorResponse()` | Build an SSE error response |
| `SSE_HEADERS` | Standard headers including `X-Accel-Buffering: no` |

### Server side (`lib/ai/providers.ts`)

`createChatStream(messages, provider, concise, signal?)` returns a `ReadableStream` that:

1. Builds provider order via `getProviderOrder()`.
2. Tries each provider with `startProviderStream()` (passes `signal` to `fetch`).
3. On success, emits SSE events to the browser:
   - `meta` — provider connected
   - `chunk` — text token(s)
   - `done` — stream complete
4. On failure, tries the next provider.
5. If all fail, emits a single `error` event.
6. If `signal` is aborted (user clicked **Stop**), closes the stream immediately without an error event.

Provider-specific stream parsers:

| Provider | Upstream format | Parser |
| --- | --- | --- |
| Groq | OpenAI SSE (`choices[0].delta.content`) | `parseOpenAIStream()` |
| Hugging Face | OpenAI SSE | `parseOpenAIStream()` |
| Gemini | Gemini SSE (`candidates[0].content.parts[0].text`) | `parseGeminiStream()` |

### Client side (`lib/sse-client.ts`)

`readChatStream(response, signal?)` reads the fetch `Response.body` and yields parsed `ChatStreamEvent` objects. Supports abort via `AbortSignal`.

```ts
type ChatStreamEvent =
  | { type: "meta"; provider: AIProvider }
  | { type: "chunk"; content: string }
  | { type: "done"; provider: AIProvider }
  | { type: "error"; error: string };
```

`Chat.tsx` consumes these events in a `for await` loop inside `executeChatRequest()`.

## Provider Implementation

Main provider file:

```text
lib/ai/providers.ts
```

This file handles:

- reading provider API keys,
- formatting request bodies for each provider,
- calling each provider endpoint (streaming and non-streaming),
- parsing provider stream responses,
- fallback behavior,
- friendly error handling.

Key exported functions:

| Function | Purpose |
| --- | --- |
| `createChatStream()` | Main streaming path — returns `ReadableStream` of SSE bytes. |
| `generateChatResponse()` | Non-streaming fallback — returns `{ message, provider }`. |

## Groq Integration

Endpoint:

```text
https://api.groq.com/openai/v1/chat/completions
```

Streaming request (`stream: true`):

```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    { "role": "system", "content": "You are a helpful AI assistant..." },
    { "role": "user", "content": "Hello" }
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "stream": true
}
```

Stream chunk parsing:

```ts
json.choices?.[0]?.delta?.content
```

Non-streaming response parsing:

```ts
data.choices?.[0]?.message?.content
```

## Gemini Integration

Streaming endpoint:

```text
https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={apiKey}
```

Non-streaming endpoint:

```text
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
```

Current model is read from:

```env
GEMINI_MODEL=gemini-flash-lite-latest
```

Gemini streaming request includes `systemInstruction` and `contents`:

```json
{
  "systemInstruction": {
    "parts": [{ "text": "You are a helpful AI assistant..." }]
  },
  "contents": [
    { "role": "user", "parts": [{ "text": "Hello" }] }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 1024
  }
}
```

Why:

- app roles are `user` and `assistant`,
- Gemini expects `user` and `model`,
- Gemini content is sent inside `parts`,
- system prompt is sent via `systemInstruction`, not as a message role.

Stream chunk parsing:

```ts
json.candidates?.[0]?.content?.parts?.[0]?.text
```

Non-streaming response parsing:

```ts
data.candidates?.[0]?.content?.parts?.[0]?.text
```

## Hugging Face Integration

Endpoint:

```text
https://router.huggingface.co/v1/chat/completions
```

Current model is read from:

```env
HUGGINGFACE_MODEL=meta-llama/Llama-3.1-8B-Instruct
```

Hugging Face streaming request (`stream: true`):

```json
{
  "model": "meta-llama/Llama-3.1-8B-Instruct",
  "messages": [
    { "role": "system", "content": "You are a helpful AI assistant..." },
    { "role": "user", "content": "Hello" }
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "stream": true
}
```

Stream chunk parsing:

```ts
json.choices?.[0]?.delta?.content
```

Non-streaming response parsing:

```ts
data.choices?.[0]?.message?.content
```

## Hugging Face Token Permission

The Hugging Face token must be a fine-grained token with this permission:

```text
Make calls to Inference Providers
```

If missing, Hugging Face returns `403`.

## Error Handling

Provider errors are wrapped in `ProviderError`.

The UI receives short, friendly messages instead of raw provider JSON.

Examples:

| Status | Friendly Message |
| --- | --- |
| `401` / `403` | Provider rejected the request. |
| `429` | Provider is rate-limited or out of quota. |
| `500` / `502` / `503` / `504` | Provider is temporarily unavailable. |

Raw provider errors are logged only on the server with `console.error`.

## Fallback Behavior

Fallback happens inside both:

- `createChatStream()` — streaming path (default)
- `generateChatResponse()` — non-streaming path

Behavior:

1. Build provider order.
2. Try first provider.
3. If it fails, save the friendly error.
4. Try next provider.
5. Return / stream the first successful response.
6. If all fail, return a short combined error message.

Example:

```text
Selected provider: gemini
Provider order: gemini -> groq -> huggingface
```

If Gemini is out of quota, Groq is tried next. The UI shows `via Groq` even if the user selected Gemini.

## Configuration Layer

Configuration lives in:

```text
lib/config.ts
```

It handles:

- parsing boolean flags,
- parsing `DEFAULT_AI_PROVIDER`,
- reading model names from env,
- returning UI chat config.

Important functions:

| Function | Purpose |
| --- | --- |
| `isProviderSwitchAllowed()` | Reads `ALLOW_AI_PROVIDER_SWITCH`. |
| `getDefaultProvider()` | Reads and validates `DEFAULT_AI_PROVIDER`. |
| `getProviderModel(provider)` | Reads provider model from env or default. |
| `getChatConfig()` | Returns config passed into the UI. |

## Page Composition

`app/page.tsx` loads server config and passes it into the client chat component:

```tsx
const config = getChatConfig();

return (
  <Chat
    allowProviderSwitch={config.allowProviderSwitch}
    defaultProvider={config.defaultProvider}
    providers={config.providers}
  />
);
```

This keeps environment parsing on the server side.

## Layout

`app/layout.tsx`:

- imports global CSS,
- defines page metadata,
- renders root HTML,
- uses `suppressHydrationWarning`.

`suppressHydrationWarning` is used because browser extensions like Grammarly can inject attributes into `<body>` before React hydrates.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

3. Fill in API keys:

```env
GROQ_API_KEY=...
GEMINI_API_KEY=...
HUGGINGFACE_API_KEY=...
```

4. Start dev server:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
```

## Testing The API Manually

### Streaming (default)

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Say hello in one word"
      }
    ],
    "provider": "groq",
    "stream": true
  }'
```

Expected output (SSE lines):

```text
data: {"type":"meta","provider":"groq"}

data: {"type":"chunk","content":"Hello"}

data: {"type":"done","provider":"groq"}
```

### Non-streaming

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Say hello in one word"
      }
    ],
    "provider": "groq",
    "stream": false
  }'
```

Expected response:

```json
{
  "message": "Hello",
  "provider": "groq"
}
```

## Changing The Default Provider

Edit `.env.local`:

```env
DEFAULT_AI_PROVIDER=huggingface
```

Restart the dev server:

```bash
npm run dev
```

Allowed values:

```text
groq
gemini
huggingface
```

## Showing Or Hiding Provider Dropdown

Show dropdown:

```env
ALLOW_AI_PROVIDER_SWITCH=true
```

Hide dropdown:

```env
ALLOW_AI_PROVIDER_SWITCH=false
```

Restart after changing env values.

## Changing Models

Edit `.env.local`:

```env
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_MODEL=gemini-flash-lite-latest
HUGGINGFACE_MODEL=meta-llama/Llama-3.1-8B-Instruct
```

Restart:

```bash
npm run dev
```

No code changes are needed.

## Changing The System Prompt

Edit `.env.local`:

```env
SYSTEM_PROMPT=You are a friendly coding tutor. Explain concepts simply.
```

Restart:

```bash
npm run dev
```

The concise/detailed toggle still appends its style instructions on top of this base prompt.

## Security Notes

- Never expose real API keys in client-side code.
- API keys are read only in server-side route/provider files.
- `.env.local` should stay ignored by git.
- `.env.example` should use placeholder values only.
- The frontend calls `/api/chat`, not provider APIs directly.
- **Rate limiting**: 30 requests per minute per IP (in-memory; resets on server restart).
- **Input limits**: max 50 messages, 8000 chars per message.
- **Generic 500 errors**: internal details are logged server-side only, not returned to the client.

## Code Quality

### Prettier

Config: `.prettierrc.json`

```bash
npm run format        # auto-format all files
npm run format:check  # verify formatting (CI)
```

ESLint uses `eslint-config-prettier` to avoid rule conflicts.

### Tests

Vitest config: `vitest.config.ts`

```bash
npm test
```

| Test file | Covers |
| --- | --- |
| `lib/api/chat-validation.test.ts` | Message validation, provider parsing, stream flags |
| `lib/api/rate-limit.test.ts` | Per-IP rate limiting |
| `lib/sse.test.ts` | SSE encoding and error responses |

## Common Troubleshooting

### Gemini says quota exceeded

This usually means the selected Gemini model has no free-tier quota or the quota is used up.

Try:

```env
GEMINI_MODEL=gemini-flash-lite-latest
```

Then restart the server.

### Hugging Face returns 403

The token likely lacks this permission:

```text
Make calls to Inference Providers
```

Create a fine-grained Hugging Face token with that permission.

### Hugging Face says model is not supported

The selected model is not available for the enabled provider.

Use a supported chat model, for example:

```env
HUGGINGFACE_MODEL=meta-llama/Llama-3.1-8B-Instruct
```

### UI shows provider different from selected provider

This is expected when fallback happens.

Example:

- User selects Gemini.
- Gemini fails because of quota.
- Groq succeeds.
- Header shows `via Groq`.

### Hydration warning on body attributes

Browser extensions may inject attributes before React hydrates.

The app uses:

```tsx
suppressHydrationWarning
```

in `app/layout.tsx`.

### Streaming looks choppy or flickers

The UI intentionally renders plain text during streaming and markdown only after `done`. Chunks are batched with `requestAnimationFrame` to reduce re-renders.

### Chat history lost after refresh

Chat is stored in `localStorage` under key `ai-chat-storage`. If history is missing:

- check browser privacy settings (localStorage blocked),
- check if **Clear chat** was clicked,
- check DevTools → Application → Local Storage.

### API returns 429 Too Many Requests

The chat API is rate-limited to **30 requests per minute per IP**. Wait a minute and try again, or restart the dev server to reset in-memory counters during local development.

## Build Verification

Run:

```bash
npm test
npm run format:check
npm run build
```

This verifies unit tests, formatting, TypeScript types, and Next.js compilation.

## Known Notes

- Chat history is persisted in browser `localStorage` (not a database).
- There is no authentication.
- Streaming is the default API mode (`stream: true`).
- Non-streaming JSON mode is available via `stream: false`.
- The API expects the client to send the full message history.
- Provider fallback works in both streaming and non-streaming modes.
- Stop generation cancels both client fetch and server provider streams.
- Rate limiting is in-memory (not suitable for multi-instance production without Redis).
- The app is meant as a simple demo foundation.

## Possible Future Improvements

- Add database-backed chat history (replace or supplement localStorage).
- Add user accounts and authentication.
- Add chat sessions sidebar (multiple conversations).
- Add token limits and message trimming before sending to providers.
- Add per-provider model dropdown in the UI.
- Add distributed rate limiting (Redis/Upstash) for production.
- Add integration tests for provider fallback and streaming behavior.
- Add deployment configuration for Vercel or another host.

## Quick Reference

| Task | File |
| --- | --- |
| Change UI | `components/Chat.tsx` |
| Change markdown / syntax highlighting | `components/MarkdownContent.tsx` |
| Change API route | `app/api/chat/route.ts` |
| Change request validation | `lib/api/chat-validation.ts` |
| Change rate limiting | `lib/api/rate-limit.ts` |
| Change SSE utilities | `lib/sse.ts` |
| Change provider / streaming logic | `lib/ai/providers.ts` |
| Change system prompt | `lib/ai/prompts.ts` or `SYSTEM_PROMPT` in `.env.local` |
| Change SSE client parser | `lib/sse-client.ts` |
| Change localStorage behavior | `lib/chat-storage.ts` |
| Change export format | `lib/export-chat.ts` |
| Change env parsing | `lib/config.ts` |
| Change shared types | `lib/ai/types.ts` |
| Change theme | `app/globals.css` |
| Change avatar | `public/assistant-avatar.svg` |
| Change models | `.env.local` |
| Change provider flag | `.env.local` |
| Run tests | `npm test` |
| Format code | `npm run format` |

## End-To-End Example (Streaming)

Request:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Write a haiku about coding"
    }
  ],
  "provider": "gemini",
  "stream": true,
  "concise": true
}
```

SSE response (simplified):

```text
data: {"type":"meta","provider":"gemini"}

data: {"type":"chunk","content":"Silent keys awake\n"}

data: {"type":"chunk","content":"Logic blooms in glowing lines\n"}

data: {"type":"chunk","content":"Bugs fade into dawn"}

data: {"type":"done","provider":"gemini"}
```

The response provider can be different if fallback was needed (e.g. `groq` instead of `gemini`).
