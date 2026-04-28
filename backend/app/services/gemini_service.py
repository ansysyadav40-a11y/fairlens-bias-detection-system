"""
FairLens AI — Hybrid Analysis Engine (Bias Detection Sync + GitHub Optimized)

Hierarchy:
1. Google Gemini (Cloud)
2. Local Ollama (Local AI)
3. Rule-Based Engine (Guaranteed)
"""

from __future__ import annotations

import json
import re
import time
import random
import os
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings
from app.services.resume_analyzer import analyze_resume_text


# ---------------------------------------------------------------------------
# Configuration & Instructions
# ---------------------------------------------------------------------------

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
OLLAMA_URL = "http://127.0.0.1:11434"
OLLAMA_MODEL = "llama3.2:3b"

# Expert instructions for Gemini to ensure high-quality bias detection matching the UI
BIAS_SYSTEM_PROMPT = """You are an expert AI Career Strategist and Diversity & Inclusion Specialist.
Analyze the resume and find biased language. 

GENDER BIAS: Gendered pronouns (he/she), gendered titles (chairman, salesman).
UNNECESSARY PERSONAL INFO: Age-coded words (recent grad, 20 years exp), marital status, religion, nationality.
TONE ISSUES: Aggressive words (killer instinct, dominate), mother tongue references.

ALWAYS return valid JSON matching the specified structure.
"""


def _get_api_keys() -> list[str]:
    """Get list of API keys from env (comma-separated)."""
    raw = settings.GEMINI_API_KEY or ""
    return [k.strip() for k in raw.split(",") if k.strip()]


def _parse_json_response(text: str) -> dict | list:
    """Extract JSON from a response."""
    cleaned = re.sub(r"```(?:json)?\s*", "", text)
    cleaned = cleaned.strip().rstrip("`")
    try: return json.loads(cleaned)
    except: pass
    for pattern in [r"\{[\s\S]*\}", r"\[[\s\S]*\]"]:
        match = re.search(pattern, cleaned)
        if match:
            try: return json.loads(match.group(0))
            except: continue
    return {"error": "Failed to parse AI response", "raw": text[:500]}


# ---------------------------------------------------------------------------
# Provider: Google Gemini
# ---------------------------------------------------------------------------

def _call_gemini_with_rotation(prompt: str, system_instruction: str = BIAS_SYSTEM_PROMPT) -> str:
    """Call Gemini with key rotation."""
    keys = _get_api_keys()
    if not keys: raise ValueError("No GEMINI_API_KEY found in .env")
    
    random.shuffle(keys)
    last_exc = None
    
    for api_key in keys:
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2,
                )
            )
            return response.text
        except Exception as exc:
            last_exc = exc
            exc_str = str(exc).lower()
            if "429" in exc_str or "quota" in exc_str or "exhausted" in exc_str:
                print(f"Key exhausted: {api_key[:8]}... Trying next.")
                continue
            raise exc
            
    raise last_exc


# ---------------------------------------------------------------------------
# Provider: Local Ollama
# ---------------------------------------------------------------------------

