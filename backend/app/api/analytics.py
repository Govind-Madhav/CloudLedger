from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from decimal import Decimal
from backend.app.database import get_db
from backend.app.models import (
    CostAttribution, CostRecord, Student, AWSResource, Alert, Admin
)
from backend.app.schemas import (
    DashboardAnalyticsResponse, OverviewKPIs, DailyCostPoint, 
    ServiceBreakdownPoint
)
from backend.app.auth import get_current_admin
from backend.app.config import settings

router = APIRouter(prefix="/analytics", tags=["Analytics & KPIs"])

@router.get("/overview", response_model=DashboardAnalyticsResponse)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    # Total costs and breakdown by attribution tier
    attributions = db.query(
        CostAttribution.attribution_tier,
        func.sum(CostAttribution.attributed_amount)
    ).group_by(CostAttribution.attribution_tier).all()

    tier_sums = {tier: float(amount or 0.0) for tier, amount in attributions}
    direct_cost = tier_sums.get("direct", 0.0)
    estimated_cost = tier_sums.get("estimated", 0.0)
    unallocated_cost = tier_sums.get("unallocated", 0.0)
    total_cost = direct_cost + estimated_cost + unallocated_cost

    # Counts
    student_count = db.query(Student).count()
    active_resource_count = db.query(AWSResource).filter(AWSResource.current_status.in_(["running", "active", "in-use"])).count()
    untagged_resource_count = db.query(AWSResource).filter(
        AWSResource.is_tagged_compliant == False,
        AWSResource.current_status.in_(["running", "active", "in-use"])
    ).count()
    open_alerts_count = db.query(Alert).filter(Alert.is_acknowledged == False).count()

    is_demo = db.query(CostRecord).filter(CostRecord.is_demo == True).count() > 0 or settings.MOCK_AWS

    # Daily trends (grouped by billing_date and tier)
    daily_rows = db.query(
        CostAttribution.billing_date,
        CostAttribution.attribution_tier,
        func.sum(CostAttribution.attributed_amount)
    ).group_by(CostAttribution.billing_date, CostAttribution.attribution_tier).order_by(CostAttribution.billing_date).all()

    daily_dict: Dict[str, Dict[str, float]] = {}
    for b_date, tier, amt in daily_rows:
        date_str = str(b_date)
        if date_str not in daily_dict:
            daily_dict[date_str] = {"direct": 0.0, "estimated": 0.0, "unallocated": 0.0}
        daily_dict[date_str][tier] = float(amt or 0.0)

    daily_trends = [
        DailyCostPoint(
            date=d,
            direct=round(vals["direct"], 2),
            estimated=round(vals["estimated"], 2),
            unallocated=round(vals["unallocated"], 2),
            total=round(vals["direct"] + vals["estimated"] + vals["unallocated"], 2)
        )
        for d, vals in sorted(daily_dict.items())
    ]

    # Service breakdown
    service_rows = db.query(
        CostRecord.service_name,
        func.sum(CostRecord.unblended_cost)
    ).group_by(CostRecord.service_name).order_by(func.sum(CostRecord.unblended_cost).desc()).all()

    total_service_cost = sum(float(amt or 0.0) for _, amt in service_rows) or 1.0
    service_breakdown = [
        ServiceBreakdownPoint(
            service=svc.replace("Amazon Elastic Compute Cloud - Compute", "EC2 Compute").replace("Amazon Virtual Private Cloud", "VPC"),
            cost=round(float(amt), 2),
            percentage=round((float(amt) / total_service_cost) * 100, 1)
        )
        for svc, amt in service_rows
    ]

    # Top student spenders
    student_spend_rows = db.query(
        Student.id,
        Student.full_name,
        Student.student_id,
        Student.budget_limit,
        func.sum(CostAttribution.attributed_amount).label("total_spent")
    ).outerjoin(CostAttribution, CostAttribution.student_id == Student.id)\
     .group_by(Student.id, Student.full_name, Student.student_id, Student.budget_limit)\
     .order_by(func.sum(CostAttribution.attributed_amount).desc().nullslast())\
     .limit(5).all()

    top_spenders = [
        {
            "id": s_id,
            "full_name": name,
            "student_id": roll_id,
            "budget_limit": float(budget or 0.0),
            "total_spent": round(float(spent or 0.0), 2),
            "percentage_used": round((float(spent or 0.0) / float(budget or 1.0)) * 100, 1)
        }
        for s_id, name, roll_id, budget, spent in student_spend_rows
    ]

    return DashboardAnalyticsResponse(
        kpis=OverviewKPIs(
            total_cost=round(total_cost, 2),
            direct_cost=round(direct_cost, 2),
            estimated_cost=round(estimated_cost, 2),
            unallocated_cost=round(unallocated_cost, 2),
            student_count=student_count,
            active_resource_count=active_resource_count,
            untagged_resource_count=untagged_resource_count,
            open_alerts_count=open_alerts_count,
            is_demo_mode=is_demo
        ),
        daily_trends=daily_trends,
        service_breakdown=service_breakdown,
        top_spenders=top_spenders
    )
