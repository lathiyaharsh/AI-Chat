# Learning backend (FastAPI + LangChain + LlamaIndex)

## Setup (same as Phase 0)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env               # then put your real GROQ_API_KEY in .env
```

## Run

```bash
source .venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- API: http://127.0.0.1:8000  
- Docs: http://127.0.0.1:8000/docs  
- Health: http://127.0.0.1:8000/health  

Do **not** commit `.env` or `.venv/` (they are gitignored).