def _call_ollama(prompt: str) -> str:
    """Call local Ollama."""
    import urllib.request
    import urllib.error
    
    payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "format": "json"}
    try:
        req = urllib.request.Request(
            f"{OLLAMA_URL}/api/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            raw = json.loads(response.read().decode("utf-8"))
            return raw.get("response", "")
    except Exception:
        raise RuntimeError("Ollama not reachable")


# ---------------------------------------------------------------------------
# Main Pipeline with Multi-Layer Fallback
# ---------------------------------------------------------------------------

def run_full_pipeline(resume_text: str) -> dict[str, Any]:
    """Runs analysis with Gemini -> Ollama -> Rule-Based fallback."""
    # Updated prompt to match the UI's expected keys: genderedWords, unnecessaryPersonalInfo, toneIssues
    prompt = f"""Analyze this resume and return JSON: {resume_text[:12000]}
Strict JSON Structure:
{{
  "analysis": {{
    "score": int,
    "strengths": ["list of strings"],
    "weaknesses": ["list of strings"],
    "atsIssues": ["list of strings"],
    "biasDetection": {{
      "genderedWords": ["list of findings"],
      "unnecessaryPersonalInfo": ["list of findings"],
      "toneIssues": ["list of findings"]
    }},
    "summary": "string",
    "detectedSkills": ["list of strings"],
    "sectionAnalysis": {{ "summary": true, "experience": true, "education": true, "skills": true, "projects": true }}
  }},
  "improvements": [{{ "before": "string", "after": "string", "reason": "string" }}],
  "rewrites": {{ "summary": "string", "experience": "string", "projects": "string" }},
  "scoreExplanation": {{ "explanation": "string", "topReasons": ["string"], "quickWins": ["string"], "scoreBreakdown": {{ "atsReadiness": 20, "skillCoverage": 15, "quantifiableImpact": 18, "sectionCompleteness": 22 }} }}
}}"""

    # 1. Try Gemini
    try:
        raw = _call_gemini_with_rotation(prompt)
        result = _parse_json_response(raw)
        result["_source"] = f"gemini ({GEMINI_MODEL})"
        return result
    except Exception as gem_exc:
        print(f"Gemini ({GEMINI_MODEL}) failed: {gem_exc}. Trying Ollama...")
        
        # 2. Try Ollama
        try:
            raw = _call_ollama(prompt)
            result = _parse_json_response(raw)
            result["_source"] = "ollama-local"
            return result
        except Exception as oll_exc:
            print(f"Ollama failed: {oll_exc}. Using Rule-Based Fallback.")
            
            # 3. Rule-Based Fallback
            rule_analysis = analyze_resume_text(resume_text, "resume.pdf")
            
            # Map rule-based bias to UI keys
            bias_findings = rule_analysis.get("bias_findings", [])
            gendered = [f["phrase"] for f in bias_findings if "gender" in f["issue"].lower()]
            personal = [f["phrase"] for f in bias_findings if "age" in f["issue"].lower() or "nationality" in f["issue"].lower()]
            tone = [f["phrase"] for f in bias_findings if "tone" in f["issue"].lower() or "linguistic" in f["issue"].lower()]

            # Fix score format for frontend compatibility (dict -> int)
            final_score = 0
            if isinstance(rule_analysis.get("score"), dict):
                final_score = rule_analysis["score"].get("overall", 0)
            else:
                final_score = rule_analysis.get("score", 0)
                
            return {
                "analysis": {
                    "score": final_score,
                    "strengths": rule_analysis.get("strengths", []),
                    "weaknesses": rule_analysis.get("recommendations", []),
                    "atsIssues": ["Missing Quantifiable Achievements"] if "Quantify" in str(rule_analysis.get("recommendations")) else [],
                    "biasDetection": {
                        "genderedWords": gendered,
                        "unnecessaryPersonalInfo": personal,
                        "toneIssues": tone
                    },
                    "summary": rule_analysis.get("summary", ""),
                    "detectedSkills": rule_analysis.get("skills", []),
                    "sectionAnalysis": rule_analysis.get("sections", {})
                },
                "improvements": [{"before": i, "after": "Try adding more detail here.", "reason": "Basic suggestion"} for i in rule_analysis.get("recommendations", [])],
                "rewrites": {"summary": rule_analysis.get("summary", ""), "experience": "Cloud AI quota reached.", "projects": ""},
                "scoreExplanation": {"explanation": "Quota reached. Showing basic analysis.", "topReasons": ["API Quota Reached"], "quickWins": ["Wait 1 minute"], "scoreBreakdown": {"atsReadiness": 15, "skillCoverage": 10, "quantifiableImpact": 10, "sectionCompleteness": 15}},
                "_source": "rule-based-fallback",
                "_warning": "Showing rule-based results due to AI quota."
            }


# ---------------------------------------------------------------------------
# Compatibility Wrappers
# ---------------------------------------------------------------------------

def check_gemini_status() -> dict[str, Any]:
    keys = _get_api_keys()
    try:
        _call_gemini_with_rotation("ok")
        return {"available": True, "model": GEMINI_MODEL, "message": f"Gemini {GEMINI_MODEL} ready ({len(keys)} keys)"}
    except Exception as exc:
        return {"available": False, "model": GEMINI_MODEL, "message": f"Gemini {GEMINI_MODEL} Busy: {exc}"}

def analyze_resume(resume_text: str) -> dict[str, Any]:
    return run_full_pipeline(resume_text).get("analysis", {})

def suggest_improvements(resume_text: str, weaknesses: list[str]) -> list[dict[str, str]]:
    return run_full_pipeline(resume_text).get("improvements", [])

def rewrite_resume_sections(resume_text: str) -> dict[str, Any]:
    return run_full_pipeline(resume_text).get("rewrites", {})

def explain_score(resume_text: str, score: int) -> dict[str, Any]:
    return run_full_pipeline(resume_text).get("scoreExplanation", {})

def chat_with_coach(resume_text: str, analysis: dict | None, user_message: str, chat_history: list[dict] | None = None) -> str:
    prompt = f"Resume: {resume_text[:4000]}\nUser: {user_message}"
    try: return _call_gemini_with_rotation(prompt)
    except: return "AI Coach quota reached. Please try again later."

def match_job(resume_text: str, job_description: str) -> dict[str, Any]:
    prompt = f"Match resume to job. Resume: {resume_text[:4000]} Job: {job_description[:2000]}"
    try: return _parse_json_response(_call_gemini_with_rotation(prompt))
    except: return {"error": "Quota reached", "matchPercentage": 0}

def fix_my_resume(resume_text: str) -> dict[str, Any]:
    prompt = f"Premium rewrite. Resume: {resume_text[:8000]}"
    try: return _parse_json_response(_call_gemini_with_rotation(prompt))
    except: return {"error": "Quota reached", "rewrittenResume": ""}
