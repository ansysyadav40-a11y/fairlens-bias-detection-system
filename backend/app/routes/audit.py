from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import AuditReport
from app.tasks import run_audit_task

router = APIRouter()

@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    label_col: str = "income",
    protected_attr: str = "sex",
    db: Session = Depends(get_db)
):
    contents = await file.read()
    csv_text = contents.decode("utf-8")

    # Save a pending report to DB
    report = AuditReport(
        filename=file.filename,
        status="pending"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Fire async task
    task = run_audit_task.delay(report.id, csv_text, label_col, protected_attr)

    return {
        "report_id": report.id,
        "task_id": task.id,
        "status": "queued",
        "message": "Audit started. Poll /api/audit/status/{report_id} for results."
    }


@router.get("/status/{report_id}")
def get_audit_status(report_id: int, db: Session = Depends(get_db)):
    report = db.query(AuditReport).filter(AuditReport.id == report_id).first()
    if not report:
        return {"error": "Report not found"}
    return {
        "report_id": report.id,
        "filename": report.filename,
        "status": report.status,
        "fairness_score": report.fairness_score,
        "demographic_parity": report.demographic_parity,
        "disparate_impact": report.disparate_impact,
        "equalized_odds": report.equalized_odds,
        "verdict": report.summary,
        "created_at": str(report.created_at)
    }


@router.get("/history")
def get_audit_history(db: Session = Depends(get_db)):
    reports = db.query(AuditReport).order_by(AuditReport.created_at.desc()).limit(20).all()
    return {"audits": [
        {
            "id": r.id,
            "filename": r.filename,
            "status": r.status,
            "fairness_score": r.fairness_score,
            "created_at": str(r.created_at)
        } for r in reports
    ]}

import json

@router.get("/explain/{report_id}")
def get_explanation(report_id: int, db: Session = Depends(get_db)):
    report = db.query(AuditReport).filter(AuditReport.id == report_id).first()
    if not report:
        return {"error": "Report not found"}
    if report.status != "complete":
        return {"error": f"Report not ready yet. Status: {report.status}"}

    return {
        "report_id": report.id,
        "filename": report.filename,
        "fairness_score": report.fairness_score,
        "verdict": report.summary,
        "top_features": json.loads(report.top_features or "[]"),
        "proxy_features": json.loads(report.proxy_features or "[]"),
        "shap_chart_base64": report.shap_chart,
        "lime_chart_base64": report.lime_chart,
    }