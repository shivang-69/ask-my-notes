import os
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from answer import generate_answer
from embed_chunks import build_vector_db

app = FastAPI(
    title="RAG Note Search API Backend",
    description="Provides semantic lookup and LLM-grounded question-answering over your documents.",
    version="1.0.0"
)

# Configure CORS (Cross-Origin Resource Sharing)
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ask-my-notes-nav4.vercel.app",
]

env_origin = os.getenv("ALLOWED_ORIGIN")
if env_origin and env_origin not in allowed_origins:
    allowed_origins.append(env_origin)

# Fallback to wildcard if ALLOWED_ORIGIN is not explicitly set
if not env_origin:
    allowed_origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOCS_DIR = "docs"
ALLOWED_EXTENSIONS = {".txt", ".pdf", ".md"}

# Pydantic Schemas
class AskRequest(BaseModel):
    query: str
    k: int = 3

class SourceDetail(BaseModel):
    filename: str
    chunk_index: int
    text: str
    distance: float

class AskResponse(BaseModel):
    answer: str
    sources: list[SourceDetail]

@app.post("/api/ask", response_model=AskResponse)
def ask_question(request: AskRequest):
    """
    POST endpoint to retrieve context chunks and generate a grounded response
    using Groq LLM inference.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")

    try:
        answer, sources = generate_answer(request.query, k=request.k)
        
        formatted_sources = [
            SourceDetail(
                filename=src["filename"],
                chunk_index=src["chunk_index"],
                text=src["text"],
                distance=src["distance"]
            )
            for src in sources
        ]
        
        return AskResponse(
            answer=answer,
            sources=formatted_sources
        )
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except FileNotFoundError as fnfe:
        raise HTTPException(status_code=500, detail=str(fnfe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.get("/api/files")
def list_files():
    """
    GET endpoint to list all uploaded documents in the docs/ folder.
    """
    if not os.path.exists(DOCS_DIR):
        return {"files": []}
        
    files_info = []
    for fname in os.listdir(DOCS_DIR):
        ext = os.path.splitext(fname)[1].lower()
        if ext in ALLOWED_EXTENSIONS:
            fpath = os.path.join(DOCS_DIR, fname)
            stat = os.stat(fpath)
            files_info.append({
                "filename": fname,
                "size_bytes": stat.st_size,
                "ext": ext
            })
            
    return {"files": files_info}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    POST endpoint to upload a document (.txt, .pdf, .md) to docs/,
    chunk it, embed it, and rebuild the FAISS vector index automatically.
    """
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file extension '{ext}'. Only .txt, .pdf, and .md files are supported."
        )

    os.makedirs(DOCS_DIR, exist_ok=True)
    file_path = os.path.join(DOCS_DIR, file.filename)

    try:
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Re-run embedding & indexing logic synchronously
        result = build_vector_db()
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Re-indexing failed."))

        return {
            "message": f"File '{file.filename}' uploaded and indexed successfully.",
            "filename": file.filename,
            "indexing_summary": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process upload: {str(e)}")

@app.get("/health")
def health_check():
    """Health check endpoint to verify backend status."""
    return {"status": "healthy", "service": "RAG-backend"}
