from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from backend.app.database import get_db
from backend.app.models import CollectionRun, Alert, Student, Admin
from backend.app.schemas import (
    SyncStatusResponse, TriggerSyncResponse, AlertResponse
)
from backend.app.services.aws_collector import collector
from backend.app.services.seed import seed_demo_data
from backend.app.auth import get_current_admin
from backend.app.config import settings

router = APIRouter(prefix="/system", tags=["System & Collectors"])

@router.get("/sync-status", response_model=List[SyncStatusResponse])
def get_sync_status(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    runs = db.query(CollectionRun).order_by(CollectionRun.started_at.desc()).limit(10).all()
    return [
        SyncStatusResponse(
            last_sync=r.completed_at or r.started_at,
            collector_type=r.collector_type,
            status=r.status,
            records_processed=r.records_processed or 0,
            is_mock=settings.MOCK_AWS
        ) for r in runs
    ]

@router.post("/trigger-sync", response_model=TriggerSyncResponse)
def trigger_sync(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    # Run sync across resources, cloudtrail, and cost explorer
    res_stats = collector.sync_resources(db)
    ct_stats = collector.sync_cloudtrail(db)
    ce_stats = collector.sync_cost_explorer(db)

    total_added = (res_stats.get("inserted", 0) + 
                   ct_stats.get("inserted", 0) + 
                   ce_stats.get("inserted", 0))

    mode_label = "Mock Demo Mode" if collector.mock_mode else "Live AWS Mode"
    return TriggerSyncResponse(
        message=f"Sync cycle executed ({mode_label})",
        records_added=total_added,
        status="success"
    )

@router.post("/seed-demo")
def seed_demo(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    res = seed_demo_data(db)
    return {"message": "Demo dataset re-seeded", "details": res}

@router.get("/alerts", response_model=List[AlertResponse])
def list_alerts(
    unacknowledged_only: bool = False,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    query = db.query(Alert)
    if unacknowledged_only:
        query = query.filter(Alert.is_acknowledged == False)

    alerts = query.order_by(Alert.created_at.desc()).all()
    result = []
    for a in alerts:
        s_name = None
        if a.student_id:
            st = db.query(Student).filter(Student.id == a.student_id).first()
            if st:
                s_name = st.full_name

        result.append(AlertResponse(
            id=a.id,
            alert_type=a.alert_type,
            severity=a.severity,
            message=a.message,
            student_name=s_name,
            is_acknowledged=a.is_acknowledged,
            created_at=a.created_at
        ))

    return result

@router.post("/alerts/{id}/ack")
def acknowledge_alert(
    id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_acknowledged = True
    alert.acknowledged_by = current_admin.id
    alert.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Alert acknowledged", "alert_id": alert.id}
