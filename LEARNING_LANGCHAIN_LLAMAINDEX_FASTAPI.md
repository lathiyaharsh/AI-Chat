# Learning Checklist: LangChain / LlamaIndex + FastAPI

Track progress by changing `[ ]` to `[x]` as you complete each item.

**Stack focus**

| Tool | Use for |
| --- | --- |
| FastAPI | HTTP APIs, streaming, validation |
| LangChain | Chains, agents, tools, memory |
| LlamaIndex | Document ingestion, indexing, RAG |

**Goal:** Build a FastAPI backend that can chat (LangChain) and answer from documents (LlamaIndex), optionally wired to the existing Next.js chat UI.

---

## Phase 0 — Setup

- [x] Create a Python virtualenv (`python -m venv .venv`)
- [x] Activate the venv and upgrade pip
- [x] Install FastAPI + Uvicorn (`fastapi`, `uvicorn[standard]`)
- [x] Install LangChain core packages (`langchain`, `langchain-core`, `langchain-community`)
- [x] Install one chat model provider package (e.g. `langchain-groq` or `langchain-openai`)
- [x] Install LlamaIndex (`llama-index`)
- [x] Copy API keys into a `.env` (never commit secrets)
- [x] Run a “hello” FastAPI app on `http://127.0.0.1:8000`
- [x] Open `/docs` (Swagger UI) and call a sample endpoint

---

## Phase 1 — FastAPI fundamentals

- [x] Understand path operations (`@app.get`, `@app.post`)
- [x] Define a Pydantic request model (e.g. `ChatRequest`)
- [x] Define a Pydantic response model (e.g. `ChatResponse`)
- [x] Return JSON from a POST `/chat` endpoint
- [x] Add CORS so a Next.js frontend can call the API
- [x] Load settings from environment variables
- [x] Add basic error handling (`HTTPException`)
- [x] Add request validation (message length / count limits)
- [x] Write a health check endpoint `GET /health`
- [ ] (Optional) Split routers: `routers/chat.py`, `routers/rag.py`

### Streaming (match the Next.js chat UX)

- [x] Understand SSE (Server-Sent Events) conceptually
- [x] Return a `StreamingResponse` that yields tokens
- [x] Stream plain text chunks from a dummy generator
- [x] Stream events in a format your frontend can parse
- [ ] Handle client disconnect / cancellation

---

## Phase 2 — LangChain basics

- [ ] Call a chat model directly (no chain yet)
- [ ] Use `ChatPromptTemplate` with system + human messages
- [ ] Build a simple LCEL chain: `prompt | model | parser`
- [ ] Understand `invoke` vs `stream` vs `ainvoke` / `astream`
- [ ] Parse string output with `StrOutputParser`
- [ ] Pass conversation history into the prompt
- [ ] Add concise vs detailed reply style via prompt variables
- [ ] Wire LangChain streaming into FastAPI `StreamingResponse`
- [ ] Log latency and token/provider errors in a readable way

### Memory

- [ ] Understand chat message types (`SystemMessage`, `HumanMessage`, `AIMessage`)
- [ ] Keep per-session history in memory (dict / store)
- [ ] Clear session history via an API endpoint
- [ ] (Optional) Persist history (Redis / SQLite / file)

### Tools & agents (intro)

- [ ] Define one simple tool (e.g. calculator or time)
- [ ] Bind tools to a chat model
- [ ] Run a basic agent / tool-calling loop once
- [ ] Expose a FastAPI endpoint that uses the tool-aware chain
- [ ] Understand when *not* to use an agent (simple Q&A vs multi-step)

---

## Phase 3 — LlamaIndex + RAG

- [ ] Understand RAG: load → chunk → embed → index → retrieve → generate
- [ ] Load local documents (`.md`, `.txt`, or PDF)
- [ ] Split / chunk documents
- [ ] Create a vector index (start with local / simple store)
- [ ] Query the index with a natural-language question
- [ ] Inspect retrieved source nodes / citations
- [ ] Tune chunk size and top-k retrieval
- [ ] Wrap RAG in a FastAPI `POST /rag` endpoint
- [ ] Return answer + source snippets in the JSON response
- [ ] (Optional) Stream RAG answers over SSE
- [ ] (Optional) Persist the index to disk and reload on startup
- [ ] (Optional) Add an ingest endpoint to upload new files

---

## Phase 4 — LangChain vs LlamaIndex (know the split)

- [ ] Can explain: LangChain = orchestration / agents / tools
- [ ] Can explain: LlamaIndex = data ingestion / retrieval / RAG
- [ ] Build one flow that uses **LlamaIndex for retrieval** and **LangChain (or plain LLM) for answering**
- [ ] Document in notes: which library you prefer for which task

---

## Phase 5 — Integrate with this AI-Chat project

- [ ] Keep Next.js as the UI only
- [ ] Point the frontend chat API to FastAPI (`NEXT_PUBLIC_...` or rewrite proxy)
- [ ] Match existing message payload shape (`messages`, provider, reply mode)
- [ ] Match SSE event shape if you already use streaming on the client
- [ ] Support stop/cancel from the UI
- [ ] Add a UI mode or route for “Ask my docs” (RAG)
- [ ] Confirm CORS, errors, and rate limiting still feel correct
- [ ] Write a short note in this file about what broke and how you fixed it

---

## Phase 6 — Quality & production basics

- [ ] Add structured logging
- [ ] Add rate limiting on chat / rag routes
- [ ] Add timeouts for LLM calls
- [ ] Hide raw provider errors from clients (friendly messages)
- [ ] Write at least 2–3 unit tests (validation, health, one service function)
- [ ] Add a `requirements.txt` (or `pyproject.toml`) with pinned versions
- [ ] Add a short `backend/README.md` with run instructions
- [ ] (Optional) Dockerize the FastAPI service

---

## Mini projects (mark when done)

- [ ] **Project A:** FastAPI `/chat` with LangChain streaming (no tools)
- [ ] **Project B:** Same chat + one tool (search or calculator)
- [ ] **Project C:** FastAPI `/rag` over a folder of markdown notes
- [ ] **Project D:** Next.js UI → FastAPI backend (full loop)
- [ ] **Project E:** RAG answers include clickable/citable sources

---

## Concepts checklist (can you explain each?)

- [ ] Prompt template vs system prompt
- [ ] Tokens and context window
- [ ] Streaming vs non-streaming
- [ ] Embeddings and vector similarity
- [ ] Chunking trade-offs
- [ ] Hallucination vs grounded RAG answers
- [ ] Tool calling / function calling
- [ ] Agents vs plain chains
- [ ] Sync vs async FastAPI endpoints
- [ ] Why keep secrets server-side only

---

## Resources (fill in as you use them)

- [ ] FastAPI docs — https://fastapi.tiangolo.com/
- [ ] LangChain docs — https://python.langchain.com/
- [ ] LlamaIndex docs — https://docs.llamaindex.ai/
- [ ] Your notes / blog / loom links: _add here_

---

## Progress log

| Date | What I finished | Blockers / learnings |
| --- | --- | --- |
| 2026-07-14 | Phase 0: venv, packages, .env, hello FastAPI + /docs | requirements.txt so others can reproduce |
| 2026-07-14 | Phase 1: POST /chat, CORS, .env, HTTPException, SSE stream | Echo + fake token stream before LLM |

---

## Current focus

> Phase 2 — LangChain + Groq (real LLM replies)
