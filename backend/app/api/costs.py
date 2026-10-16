from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models import CostRecord, CostAttribution, Student, Admin
from backend.app.schemas import CostRecordResponse, CostAttributionResponse
from backend.app.auth import get_current_admin

router = APIRouter(prefix="/costs", tags=["Cost & Attribution Records"])

@router.get("/records", response_model=List[CostRecordResponse])
def list_cost_records(
    service_name: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    query = db.query(CostRecord)
    if service_name:
        query = query.filter(CostRecord.service_name.ilike(f"%{service_name}%"))

    records = query.order_by(CostRecord.billing_period_start.desc()).limit(limit).all()
    return [
        CostRecordResponse(
            id=r.id,
            billing_period_start=r.billing_period_start,
            billing_period_end=r.billing_period_end,
            service_name=r.service_name,
            unblended_cost=float(r.unblended_cost),
            record_source=r.record_source,
            is_demo=r.is_demo
        ) for r in records
    ]

@router.get("/attributions", response_model=List[CostAttributionResponse])
def list_cost_attributions(
    attribution_tier: Optional[str] = None, # direct, estimated, unallocated
    student_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    query = db.query(CostAttribution)
    if attribution_tier:
        query = query.filter(CostAttribution.attribution_tier == attribution_tier.lower())
    if student_id:
        query = query.filter(CostAttribution.student_id == student_id)

    attributions = query.order_by(CostAttribution.billing_date.desc()).limit(limit).all()
    result = []
    for ca in attributions:
        s_name = None
        if ca.student_id:
            st = db.query(Student).filter(Student.id == ca.student_id).first()
            if st:
                s_name = st.full_name

        result.append(CostAttributionResponse(
            id=ca.id,
            student_id=ca.student_id,
            student_name=s_name,
            resource_id=ca.resource_id,
            attributed_amount=float(ca.attributed_amount),
            attribution_tier=ca.attribution_tier,
            confidence_score=float(ca.confidence_score),
            billing_date=ca.billing_date,
            notes=ca.notes,
            is_demo=ca.is_demo
        ))

    return result
