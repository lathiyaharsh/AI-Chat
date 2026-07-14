"""
Phase 1 — FastAPI fundamentals

POST /chat accepts a message and returns an echo reply.
Loads settings from .env and allows the Next.js frontend via CORS.
"""

import os

from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

# Load backend/.env into environment variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


def get_model() -> ChatGroq:
    if not GROQ_API_KEY or GROQ_API_KEY.startswith("your_"):
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured in backend/.env",
        )
    return ChatGroq(
        api_key=GROQ_API_KEY,
        model=GROQ_MODEL,
        temperature=0.7,
    )


def build_messages(session_id: str, message: str) -> list:
    """System + prior turns + new human message."""
    history = chat_sessions.setdefault(session_id, [])
    return [
        SystemMessage(
            content="You are a helpful assistant. Answer clearly and briefly."
        ),
        *history,
        HumanMessage(content=message),
    ]


def remember(session_id: str, human: str, ai: str) -> None:
    history = chat_sessions.setdefault(session_id, [])
    history.append(HumanMessage(content=human))
    history.append(AIMessage(content=ai))
    # Keep last 20 messages so context does not grow forever
    chat_sessions[session_id] = history[-20:]


app = FastAPI(title="AI Chat Learning Backend")

# Allow Next.js (default :3000) to call this API from the browser
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


# In-memory chat history: session_id → list of messages
# Lost on server restart — OK for learning
chat_sessions: dict[str, list] = {}


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(default="default", min_length=1, max_length=64)


class ChatResponse(BaseModel):
    reply: str


@app.get("/")
def root():
    return {"message": "Hello from FastAPI! Open /docs to try the API."}


@app.get("/health")
def health():
    return {
        "status": "ok",
        # Never return the real API key — only whether it is set
        "groq_key_configured": bool(
            GROQ_API_KEY and not GROQ_API_KEY.startswith("your_")
        ),
        "groq_model": GROQ_MODEL,
    }


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        model = get_model()
        messages = build_messages(request.session_id, message)
        # model.invoke(messages) → AIMessage; .content is the text
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


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        model = get_model()
        messages = build_messages(request.session_id, message)
    except HTTPException:
        raise

    async def event_generator():
        parts: list[str] = []
        try:
            async for chunk in model.astream(messages):
                text = chunk.content if isinstance(chunk.content, str) else ""
                if text:
                    parts.append(text)
                    safe = text.replace("\n", "\\n")
                    yield f"data: {safe}\n\n"
            remember(request.session_id, message, "".join(parts))
            yield "data: [DONE]\n\n"
        except Exception as exc:
            yield f"data: [ERROR] {exc}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.delete("/chat/session/{session_id}")
def clear_session(session_id: str):
    chat_sessions.pop(session_id, None)
    return {"cleared": session_id}
