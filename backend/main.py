"""
Phase 1 — FastAPI fundamentals

POST /chat accepts a message and returns an echo reply.
No LangChain yet — that comes in Phase 2.
"""

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="AI Chat Learning Backend")


# --- Request / response models (Pydantic) ---

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    # Field(...) means required. min/max = automatic validation.


class ChatResponse(BaseModel):
    reply: str


@app.get("/")
def root():
    return {"message": "Hello from FastAPI! Open /docs to try the API."}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """Echo chat — learns the API shape before we plug in an LLM."""
    return ChatResponse(reply=f"You said: {request.message}")