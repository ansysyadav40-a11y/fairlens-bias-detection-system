from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.services.resume_analyzer import OLLAMA_MODEL, OLLAMA_URL, analyze_resume_file, extract_resume_text
from app.services.gemini_service import (
    run_full_pipeline,
    chat_with_coach,
    match_job,
    fix_my_resume,
    check_gemini_status,
    analyze_resume as gemini_analyze,
)


BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_RESUME_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}

app = FastAPI(title="FairLens AI", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


try:
    from app.routes import audit as audit_router

    app.include_router(audit_router.router, prefix="/api/audit", tags=["audit"])
    AUDIT_ROUTER_ENABLED = True
except Exception as exc:  # pragma: no cover - defensive bootstrap for local-only resume mode
    AUDIT_ROUTER_ENABLED = False
    AUDIT_ROUTER_ERROR = str(exc)


# ---------- Pydantic Models ----------

class ChatRequest(BaseModel):
    resume_text: str
    analysis: dict | None = None
    message: str
    chat_history: list[dict] | None = None


class JobMatchRequest(BaseModel):
    resume_text: str
    job_description: str


class FixResumeRequest(BaseModel):
    resume_text: str


# ---------- Root ----------

@app.get("/")
def root() -> dict[str, object]:
    gemini = check_gemini_status()
    payload: dict[str, object] = {
        "message": "FairLens AI running (Gemini-powered)",
        "version": "3.0.0",
        "resume_formats": sorted(ext.lstrip(".") for ext in ALLOWED_RESUME_EXTENSIONS),
        "gemini": {
            "available": gemini["available"],
            "model": gemini["model"],
        },
        "ollama": {
            "url": OLLAMA_URL,
            "model": OLLAMA_MODEL,
        },
    }
    if AUDIT_ROUTER_ENABLED:
        payload["audit_api"] = "enabled"
    else:
        payload["audit_api"] = {
            "enabled": False,
            "reason": AUDIT_ROUTER_ERROR if "AUDIT_ROUTER_ERROR" in dir() else "not loaded",
        }
    return payload


# ---------- Gemini Status ----------

@app.get("/api/gemini/status")
def gemini_status() -> dict[str, object]:
    return check_gemini_status()


# ---------- Ollama Status (kept for backward compat) ----------

@app.get("/api/ollama/status")
def ollama_status() -> dict[str, object]:
    from urllib import error, request
    import json

    try:
        with request.urlopen(f"{OLLAMA_URL.rstrip('/')}/api/tags", timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
        models = [model.get("name") for model in data.get("models", [])]
        return {
            "available": True,
            "url": OLLAMA_URL,
            "model": OLLAMA_MODEL,
            "installed_models": models,
        }
    except (error.URLError, TimeoutError, OSError, ValueError) as exc:
        return {
            "available": False,
            "url": OLLAMA_URL,
            "model": OLLAMA_MODEL,
            "message": f"Ollama not reachable: {exc}",
        }


# ---------- Resume Analysis (Gemini Pipeline) ----------

def _save_upload(file: UploadFile) -> tuple[Path, str, dict, str]:
    """Save uploaded file and return (path, extracted_text)."""
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{extension or 'unknown'}'. Upload PDF, DOCX, TXT, or MD.",
        )

    safe_name = Path(file.filename).name if file.filename else f"resume{extension}"
    destination = UPLOAD_DIR / safe_name

    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    text, meta = extract_resume_text(destination)
    return destination, text, meta, safe_name


@app.post("/api/resume/analyze")
@app.post("/analyze")
async def analyze_resume(file: UploadFile = File(...)) -> dict[str, object]:
    destination, text, extraction_meta, safe_name = _save_upload(file)

    if not text.strip():
        raise HTTPException(status_code=400, detail="No readable text extracted from the file.")

    try:
        # Run the full Gemini pipeline
        pipeline_result = run_full_pipeline(text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gemini pipeline failed: {exc}") from exc

    # Also run legacy rule-based analysis for backward compatibility
    try:
        from app.services.resume_analyzer import analyze_resume_text
        legacy = analyze_resume_text(text, safe_name)
    except Exception:
        legacy = None

    return {
        "ok": True,
        "filename": safe_name,
        "extraction": extraction_meta,
        "resume_text": text[:15000],
        "pipeline": pipeline_result,
        "legacy_analysis": legacy,
    }


# ---------- Chat ----------

@app.post("/api/resume/chat")
async def resume_chat(req: ChatRequest) -> dict[str, object]:
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        response = chat_with_coach(
            resume_text=req.resume_text,
            analysis=req.analysis,
            user_message=req.message,
            chat_history=req.chat_history,
        )
        return {"ok": True, "response": response}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat failed: {exc}") from exc


# ---------- Job Matching ----------

@app.post("/api/resume/job-match")
async def job_match(req: JobMatchRequest) -> dict[str, object]:
    if not req.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty.")

    try:
        result = match_job(req.resume_text, req.job_description)
        return {"ok": True, "result": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Job matching failed: {exc}") from exc


# ---------- Fix My Resume ----------

@app.post("/api/resume/fix")
async def fix_resume(req: FixResumeRequest) -> dict[str, object]:
    if not req.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty.")

    try:
        result = fix_my_resume(req.resume_text)
        return {"ok": True, "result": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Fix resume failed: {exc}") from exc
