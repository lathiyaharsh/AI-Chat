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
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Load backend/.env into environment variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

def build_chat_chain():
    if not GROQ_API_KEY or GROQ_API_KEY.startswith("your_"):
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured in backend/.env",
        )

    model = ChatGroq(
        api_key=GROQ_API_KEY,
        model=GROQ_MODEL,
        temperature=0.7,
    )

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a helpful assistant. Answer clearly and briefly.",
            ),
            ("human", "{message}"),
        ]
    )

    # LCEL: prompt fills template → model generates → parser returns a string
    return prompt | model | StrOutputParser()

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
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        chain = build_chat_chain()
        reply = chain.invoke({"message": message})
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc

    return ChatResponse(reply=reply)

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
