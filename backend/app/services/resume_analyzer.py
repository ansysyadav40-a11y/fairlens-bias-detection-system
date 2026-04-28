from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any
from urllib import error, request

from docx import Document
from pypdf import PdfReader


OLLAMA_URL = "http://127.0.0.1:11434"
OLLAMA_MODEL = "llama3.2:3b"
MAX_TEXT_CHARS = 16000

SKILL_KEYWORDS = {
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "node.js",
    "node",
    "fastapi",
    "django",
    "flask",
    "sql",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "git",
    "github",
    "machine learning",
    "deep learning",
    "data analysis",
    "pandas",
    "numpy",
    "scikit-learn",
    "tensorflow",
    "pytorch",
    "power bi",
    "tableau",
    "excel",
    "linux",
    "rest api",
    "graphql",
    "html",
    "css",
    "tailwind",
    "figma",
    "c++",
    "c#",
}

SECTION_PATTERNS = {
    "summary": r"\b(summary|profile|objective|about)\b",
    "experience": r"\b(experience|employment|work history|professional experience)\b",
    "education": r"\b(education|academic background|qualification)\b",
    "skills": r"\b(skills|technical skills|core competencies|stack)\b",
    "projects": r"\b(projects|personal projects|key projects)\b",
    "certifications": r"\b(certifications|licenses|awards)\b",
}

BIAS_RULES = [
    {
        "pattern": r"\b(young|youthful|recent graduate)\b",
        "issue": "Possible age-coded language",
        "replacement": "Use role-relevant capability or career stage details instead.",
        "severity": "medium",
    },
    {
        "pattern": r"\b(aggressive|killer instinct|dominate)\b",
        "issue": "Potentially exclusionary tone",
        "replacement": "Use collaborative, outcome-focused language.",
        "severity": "low",
    },
    {
        "pattern": r"\b(he|she|his|her)\b",
        "issue": "Gendered wording detected",
        "replacement": "Prefer neutral phrasing where possible.",
        "severity": "medium",
    },
    {
        "pattern": r"\b(native english|mother tongue)\b",
        "issue": "Nationality or linguistic bias risk",
        "replacement": "State proficiency level instead.",
        "severity": "high",
    },
    {
        "pattern": r"\b(strong man|salesman|chairman)\b",
        "issue": "Gender-specific job wording",
        "replacement": "Use gender-neutral job titles.",
        "severity": "high",
    },
]


def analyze_resume_file(
    file_path: str,
    filename: str | None = None,
    ollama_url: str = OLLAMA_URL,
    ollama_model: str = OLLAMA_MODEL,
) -> dict[str, Any]:
    path = Path(file_path)
    extracted_text, extraction_meta = extract_resume_text(path)
    analysis = analyze_resume_text(extracted_text, filename or path.name)

    ollama_result = generate_ollama_suggestions(
        text=extracted_text,
        base_analysis=analysis,
        ollama_url=ollama_url,
        ollama_model=ollama_model,
    )

    return {
        "filename": filename or path.name,
        "file_type": path.suffix.lower().lstrip("."),
        "extraction": extraction_meta,
        "resume_analysis": analysis,
        "ai_suggestions": ollama_result,
    }


def extract_resume_text(path: Path) -> tuple[str, dict[str, Any]]:
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        text = _read_pdf(path)
        extractor = "pypdf"
    elif suffix == ".docx":
        text = _read_docx(path)
        extractor = "python-docx"
    elif suffix in {".txt", ".md"}:
        text = path.read_text(encoding="utf-8", errors="ignore")
        extractor = "text"
    else:
        raise ValueError("Unsupported resume format. Please upload PDF, DOCX, TXT, or MD.")

    normalized_text = normalize_whitespace(text)
    word_count = len(normalized_text.split())
    has_text = bool(normalized_text.strip())

    warnings: list[str] = []
    if not has_text:
        warnings.append(
            "No selectable text was extracted. If this is a scanned-image PDF, OCR is required."
        )
    elif word_count < 80:
        warnings.append(
            "Only a small amount of text was extracted. The document may be image-based or heavily formatted."
        )

    return normalized_text, {
        "extractor": extractor,
        "text_found": has_text,
        "characters": len(normalized_text),
        "word_count": word_count,
        "warnings": warnings,
    }


