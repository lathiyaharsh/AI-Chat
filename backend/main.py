"""
Phase 0 — Hello FastAPI

This is the smallest useful API:
- GET /health  → proves the server is running
- GET /        → simple welcome message

Later phases will add /chat (LangChain) and /rag (LlamaIndex).
"""

from fastapi import FastAPI

# Create the app object. Uvicorn will look for "app" in this file.
app = FastAPI(title="AI Chat Learning Backend")


@app.get("/")
def root():
    """Browser-friendly welcome message."""
    return {"message": "Hello from FastAPI! Open /docs to try the API."}


@app.get("/health")
def health():
    """Simple health check used by you (and later by monitoring)."""
    return {"status": "ok"}
