# AI Chat — Next.js

A simple AI chat application built with **Next.js App Router**. The frontend and backend live in the same Next.js app — the browser talks to `POST /api/chat`, which calls external AI providers.

## Features

- **Streaming responses** via Server-Sent Events (SSE) — tokens appear as they are generated
- **Multi-provider fallback** — Groq, Gemini, and Hugging Face; if one fails, the next is tried automatically
- **Optional manual provider switching** via `ALLOW_AI_PROVIDER_SWITCH=true`
- **Concise / Detailed** reply mode toggle
- **localStorage persistence** — chat history survives page refresh
- **Stop, retry, and regenerate** for in-flight and failed requests
- **Export chat** as Markdown or plain text
- **Markdown rendering** with syntax-highlighted code blocks
- **Rate limiting** (30 requests/minute per IP) and request validation
- **Vitest** unit tests and **Prettier** formatting

## Tech Stack

Next.js · React · TypeScript · Tailwind CSS v4 · react-markdown · Vitest

## Setup

1. Copy environment variables:

```bash
cp .env.example .env.local
```

2. Add your API keys to `.env.local`:

```env
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key
```

3. Install dependencies and run:

```bash
npm install
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting (CI-friendly) |
| `npm test` | Run Vitest unit tests |

## Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `GROQ_API_KEY` | Groq API key | — |
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `HUGGINGFACE_API_KEY` | Hugging Face API token | — |
| `GROQ_MODEL` | Groq model name | `llama-3.3-70b-versatile` |
| `GEMINI_MODEL` | Gemini model name | `gemini-flash-lite-latest` |
| `HUGGINGFACE_MODEL` | Hugging Face model name | `meta-llama/Llama-3.1-8B-Instruct` |
| `SYSTEM_PROMPT` | Base system prompt for all providers | `You are a helpful AI assistant...` |
| `DEFAULT_AI_PROVIDER` | First provider when none is selected | `groq` |
| `ALLOW_AI_PROVIDER_SWITCH` | Show provider dropdown in UI | `false` |

Restart the dev server after changing environment variables.

## AI Providers & Fallback

Supported providers (defined in `lib/ai/types.ts`):

1. **Groq** — `llama-3.3-70b-versatile`
2. **Hugging Face** — `meta-llama/Llama-3.1-8B-Instruct`
3. **Gemini** — `gemini-flash-lite-latest`

Fallback order starts with the selected provider (or `DEFAULT_AI_PROVIDER`), then tries the remaining providers. Example with default settings:

```text
groq → huggingface → gemini
```

## API

`POST /api/chat`

### Request body

```json
{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "stream": true,
  "concise": false,
  "provider": "groq"
}
```

| Field | Required | Default | Description |
| --- | --- | --- | --- |
| `messages` | Yes | — | Full chat history (max 50 messages, 8000 chars each) |
| `stream` | No | `true` | Return SSE stream when `true`, JSON when `false` |
| `concise` | No | `false` | Shorter assistant replies when `true` |
| `provider` | No | — | `groq`, `gemini`, or `huggingface` (only when `ALLOW_AI_PROVIDER_SWITCH=true`) |

### Streaming response (default)

Content-Type: `text/event-stream`

```text
data: {"type":"meta","provider":"groq"}

data: {"type":"chunk","content":"Hello"}

data: {"type":"done","provider":"groq"}
```

### Non-streaming response (`stream: false`)

```json
{
  "message": "Hi! How can I help you?",
  "provider": "groq"
}
```

### Test with curl

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello in one word"}]}'
```

## Project Structure

```text
app/
  api/chat/route.ts    # Backend API route
  page.tsx             # Chat page
components/
  Chat.tsx             # Main chat UI
  MarkdownContent.tsx  # Markdown + syntax highlighting
lib/
  ai/                  # Provider calls, prompts, types
  api/                 # Validation, rate limiting
  config.ts            # Environment parsing
  sse.ts               # SSE encoding
```

## Documentation

For full architecture, provider integration details, troubleshooting, and extension guides, see [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md).
