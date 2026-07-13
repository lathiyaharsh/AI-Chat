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
- Provider dropdown controlled by a feature flag.
- Markdown rendering for assistant responses (after streaming completes).
- Server-side API route for AI calls.
- Provider fallback support (works in both streaming and non-streaming modes).
- Environment-controlled provider models.
- Friendly error messages instead of raw provider JSON errors.
- Secrets stored in `.env.local`.

## Technology Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js |
| Router | App Router |
| Language | TypeScript |
| UI | React |
| Styling | Tailwind CSS v4 + CSS variables |
| Markdown | `react-markdown` + `remark-gfm` |
| Backend | Next.js Route Handlers |
| AI Providers | Groq, Gemini, Hugging Face |

## Package Scripts

Defined in `package.json`:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Starts the development server with Turbopack. |
| `npm run build` | Builds the production app. |
| `npm run start` | Starts the production server after build. |
| `npm run lint` | Runs Next.js linting. |

## Important Dependencies

| Dependency | Purpose |
| --- | --- |
| `next` | Next.js framework. |
| `react` | React UI library. |
| `react-dom` | React DOM rendering. |
| `react-markdown` | Renders assistant markdown responses. |
| `remark-gfm` | Enables GitHub Flavored Markdown features like tables and task lists. |
| `tailwindcss` | Utility styling framework. |
| `typescript` | Static typing. |

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
│   └── Chat.tsx
├── lib/
│   ├── ai/
│   │   ├── providers.ts
│   │   ├── prompts.ts
│   │   └── types.ts
│   ├── chat-storage.ts
│   ├── config.ts
│   └── sse-client.ts
├── public/
│   └── assistant-avatar.svg
├── .env.example
├── .env.local
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
  -> Chat.tsx sends POST /api/chat with stream: true
  -> route.ts validates request
  -> createChatStream() picks provider order and tries each provider
  -> Provider API streams tokens back
  -> Server re-wraps tokens as SSE events (meta, chunk, done, error)
  -> lib/sse-client.ts parses SSE on the browser
  -> Chat.tsx appends chunks to the assistant bubble in real time
  -> After done, markdown is rendered and chat is saved to localStorage
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
| `MessageContent` | Renders user text, plain text while streaming, or markdown when complete. |
| `MessageBubble` | Renders a single user or assistant message bubble. |
| `EmptyState` | Shows initial empty chat screen and suggestion chips. |
| `SuggestionChip` | Clickable suggestion that calls `sendMessage()` directly. |
| `ProviderSelect` | Dropdown for manual provider selection. |
| `ReplyModeToggle` | Concise / Detailed toggle sent to the API as `concise: true/false`. |
| `Chat` | Main chat component with state, streaming, and localStorage. |

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

The `sendMessage()` function:

1. trims the input,
2. ignores empty messages,
3. appends the user message locally,
4. clears the input,
5. sets loading state,
6. sends a `POST /api/chat` request with `stream: true`,
7. creates an empty assistant message bubble,
8. reads SSE events via `readChatStream()`,
9. on `meta` / `done` — updates the active provider label,
10. on `chunk` — appends text (batched with `requestAnimationFrame` for smooth UI),
11. on `error` — shows a friendly error and removes empty assistant bubble,
12. after streaming — renders markdown and saves to localStorage.

### API Call From Frontend

The frontend sends:

```ts
fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: updatedMessages,
    stream: true,
    concise: conciseMode,
    ...(allowProviderSwitch ? { provider: selectedProvider } : {}),
  }),
});
```

The `provider` field is only sent when provider switching is enabled.

## Markdown Rendering

Assistant messages are rendered with:

- `react-markdown`
- `remark-gfm`

This means assistant responses can format:

- headings,
- bold text,
- italic text,
- bullet lists,
- numbered lists,
- links,
- blockquotes,
- inline code,
- code blocks,
- tables.

User messages are rendered as plain text.

During streaming, assistant messages are rendered as **plain text** (no markdown re-parsing on every token). After streaming completes, `react-markdown` renders the final message.

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

The API route validates:

- `messages` must be an array.
- `messages` must not be empty.
- last message must be a user message.
- last user message must not be empty.
- requested provider must be valid.
- requested provider is accepted only when provider switching is enabled.

`stream` and `concise` are optional booleans. Invalid values are treated as defaults (`stream: true`, `concise: false`).

Validation errors on streaming requests return SSE `error` events. Non-streaming requests return JSON `{ error }`.

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

### Server side (`lib/ai/providers.ts`)

`createChatStream()` returns a `ReadableStream` that:

1. Builds provider order via `getProviderOrder()`.
2. Tries each provider with `startProviderStream()`.
3. On success, emits SSE events to the browser:
   - `meta` — provider connected
   - `chunk` — text token(s)
   - `done` — stream complete
4. On failure, tries the next provider.
5. If all fail, emits a single `error` event.

Provider-specific stream parsers:

| Provider | Upstream format | Parser |
| --- | --- | --- |
| Groq | OpenAI SSE (`choices[0].delta.content`) | `parseOpenAIStream()` |
| Hugging Face | OpenAI SSE | `parseOpenAIStream()` |
| Gemini | Gemini SSE (`candidates[0].content.parts[0].text`) | `parseGeminiStream()` |

### Client side (`lib/sse-client.ts`)

`readChatStream(response)` reads the fetch `Response.body` and yields parsed `ChatStreamEvent` objects:

```ts
type ChatStreamEvent =
  | { type: "meta"; provider: AIProvider }
  | { type: "chunk"; content: string }
  | { type: "done"; provider: AIProvider }
  | { type: "error"; error: string };
```

`Chat.tsx` consumes these events in a `for await` loop inside `sendMessage()`.

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

## Build Verification

Run:

```bash
npm run build
```

This verifies TypeScript types and Next.js compilation across all updated files.

## Known Notes

- Chat history is persisted in browser `localStorage` (not a database).
- There is no authentication.
- Streaming is the default API mode (`stream: true`).
- Non-streaming JSON mode is available via `stream: false`.
- The API expects the client to send the full message history.
- Provider fallback works in both streaming and non-streaming modes.
- The app is meant as a simple demo foundation.

## Possible Future Improvements

- Add database-backed chat history (replace or supplement localStorage).
- Add user accounts and authentication.
- Add chat sessions sidebar (multiple conversations).
- Add token limits and message trimming.
- Add per-provider model dropdown in the UI.
- Add retry button on failed messages.
- Add syntax highlighting for code blocks in markdown.
- Add rate limiting on `/api/chat`.
- Add tests for provider fallback and streaming behavior.
- Add deployment configuration for Vercel or another host.

## Quick Reference

| Task | File |
| --- | --- |
| Change UI | `components/Chat.tsx` |
| Change API validation | `app/api/chat/route.ts` |
| Change provider / streaming logic | `lib/ai/providers.ts` |
| Change system prompt | `lib/ai/prompts.ts` or `SYSTEM_PROMPT` in `.env.local` |
| Change SSE client parser | `lib/sse-client.ts` |
| Change localStorage behavior | `lib/chat-storage.ts` |
| Change env parsing | `lib/config.ts` |
| Change shared types | `lib/ai/types.ts` |
| Change theme | `app/globals.css` |
| Change avatar | `public/assistant-avatar.svg` |
| Change models | `.env.local` |
| Change provider flag | `.env.local` |

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