def analyze_resume_text(text: str, filename: str) -> dict[str, Any]:
    preview = text[:1200]
    contacts = extract_contact_info(text)
    skills = extract_skills(text)
    sections = detect_sections(text)
    bias_findings = detect_bias_language(text)
    strengths = infer_strengths(text, skills, sections)
    improvements = build_rule_based_recommendations(text, contacts, skills, sections, bias_findings)
    score = score_resume(text, contacts, skills, sections, bias_findings)

    return {
        "document_name": filename,
        "summary": summarize_resume(text, skills, sections),
        "score": score,
        "contacts": contacts,
        "skills": skills,
        "sections": sections,
        "bias_findings": bias_findings,
        "strengths": strengths,
        "recommendations": improvements,
        "preview": preview,
    }


def extract_contact_info(text: str) -> dict[str, Any]:
    email = _find_first(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", text)
    phone = _find_first(r"(?:\+?\d[\d\-\s\(\)]{8,}\d)", text)
    linkedin = _find_first(r"(https?://)?(www\.)?linkedin\.com/[^\s]+", text)
    github = _find_first(r"(https?://)?(www\.)?github\.com/[^\s]+", text)

    return {
        "email": email,
        "phone": phone,
        "linkedin": linkedin,
        "github": github,
        "completeness": round(sum(bool(v) for v in [email, phone, linkedin, github]) / 4 * 100, 1),
    }


def extract_skills(text: str) -> list[str]:
    lowered = text.lower()
    found = [skill for skill in sorted(SKILL_KEYWORDS) if skill in lowered]
    return found[:20]


def detect_sections(text: str) -> dict[str, bool]:
    lowered = text.lower()
    return {name: bool(re.search(pattern, lowered, flags=re.IGNORECASE)) for name, pattern in SECTION_PATTERNS.items()}


def detect_bias_language(text: str) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    for rule in BIAS_RULES:
        match = re.search(rule["pattern"], text, flags=re.IGNORECASE)
        if match:
            findings.append(
                {
                    "issue": rule["issue"],
                    "phrase": match.group(0),
                    "severity": rule["severity"],
                    "suggestion": rule["replacement"],
                }
            )
    return findings


def infer_strengths(text: str, skills: list[str], sections: dict[str, bool]) -> list[str]:
    strengths: list[str] = []
    if len(skills) >= 8:
        strengths.append("Strong technical keyword coverage across multiple tools and platforms.")
    if sections.get("projects"):
        strengths.append("Projects section present, which helps prove hands-on ability.")
    if sections.get("experience"):
        strengths.append("Work experience section detected, supporting recruiter readability.")
    if re.search(r"\b(improved|reduced|increased|built|delivered|launched)\b", text, flags=re.IGNORECASE):
        strengths.append("Achievement-oriented verbs detected.")
    if re.search(r"\b\d+%|\b\d+\+?\s+(users|clients|projects|teams|features)\b", text, flags=re.IGNORECASE):
        strengths.append("Quantified impact appears in the resume.")
    return strengths[:5]


def build_rule_based_recommendations(
    text: str,
    contacts: dict[str, Any],
    skills: list[str],
    sections: dict[str, bool],
    bias_findings: list[dict[str, str]],
) -> list[str]:
    recommendations: list[str] = []

    if not contacts["email"] or not contacts["phone"]:
        recommendations.append("Add both an email address and phone number near the header for recruiter accessibility.")
    if not sections.get("summary"):
        recommendations.append("Add a short professional summary tailored to the target role.")
    if not sections.get("skills"):
        recommendations.append("Include a dedicated skills section so ATS systems can parse your stack reliably.")
    if not sections.get("projects") and len(skills) >= 4:
        recommendations.append("Add 1 to 3 projects with outcomes, tech stack, and measurable impact.")
    if not re.search(r"\b\d+%|\b\d+\+?\b", text):
        recommendations.append("Quantify outcomes with percentages, counts, revenue, or time saved.")
    if len(skills) < 5:
        recommendations.append("Broaden the visible skill coverage with the exact tools used in your experience.")
    if bias_findings:
        recommendations.append("Replace potentially biased or exclusionary phrases with neutral, job-relevant wording.")

    return recommendations[:6]


def score_resume(
    text: str,
    contacts: dict[str, Any],
    skills: list[str],
    sections: dict[str, bool],
    bias_findings: list[dict[str, str]],
) -> dict[str, Any]:
    section_score = sum(sections.values()) / max(len(sections), 1)
    contact_score = contacts["completeness"] / 100
    skills_score = min(len(skills) / 10, 1)
    quant_score = 1 if re.search(r"\b\d+%|\b\d+\+?\b", text) else 0.4
    bias_penalty = min(len(bias_findings) * 0.08, 0.24)

    raw_score = (0.28 * section_score) + (0.22 * contact_score) + (0.25 * skills_score) + (0.25 * quant_score)
    final_score = max(0, min(100, round((raw_score - bias_penalty) * 100, 1)))

    if final_score >= 85:
        grade = "A"
    elif final_score >= 72:
        grade = "B"
    elif final_score >= 60:
        grade = "C"
    else:
        grade = "D"

    return {
        "overall": final_score,
        "grade": grade,
        "ats_readiness": round((section_score * 0.5 + skills_score * 0.5) * 100, 1),
        "bias_risk": "high" if len(bias_findings) >= 2 else "medium" if bias_findings else "low",
    }


def summarize_resume(text: str, skills: list[str], sections: dict[str, bool]) -> str:
    if not text.strip():
        return "No readable resume text was extracted from the uploaded file."

    section_names = [name for name, present in sections.items() if present]
    skills_preview = ", ".join(skills[:5]) if skills else "limited explicit technical keywords"
    section_preview = ", ".join(section_names[:4]) if section_names else "few clearly labeled sections"
    return (
        f"This resume shows {skills_preview} and includes {section_preview}. "
        "The analysis below focuses on ATS readability, potentially biased wording, and improvement opportunities."
    )


def generate_ollama_suggestions(
    text: str,
    base_analysis: dict[str, Any],
    ollama_url: str,
    ollama_model: str,
) -> dict[str, Any]:
    if not text.strip():
        return {
            "enabled": False,
            "source": "rule-based",
            "status": "skipped",
            "message": "Ollama suggestions were skipped because no readable text was extracted.",
            "suggestions": [],
        }

    prompt = build_ollama_prompt(text, base_analysis)
    payload = {
        "model": ollama_model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
    }

    try:
        req = request.Request(
            f"{ollama_url.rstrip('/')}/api/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=25) as response:
            raw = json.loads(response.read().decode("utf-8"))
        parsed = json.loads(raw.get("response", "{}"))
        return {
            "enabled": True,
            "source": "ollama",
            "status": "ready",
            "model": ollama_model,
            "message": parsed.get("headline", "Local Ollama suggestions generated."),
            "suggestions": parsed.get("top_fixes", [])[:5],
            "rewrites": parsed.get("rewrites", [])[:3],
        }
    except (error.URLError, TimeoutError, json.JSONDecodeError, OSError, ValueError) as exc:
        return {
            "enabled": False,
            "source": "rule-based",
            "status": "fallback",
            "model": ollama_model,
            "message": f"Ollama is optional and was not available: {exc}",
            "suggestions": base_analysis.get("recommendations", [])[:5],
            "rewrites": [],
        }


def build_ollama_prompt(text: str, base_analysis: dict[str, Any]) -> str:
    excerpt = text[:MAX_TEXT_CHARS]
    recommendations = "\n".join(f"- {item}" for item in base_analysis.get("recommendations", []))
    findings = "\n".join(
        f"- {item['issue']}: {item['phrase']} -> {item['suggestion']}"
        for item in base_analysis.get("bias_findings", [])
    )
    return f"""
You are a resume reviewer helping improve ATS quality and reduce biased wording.
Return strict JSON with keys: headline, top_fixes, rewrites.

Current score: {base_analysis.get("score", {}).get("overall")}
Rule-based recommendations:
{recommendations or "- None"}

Bias findings:
{findings or "- None"}

Resume text:
{excerpt}
""".strip()


def _read_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    page_text: list[str] = []
    for page in reader.pages:
        try:
            page_text.append(page.extract_text() or "")
        except Exception:
            page_text.append("")
    return "\n".join(page_text)


def _read_docx(path: Path) -> str:
    document = Document(str(path))
    return "\n".join(paragraph.text for paragraph in document.paragraphs)


def _find_first(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, flags=re.IGNORECASE)
    return match.group(0).strip() if match else None


def normalize_whitespace(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
