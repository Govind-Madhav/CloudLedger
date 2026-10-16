import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models import AWSResource, Student, Admin
from backend.app.schemas import ResourceResponse, ReassignResourceRequest
from backend.app.auth import get_current_admin

router = APIRouter(prefix="/resources", tags=["AWS Resources & Governance"])

@router.get("", response_model=List[ResourceResponse])
def list_resources(
    service_name: Optional[str] = None,
    status: Optional[str] = None,
    untagged_only: bool = False,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    query = db.query(AWSResource)

    if service_name:
        query = query.filter(AWSResource.service_name == service_name.lower())
    if status:
        query = query.filter(AWSResource.current_status == status.lower())
    if untagged_only:
        query = query.filter(AWSResource.is_tagged_compliant == False)
    if search:
        pat = f"%{search}%"
        query = query.filter((AWSResource.resource_id.ilike(pat)) | (AWSResource.resource_arn.ilike(pat)))

    resources = query.order_by(AWSResource.discovered_at.desc()).all()

    result = []
    for r in resources:
        try:
            tags = json.loads(r.tags_json) if r.tags_json else {}
        except Exception:
            tags = {}

        student_name = None
        if r.attributed_student_id:
            st = db.query(Student).filter(Student.id == r.attributed_student_id).first()
            if st:
                student_name = st.full_name

        result.append(ResourceResponse(
            id=r.id,
            resource_arn=r.resource_arn,
            resource_id=r.resource_id,
            service_name=r.service_name,
            resource_type=r.resource_type,
            region=r.region,
            current_status=r.current_status,
            tags=tags,
            is_tagged_compliant=r.is_tagged_compliant,
            is_demo=r.is_demo,
            attributed_student_id=r.attributed_student_id,
            attributed_student_name=student_name,
            discovered_at=r.discovered_at
        ))

    return result

@router.get("/untagged", response_model=List[ResourceResponse])
def list_untagged_resources(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return list_resources(untagged_only=True, db=db, current_admin=current_admin)

@router.post("/{id}/reassign")
def reassign_resource_owner(
    id: str,
    payload: ReassignResourceRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    resource = db.query(AWSResource).filter(AWSResource.id == id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    if payload.student_id:
        student = db.query(Student).filter(Student.id == payload.student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Target student not found")
        resource.attributed_student_id = student.id
        msg = f"Resource reassigned to {student.full_name}"
    else:
        resource.attributed_student_id = None
        msg = "Resource ownership unassigned"

    db.commit()
    return {"message": msg, "resource_id": resource.id}
