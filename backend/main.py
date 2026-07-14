"""
AI Chat Learning Backend

Phases covered in this file:
  Phase 1 — FastAPI (routes, Pydantic, CORS, .env, SSE)
  Phase 2 — LangChain + Groq (chat, streaming, session memory, reply style)
  Phase 3 — LlamaIndex RAG (ask questions over files in ./data)

Run (from backend/, with venv active):
  uvicorn main:app --reload --host 127.0.0.1 --port 8000
  Docs: http://127.0.0.1:8000/docs
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# LangChain — chat / tools / memory orchestration
from langchain_groq import ChatGroq
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

# LlamaIndex — document load → embed → index → retrieve (RAG)
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, Settings
from llama_index.llms.groq import Groq
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# ---------------------------------------------------------------------------
# Config — secrets live in backend/.env (never commit real keys)
# ---------------------------------------------------------------------------
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Folder of markdown files used for RAG (lab-secret.md, project-notes.md, …)
DATA_DIR = Path(__file__).parent / "data"

# Cached vector index. Built once on first /rag call, reused after that.
# Editing files in DATA_DIR does NOT update this until you restart the
# server (or clear rag_index and rebuild).
rag_index: VectorStoreIndex | None = None

# In-memory chat history for LangChain sessions.
# Shape: { "session_id": [HumanMessage, AIMessage, HumanMessage, AIMessage, ...] }
# Lost when the process restarts — fine for learning.
chat_sessions: dict[str, list] = {}


# ---------------------------------------------------------------------------
# LlamaIndex RAG helpers
# ---------------------------------------------------------------------------
def get_rag_index() -> VectorStoreIndex:
    """
    Build (or return cached) vector index over DATA_DIR.

    Steps on first call (slow):
      1. Configure Groq as the answer LLM
      2. Configure local HuggingFace embeddings (text → vectors)
      3. Load every file under data/
      4. Chunk + embed documents into VectorStoreIndex

    Later calls just return the cached `rag_index` (fast).
    """
    global rag_index
    if rag_index is not None:
        return rag_index

    if not GROQ_API_KEY or GROQ_API_KEY.startswith("your_"):
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured")

    # Global LlamaIndex settings used by the query engine
    Settings.llm = Groq(api_key=GROQ_API_KEY, model=GROQ_MODEL)
    # Local embeddings = no OpenAI key needed, but first run may download the model
    Settings.embed_model = HuggingFaceEmbedding(
        model_name="BAAI/bge-small-en-v1.5"
    )

    docs = SimpleDirectoryReader(str(DATA_DIR)).load_data()
    rag_index = VectorStoreIndex.from_documents(docs)
    return rag_index


# ---------------------------------------------------------------------------
# LangChain chat helpers
# ---------------------------------------------------------------------------
def get_model() -> ChatGroq:
    """Create a Groq chat model for LangChain /chat endpoints."""
    if not GROQ_API_KEY or GROQ_API_KEY.startswith("your_"):
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured in backend/.env",
        )
    return ChatGroq(
        api_key=GROQ_API_KEY,
        model=GROQ_MODEL,
        temperature=0.7,  # higher = more creative; lower = more focused
    )


def build_messages(session_id: str, message: str, reply_mode: str = "concise") -> list:
    """
    Assemble the message list sent to the LLM:
      [SystemMessage] + prior history + new HumanMessage

    reply_mode controls answer length via the system prompt
    (same idea as Concise / Detailed on the Next.js UI).
    """
    history = chat_sessions.setdefault(session_id, [])
    style = (
        "Keep answers short (1–3 sentences)."
        if reply_mode == "concise"
        else "Give a thorough, well-structured answer with useful detail."
    )
    return [
        SystemMessage(content=f"You are a helpful assistant. {style}"),
        *history,
        HumanMessage(content=message),
    ]


def remember(session_id: str, human: str, ai: str) -> None:
    """Append this turn to session history; keep only the last 20 messages."""
    history = chat_sessions.setdefault(session_id, [])
    history.append(HumanMessage(content=human))
    history.append(AIMessage(content=ai))
    chat_sessions[session_id] = history[-20:]


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="AI Chat Learning Backend")

# CORS: browsers block localhost:3000 → :8000 unless the API allows it
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic models = request/response schemas + automatic validation
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(default="default", min_length=1, max_length=64)
    reply_mode: str = Field(default="concise", pattern="^(concise|detailed)$")


class ChatResponse(BaseModel):
    reply: str


class RagRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class RagResponse(BaseModel):
    answer: str
    sources: list[str]  # short snippets of retrieved chunks (for debugging/learning)


# ---------------------------------------------------------------------------
# Basic routes
# ---------------------------------------------------------------------------
@app.get("/")
def root():
    return {"message": "Hello from FastAPI! Open /docs to try the API."}


@app.get("/health")
def health():
    """Liveness check — never return the real API key, only whether it is set."""
    return {
        "status": "ok",
        "groq_key_configured": bool(
            GROQ_API_KEY and not GROQ_API_KEY.startswith("your_")
        ),
        "groq_model": GROQ_MODEL,
    }


# ---------------------------------------------------------------------------
# LangChain chat — full reply (invoke waits for the complete answer)
# ---------------------------------------------------------------------------
@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        model = get_model()
        messages = build_messages(
            request.session_id, message, request.reply_mode
        )
        # invoke() → one AIMessage when generation finishes
        ai_message = model.invoke(messages)
        reply = (
            ai_message.content
            if isinstance(ai_message.content, str)
            else str(ai_message.content)
        )
        remember(request.session_id, message, reply)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc

    return ChatResponse(reply=reply)


# ---------------------------------------------------------------------------
# LangChain chat — SSE stream (astream yields tokens as they arrive)
# SSE format: each event is "data: <text>\n\n", then "data: [DONE]\n\n"
# ---------------------------------------------------------------------------
@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        model = get_model()
        messages = build_messages(
            request.session_id, message, request.reply_mode
        )
    except HTTPException:
        raise

    async def event_generator():
        parts: list[str] = []
        try:
            async for chunk in model.astream(messages):
                text = chunk.content if isinstance(chunk.content, str) else ""
                if text:
                    parts.append(text)
                    # Keep SSE as one line per event (newlines would break framing)
                    safe = text.replace("\n", "\\n")
                    yield f"data: {safe}\n\n"
            remember(request.session_id, message, "".join(parts))
            yield "data: [DONE]\n\n"
        except Exception as exc:
            yield f"data: [ERROR] {exc}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.delete("/chat/session/{session_id}")
def clear_session(session_id: str):
    """Forget conversation history for one session_id."""
    chat_sessions.pop(session_id, None)
    return {"cleared": session_id}


# ---------------------------------------------------------------------------
# LlamaIndex RAG — question over ./data documents
#
# Flow: question → embed → find top-k similar chunks → LLM answers from them
# Test: {"question": "What is the fridge password?"} → expect password from lab-secret.md
# ---------------------------------------------------------------------------
@app.post("/rag", response_model=RagResponse)
def rag(request: RagRequest):
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        index = get_rag_index()
        # similarity_top_k = how many retrieved chunks to pass to the LLM
        engine = index.as_query_engine(similarity_top_k=3)
        result = engine.query(question)

        # Expose retrieved text so you can see what grounded the answer
        sources: list[str] = []
        for node in getattr(result, "source_nodes", []) or []:
            text = node.get_content()
            sources.append(text[:240] + ("..." if len(text) > 240 else ""))

        return RagResponse(answer=str(result), sources=sources)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"RAG error: {exc}") from exc
