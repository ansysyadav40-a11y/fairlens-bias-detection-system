import pandas as pd
import io, json
from app.worker import celery_app
from app.services.bias_engine import run_bias_audit
from app.services.explainer import run_shap_explanation, run_lime_explanation
from app.database import SessionLocal
from app.models.models import AuditReport

@celery_app.task(bind=True)
def run_audit_task(self, report_id: int, csv_content: str,
                   label_col: str, protected_attr: str):
    db = SessionLocal()
    try:
        report = db.query(AuditReport).filter(AuditReport.id == report_id).first()
        report.status = "processing"
        db.commit()

        df = pd.read_csv(io.StringIO(csv_content))

        # ── Step 1: Fairness metrics ──────────────────────────────────────
        audit_result = run_bias_audit(df, label_col, protected_attr)

        # ── Step 2: SHAP explanation ──────────────────────────────────────
        shap_result = run_shap_explanation(df, label_col, protected_attr)

        # ── Step 3: LIME on first instance ────────────────────────────────
        lime_result = run_lime_explanation(df, label_col, protected_attr, instance_index=0)

        # ── Save everything ───────────────────────────────────────────────
        report.fairness_score     = audit_result["fairness_score"]
        report.demographic_parity = audit_result["metrics"]["demographic_parity_diff"]
        report.disparate_impact   = audit_result["metrics"]["disparate_impact"]
        report.equalized_odds     = audit_result["metrics"]["equalized_odds_diff"]
        report.summary            = audit_result["verdict"]
        report.shap_chart         = shap_result["shap_chart_base64"]
        report.lime_chart         = lime_result["lime_chart_base64"]
        report.top_features       = json.dumps(shap_result["top_10_features"])
        report.proxy_features     = json.dumps(shap_result["potential_proxy_features"])
        report.status             = "complete"
        db.commit()

        return {**audit_result, "shap": shap_result, "lime": lime_result}

    except Exception as e:
        report = db.query(AuditReport).filter(AuditReport.id == report_id).first()
        report.status  = "failed"
        report.summary = str(e)
        db.commit()
        raise
    finally:
        db.close()