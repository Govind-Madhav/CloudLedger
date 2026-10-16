from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models import ActivityEvent, Student, Admin
from backend.app.schemas import ActivityEventResponse
from backend.app.auth import get_current_admin

router = APIRouter(prefix="/activity", tags=["CloudTrail Activity Audit"])

@router.get("", response_model=List[ActivityEventResponse])
def list_activity_events(
    event_name: Optional[str] = None,
    iam_username: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    query = db.query(ActivityEvent)
    if event_name:
        query = query.filter(ActivityEvent.event_name.ilike(f"%{event_name}%"))
    if iam_username:
        query = query.filter(ActivityEvent.iam_username == iam_username)

    events = query.order_by(ActivityEvent.event_time.desc()).limit(limit).all()

    result = []
    for ev in events:
        s_name = None
        if ev.student_id:
            st = db.query(Student).filter(Student.id == ev.student_id).first()
            if st:
                s_name = st.full_name

        result.append(ActivityEventResponse(
            id=ev.id,
            event_id=ev.event_id,
            event_time=ev.event_time,
            event_name=ev.event_name,
            event_source=ev.event_source,
            aws_region=ev.aws_region,
            iam_username=ev.iam_username,
            student_name=s_name,
            resource_id=ev.resource_id,
            is_mutation=ev.is_mutation,
            is_demo=ev.is_demo
        ))

    return result
