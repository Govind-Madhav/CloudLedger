import json
from decimal import Decimal
from datetime import date
from backend.app.models import CostRecord, AWSResource, IAMIdentity, Student
from backend.app.services.attribution import attribute_cost_record

def test_attribution_tier_1_tag_match(db_session):
    # Setup student and resource with Owner tag
    student = Student(student_id="TEST-001", full_name="Test Student", email="test1@univ.edu", budget_limit=Decimal("50.0"))
    db_session.add(student)
    db_session.flush()

    res = AWSResource(
        resource_arn="arn:aws:ec2:us-east-1:123:instance/i-testtag",
        resource_id="i-testtag",
        service_name="ec2",
        resource_type="instance",
        tags_json=json.dumps({"Owner": "TEST-001"}),
        is_tagged_compliant=True
    )
    db_session.add(res)
    db_session.flush()

    cost_rec = CostRecord(
        record_source_id="rec-test-tag",
        billing_period_start=date(2026, 10, 1),
        billing_period_end=date(2026, 10, 2),
        service_name="ec2",
        resource_id="i-testtag",
        unblended_cost=Decimal("2.50")
    )
    db_session.add(cost_rec)
    db_session.flush()

    attr = attribute_cost_record(db_session, cost_rec)
    assert attr.attribution_tier == "direct"
    assert attr.confidence_score == Decimal("1.00")
    assert attr.student_id == student.id

def test_attribution_tier_2_provenance_match(db_session):
    # Setup student and resource without tags, but with attributed_student_id
    student = Student(student_id="TEST-002", full_name="Provenance Student", email="test2@univ.edu", budget_limit=Decimal("50.0"))
    db_session.add(student)
    db_session.flush()

    res = AWSResource(
        resource_arn="arn:aws:ec2:us-east-1:123:instance/i-testprov",
        resource_id="i-testprov",
        service_name="ec2",
        resource_type="instance",
        attributed_student_id=student.id,
        tags_json="{}",
        is_tagged_compliant=False
    )
    db_session.add(res)
    db_session.flush()

    cost_rec = CostRecord(
        record_source_id="rec-test-prov",
        billing_period_start=date(2026, 10, 1),
        billing_period_end=date(2026, 10, 2),
        service_name="ec2",
        resource_id="i-testprov",
        unblended_cost=Decimal("3.75")
    )
    db_session.add(cost_rec)
    db_session.flush()

    attr = attribute_cost_record(db_session, cost_rec)
    assert attr.attribution_tier == "direct"
    assert attr.confidence_score == Decimal("0.95")
    assert attr.student_id == student.id

def test_attribution_tier_4_unallocated(db_session):
    cost_rec = CostRecord(
        record_source_id="rec-test-unallocated",
        billing_period_start=date(2026, 10, 1),
        billing_period_end=date(2026, 10, 2),
        service_name="Amazon Virtual Private Cloud",
        resource_id="nat-orphan-000",
        unblended_cost=Decimal("5.00")
    )
    db_session.add(cost_rec)
    db_session.flush()

    attr = attribute_cost_record(db_session, cost_rec)
    assert attr.attribution_tier == "unallocated"
    assert attr.confidence_score == Decimal("0.00")
    assert attr.student_id is None
