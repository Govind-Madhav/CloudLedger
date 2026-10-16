from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from decimal import Decimal
from backend.app.database import get_db
from backend.app.models import (
    Student, IAMIdentity, AWSResource, CostAttribution, Admin
)
from backend.app.schemas import (
    StudentResponse, StudentCreate, StudentUpdate, MapIAMRequest,
    IAMIdentityResponse, ResourceResponse
)
from backend.app.auth import get_current_admin

router = APIRouter(prefix="/students", tags=["Students & IAM"])

@router.get("", response_model=List[StudentResponse])
def list_students(
    search: Optional[str] = None,
    course_code: Optional[str] = None,
    over_budget_only: bool = False,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    query = db.query(Student)
    if search:
        pattern = f"%{search}%"
        query = query.filter((Student.full_name.ilike(pattern)) | (Student.student_id.ilike(pattern)) | (Student.email.ilike(pattern)))
    if course_code:
        query = query.filter(Student.course_code == course_code)

    students = query.order_by(Student.full_name).all()

    result = []
    for s in students:
        # Sum spent
        spent = db.query(func.sum(CostAttribution.attributed_amount)).filter(CostAttribution.student_id == s.id).scalar() or Decimal("0.0")
        res_count = db.query(AWSResource).filter(
            AWSResource.attributed_student_id == s.id,
            AWSResource.current_status.in_(["running", "active", "in-use"])
        ).count()
        budget = float(s.budget_limit or 1.0)
        spent_f = float(spent)
        pct = round((spent_f / budget) * 100, 1)

        if over_budget_only and pct < 100.0:
            continue

        result.append(StudentResponse(
            id=s.id,
            student_id=s.student_id,
            full_name=s.full_name,
            email=s.email,
            course_code=s.course_code,
            budget_limit=float(s.budget_limit),
            status=s.status,
            created_at=s.created_at,
            iam_identities=[
                IAMIdentityResponse(
                    id=iam.id,
                    iam_username=iam.iam_username,
                    iam_user_arn=iam.iam_user_arn,
                    account_id=iam.account_id,
                    status=iam.status,
                    last_activity_at=iam.last_activity_at
                ) for iam in s.iam_identities
            ],
            total_spend=round(spent_f, 2),
            active_resource_count=res_count,
            budget_used_percentage=pct
        ))

    return result

@router.post("", response_model=StudentResponse)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    existing = db.query(Student).filter(
        (Student.student_id == payload.student_id) | (Student.email == payload.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student with this ID or email already exists")

    student = Student(
        student_id=payload.student_id,
        full_name=payload.full_name,
        email=payload.email,
        course_code=payload.course_code,
        budget_limit=Decimal(str(payload.budget_limit)),
        status="active"
    )
    db.add(student)
    db.flush()

    if payload.iam_username:
        iam = IAMIdentity(
            student_id=student.id,
            iam_username=payload.iam_username,
            iam_user_arn=f"arn:aws:iam::123456789012:user/{payload.iam_username}",
            account_id="123456789012",
            status="active"
        )
        db.add(iam)

    db.commit()
    db.refresh(student)

    return StudentResponse(
        id=student.id,
        student_id=student.student_id,
        full_name=student.full_name,
        email=student.email,
        course_code=student.course_code,
        budget_limit=float(student.budget_limit),
        status=student.status,
        created_at=student.created_at,
        iam_identities=[
            IAMIdentityResponse(
                id=iam.id,
                iam_username=iam.iam_username,
                iam_user_arn=iam.iam_user_arn,
                account_id=iam.account_id,
                status=iam.status,
                last_activity_at=iam.last_activity_at
            ) for iam in student.iam_identities
        ],
        total_spend=0.0,
        active_resource_count=0,
        budget_used_percentage=0.0
    )

@router.get("/{id}")
def get_student_detail(
    id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    spent = db.query(func.sum(CostAttribution.attributed_amount)).filter(CostAttribution.student_id == student.id).scalar() or Decimal("0.0")
    resources = db.query(AWSResource).filter(AWSResource.attributed_student_id == student.id).all()
    attributions = db.query(CostAttribution).filter(CostAttribution.student_id == student.id).order_by(CostAttribution.billing_date.desc()).all()

    return {
        "student": {
            "id": student.id,
            "student_id": student.student_id,
            "full_name": student.full_name,
            "email": student.email,
            "course_code": student.course_code,
            "budget_limit": float(student.budget_limit),
            "status": student.status,
            "created_at": student.created_at,
            "total_spend": round(float(spent), 2),
            "budget_used_percentage": round((float(spent) / float(student.budget_limit or 1.0)) * 100, 1)
        },
        "iam_identities": [
            {
                "id": iam.id,
                "iam_username": iam.iam_username,
                "iam_user_arn": iam.iam_user_arn,
                "status": iam.status
            } for iam in student.iam_identities
        ],
        "resources": [
            {
                "id": r.id,
                "resource_id": r.resource_id,
                "resource_arn": r.resource_arn,
                "service_name": r.service_name,
                "resource_type": r.resource_type,
                "current_status": r.current_status,
                "is_tagged_compliant": r.is_tagged_compliant
            } for r in resources
        ],
        "cost_history": [
            {
                "id": ca.id,
                "billing_date": str(ca.billing_date),
                "attributed_amount": float(ca.attributed_amount),
                "attribution_tier": ca.attribution_tier,
                "confidence_score": float(ca.confidence_score),
                "notes": ca.notes
            } for ca in attributions
        ]
    }

@router.put("/{id}")
def update_student(
    id: str,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if payload.full_name is not None:
        student.full_name = payload.full_name
    if payload.course_code is not None:
        student.course_code = payload.course_code
    if payload.budget_limit is not None:
        student.budget_limit = Decimal(str(payload.budget_limit))
    if payload.status is not None:
        student.status = payload.status

    db.commit()
    db.refresh(student)
    return {"message": "Student updated successfully", "student_id": student.id}

@router.post("/{id}/map-iam")
def map_iam_identity(
    id: str,
    payload: MapIAMRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    existing_iam = db.query(IAMIdentity).filter(IAMIdentity.iam_username == payload.iam_username).first()
    if existing_iam:
        existing_iam.student_id = student.id
    else:
        new_iam = IAMIdentity(
            student_id=student.id,
            iam_username=payload.iam_username,
            iam_user_arn=f"arn:aws:iam::{payload.account_id}:user/{payload.iam_username}",
            account_id=payload.account_id or "123456789012",
            status="active"
        )
        db.add(new_iam)

    db.commit()
    return {"message": f"Mapped IAM user '{payload.iam_username}' to {student.full_name}"}
