"""
Phase 1 — FastAPI fundamentals

POST /chat accepts a message and returns an echo reply.
Loads settings from .env and allows the Next.js frontend via CORS.
"""

import os
import asyncio

from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Load backend/.env into environment variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

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


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


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
        # Extra check beyond Pydantic (e.g. message is only spaces)
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    return ChatResponse(reply=f"You said: {message}")


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Fake token stream — practice SSE before real LLM streaming."""
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    full_reply = f"You said: {message}"

    async def event_generator():
        # Send one word at a time (simulates LLM tokens)
        for word in full_reply.split(" "):
            chunk = word + " "
            # SSE format: each event is "data: ...\n\n"
            yield f"data: {chunk}\n\n"
            await asyncio.sleep(0.15)  # slow enough to see streaming
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )
