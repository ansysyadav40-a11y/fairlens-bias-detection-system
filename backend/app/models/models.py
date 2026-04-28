from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditReport(Base):
    __tablename__ = "audit_reports"
    shap_chart     = Column(Text, nullable=True)

    lime_chart     = Column(Text, nullable=True)
    top_features   = Column(Text, nullable=True)
    proxy_features = Column(Text, nullable=True)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    filename = Column(String)
    fairness_score = Column(Float, nullable=True)
    demographic_parity = Column(Float, nullable=True)
    disparate_impact = Column(Float, nullable=True)
    equalized_odds = Column(Float, nullable=True)
    summary = Column(Text, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

