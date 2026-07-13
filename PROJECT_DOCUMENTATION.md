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
- Assistant avatar.
- Typing indicator.
- Empty state with suggestions.
- Clear chat button.
- Provider dropdown controlled by a feature flag.
- Markdown rendering for assistant responses.
- Server-side API route for AI calls.
- Provider fallback support.
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
│   │   └── types.ts
│   └── config.ts
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

High-level request flow:

```text
User types message
  -> Chat.tsx updates local message history
  -> Chat.tsx sends POST /api/chat
  -> route.ts validates request
  -> generateChatResponse() picks provider order
  -> Provider API is called
  -> Response is returned as JSON
  -> Chat.tsx renders assistant response
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
| `TypingIndicator` | Shows animated dots while waiting for a response. |
| `MessageContent` | Renders user text or assistant markdown. |
| `MessageBubble` | Renders a single user or assistant message bubble. |
| `EmptyState` | Shows initial empty chat screen and suggestion chips. |
| `SuggestionChip` | Clickable suggestion text. |
| `ProviderSelect` | Dropdown for manual provider selection. |
| `Chat` | Main chat component with state and behavior. |

### Frontend State

The chat component keeps these values in React state:

| State | Purpose |
| --- | --- |
| `messages` | Full chat history in the browser. |
| `input` | Current textarea value. |
| `isLoading` | Whether an AI response is currently being generated. |
| `error` | User-friendly error message shown in the UI. |
| `activeProvider` | Provider that answered the latest message. |
| `selectedProvider` | Provider selected by the user when the flag is enabled. |

### Sending A Message

The `sendMessage()` function:

1. trims the input,
2. ignores empty messages,
3. appends the user message locally,
4. clears the input,
5. sets loading state,
6. sends a `POST /api/chat` request,
7. receives `{ message, provider }`,
8. stores the assistant reply,
9. updates the active provider label.

### API Call From Frontend

The frontend sends:

```ts
fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: updatedMessages,
    provider: selectedProvider
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
  "provider": "groq"
}
```

### Fields

| Field | Required | Description |
| --- | --- | --- |
| `messages` | Yes | Full chat history. |
| `provider` | No | Optional selected provider. Allowed only when `ALLOW_AI_PROVIDER_SWITCH=true`. |

## API Response Body

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

## Provider Implementation

Main provider file:

```text
lib/ai/providers.ts
```

This file handles:

- reading provider API keys,
- formatting request bodies for each provider,
- calling each provider endpoint,
- parsing provider responses,
- fallback behavior,
- friendly error handling.

## Groq Integration

Endpoint:

```text
https://api.groq.com/openai/v1/chat/completions
```

Request format:

```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    {
      "role": "user",
      "content": "Hello"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1024
}
```

Response parsing:

```ts
data.choices?.[0]?.message?.content
```

## Gemini Integration

Endpoint pattern:

```text
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
```

Current model is read from:

```env
GEMINI_MODEL=gemini-flash-lite-latest
```

Gemini uses a different message format:

```ts
const contents = messages.map((m) => ({
  role: m.role === "assistant" ? "model" : "user",
  parts: [{ text: m.content }],
}));
```

Why:

- app roles are `user` and `assistant`,
- Gemini expects `user` and `model`,
- Gemini content is sent inside `parts`.

Response parsing:

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

Hugging Face uses an OpenAI-compatible format:

```json
{
  "model": "meta-llama/Llama-3.1-8B-Instruct",
  "messages": [
    {
      "role": "user",
      "content": "Hello"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "stream": false
}
```

Response parsing:

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

Fallback happens inside:

```ts
generateChatResponse(messages, selectedProvider)
```

Behavior:

1. Build provider order.
2. Try first provider.
3. If it fails, save the friendly error.
4. Try next provider.
5. Return the first successful response.
6. If all fail, return a short combined error message.

Example:

```text
Selected provider: gemini
Provider order: gemini -> groq -> huggingface
```

If Gemini is out of quota, Groq is tried next.

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

Use curl:

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
    "provider": "groq"
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

### Markdown looked unformatted

Assistant messages are now rendered with `react-markdown`.

If markdown looks wrong, check:

- `components/Chat.tsx`
- `app/globals.css`
- `react-markdown` dependency
- `remark-gfm` dependency

## Build Verification

Run:

```bash
npm run build
```

The latest build completed successfully after markdown changes.

## Known Notes

- The current app keeps chat history only in browser memory.
- Refreshing the page clears messages.
- There is no database.
- There is no authentication.
- There is no streaming response yet.
- All provider calls are non-streaming.
- The API expects the client to send the full message history.
- The app is meant as a simple demo foundation.

## Possible Future Improvements

- Add streaming responses.
- Add database-backed chat history.
- Add user accounts.
- Add system prompt configuration.
- Add token limits and message trimming.
- Add per-provider model dropdown.
- Add retry button on failed messages.
- Add copy button for assistant messages.
- Add syntax highlighting for code blocks.
- Add rate limiting on `/api/chat`.
- Add tests for provider fallback behavior.
- Add deployment configuration for Vercel or another host.

## Quick Reference

| Task | File |
| --- | --- |
| Change UI | `components/Chat.tsx` |
| Change API validation | `app/api/chat/route.ts` |
| Change provider logic | `lib/ai/providers.ts` |
| Change env parsing | `lib/config.ts` |
| Change shared types | `lib/ai/types.ts` |
| Change theme | `app/globals.css` |
| Change avatar | `public/assistant-avatar.svg` |
| Change models | `.env.local` |
| Change provider flag | `.env.local` |

## End-To-End Example

Request:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Write a haiku about coding"
    }
  ],
  "provider": "gemini"
}
```

Response:

```json
{
  "message": "Silent keys awake\nLogic blooms in glowing lines\nBugs fade into dawn",
  "provider": "gemini"
}
```

The response provider can be different if fallback was needed.
