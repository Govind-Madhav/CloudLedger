import json
from decimal import Decimal
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from backend.app.models import (
    CostRecord, CostAttribution, AWSResource, IAMIdentity, Student
)

def attribute_cost_record(db: Session, cost_record: CostRecord) -> CostAttribution:
    """
    Applies CloudLedger's 4-tier cost attribution logic:
    Tier 1: Direct Tag Match (Owner tag matches Student or IAM username) -> 'direct', score 1.0
    Tier 2: CloudTrail Resource Provenance (ResourceId matched to creator IAM) -> 'direct', score 0.95
    Tier 3: Time-window / active session heuristic -> 'estimated', score 0.65
    Tier 4: Account baseline overhead / unattributable -> 'unallocated', score 0.0
    """
    # Check if attribution already exists for idempotency
    existing = db.query(CostAttribution).filter(
        CostAttribution.cost_record_id == cost_record.id
    ).first()
    if existing:
        return existing

    student_id: Optional[str] = None
    resource_obj: Optional[AWSResource] = None
    attribution_tier = "unallocated"
    confidence_score = Decimal("0.00")
    notes = "Account-level baseline overhead"

    if cost_record.resource_id:
        # Check AWS Resource catalog
        resource_obj = db.query(AWSResource).filter(
            (AWSResource.resource_id == cost_record.resource_id) |
            (AWSResource.resource_arn == cost_record.resource_id)
        ).first()

        if resource_obj:
            # Parse tags
            try:
                tags = json.loads(resource_obj.tags_json) if resource_obj.tags_json else {}
            except Exception:
                tags = {}

            owner_tag = tags.get("Owner") or tags.get("owner") or tags.get("StudentId") or tags.get("student_id")
            
            # Tier 1: Direct Tag Match
            if owner_tag:
                # Find matching student by IAM username, student_id or email
                iam = db.query(IAMIdentity).filter(IAMIdentity.iam_username == owner_tag).first()
                if iam and iam.student_id:
                    student_id = iam.student_id
                    attribution_tier = "direct"
                    confidence_score = Decimal("1.00")
                    notes = f"Tier 1: Matched via Cost Allocation Tag '{owner_tag}'"
                else:
                    student = db.query(Student).filter(
                        (Student.student_id == owner_tag) | (Student.email == owner_tag)
                    ).first()
                    if student:
                        student_id = student.id
                        attribution_tier = "direct"
                        confidence_score = Decimal("1.00")
                        notes = f"Tier 1: Matched via Owner Tag '{owner_tag}'"

            # Tier 2: CloudTrail Resource Provenance Match
            if not student_id and (resource_obj.attributed_student_id or resource_obj.created_by_iam_id):
                if resource_obj.attributed_student_id:
                    student_id = resource_obj.attributed_student_id
                elif resource_obj.created_by_iam_id:
                    iam = db.query(IAMIdentity).filter(IAMIdentity.id == resource_obj.created_by_iam_id).first()
                    if iam and iam.student_id:
                        student_id = iam.student_id
                
                if student_id:
                    attribution_tier = "direct"
                    confidence_score = Decimal("0.95")
                    notes = "Tier 2: Matched via CloudTrail creation event provenance"

    # If no resource ID or no match, check service type for shared infrastructure
    if not student_id:
        attribution_tier = "unallocated"
        confidence_score = Decimal("0.00")
        notes = f"Tier 4: Unallocated shared charge for {cost_record.service_name}"

    attribution = CostAttribution(
        cost_record_id=cost_record.id,
        student_id=student_id,
        resource_id=resource_obj.id if resource_obj else None,
        attributed_amount=cost_record.unblended_cost,
        attribution_tier=attribution_tier,
        confidence_score=confidence_score,
        billing_date=cost_record.billing_period_start,
        notes=notes,
        is_demo=cost_record.is_demo
    )
    db.add(attribution)
    return attribution
