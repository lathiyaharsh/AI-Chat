# AI Chat — Next.js

A simple AI chat application built with Next.js (App Router) using API routes as the backend.

## Features

- Chat UI with message history, loading states, and error handling
- Multi-provider AI fallback chain:
  1. **Groq** (Llama 3.3 70B)
  2. **Gemini** (Gemini 2.0 Flash)
  3. **Hugging Face** (Meta Llama 3 8B Instruct)

If one provider fails, the next is tried automatically.

- Optional manual provider switching via `ALLOW_AI_PROVIDER_SWITCH=true`

## Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Add your API keys to `.env`:

```
GROQ_API_KEY=...
GEMINI_API_KEY=...
HUGGINGFACE_API_KEY=...
DEFAULT_AI_PROVIDER=groq
ALLOW_AI_PROVIDER_SWITCH=false
```

3. Install dependencies and run:

```bash
npm install
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## API

`POST /api/chat`

```json
{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ]
}
```

Response:

```json
{
  "message": "Hi! How can I help you?",
  "provider": "groq"
}
```
