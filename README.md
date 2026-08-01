# Ask My Notes

A private RAG (Retrieval-Augmented Generation) tool that answers questions from your own notes — with every answer grounded in and cited back to the exact source chunk it came from.

## What it does

Upload your notes (PDFs, Markdown, text files), ask a question, and get an answer generated strictly from your own content — not the model's general knowledge. Every response includes citation chips pointing back to the source document and chunk it was drawn from, so you can verify accuracy instead of taking the answer on faith.

If the notes don't contain the answer, the system says so explicitly rather than guessing.

## Architecture

```
Notes (PDF/MD/TXT)
↓
Chunking (chunk_docs.py)
↓
Embedding (embed_chunks.py) → FAISS vector index
↓
Query → Semantic Retrieval (retrieve.py) → top-k relevant chunks
↓
Grounded Generation (answer.py) → Groq LLM (Llama 3.3)
↓
Answer + Source Citations
```

**Backend:** FastAPI (`main.py`) exposes the pipeline as `/api/ask` and `/api/upload`, so new notes can be added and indexed without restarting the app.

**Frontend:** Next.js (TypeScript, Tailwind CSS, Framer Motion) — a chat-style interface with a sidebar for uploaded notes, persistent input bar, and citation chips under every answer.

## Tech Stack

- **Backend:** Python, FastAPI, FAISS (vector search), sentence-transformers (embeddings), Groq API (LLM inference), pypdf (PDF parsing)
- **Frontend:** Next.js, TypeScript, Tailwind CSS, Framer Motion
- **LLM:** Llama 3.3 70B via Groq

## Design principles

- **Grounded, not generative** — the system prompt strictly constrains the LLM to answer only from retrieved context, with an explicit fallback ("I don't know based on the provided notes") when the notes don't cover the question.
- **Always cited** — every answer links back to its source chunk, so accuracy is verifiable rather than assumed.
- **Private by default** — notes are processed and indexed locally/server-side per session; not used to train any model.

## Known limitations

- Scanned/image-only PDFs (no digital text layer) aren't currently supported — OCR is a possible future addition.
- No user authentication yet — this is a single-session/demo deployment, not built for multi-user data isolation.

## Local setup

```bash
# Backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd ask-my-notes
npm install
npm run dev
```

Requires a `.env` file with `GROQ_API_KEY=your_key_here` (and optionally `HF_TOKEN` for embedding model downloads).

## Live demo

[Coming soon]
