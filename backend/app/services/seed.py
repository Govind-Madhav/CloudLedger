import json
import uuid
from datetime import datetime, timedelta, timezone, date
from decimal import Decimal
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.auth import hash_password
from backend.app.models import (
    Admin, Student, IAMIdentity, AWSResource, 
    ActivityEvent, CostRecord, CostAttribution, Alert, CollectionRun
)

def seed_demo_data(db: Session) -> dict:
    """Seeds default admin and realistic demo student cloud usage data."""
    # 1. Default Admin
    admin = db.query(Admin).filter(Admin.email == settings.DEFAULT_ADMIN_EMAIL).first()
    if not admin:
        admin = Admin(
            email=settings.DEFAULT_ADMIN_EMAIL,
            password_hash=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
            full_name=settings.DEFAULT_ADMIN_NAME,
            role="professor",
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    # Check if demo students already exist
    existing_students = db.query(Student).count()
    if existing_students > 0:
        return {"status": "already_seeded", "students": existing_students}

    # 2. Sample Students & IAM Identities
    sample_students_data = [
        {"id": "STU-2026-001", "name": "Aarav Sharma", "email": "aarav.s@univ.edu", "course": "CS401-CLOUD", "budget": Decimal("40.00"), "iam": "student-aarav"},
        {"id": "STU-2026-002", "name": "Bhavna Patel", "email": "bhavna.p@univ.edu", "course": "CS401-CLOUD", "budget": Decimal("40.00"), "iam": "student-bhavna"},
        {"id": "STU-2026-003", "name": "Devansh Gupta", "email": "devansh.g@univ.edu", "course": "CS401-CLOUD", "budget": Decimal("35.00"), "iam": "student-devansh"},
        {"id": "STU-2026-004", "name": "Ishita Verma", "email": "ishita.v@univ.edu", "course": "CS401-CLOUD", "budget": Decimal("45.00"), "iam": "student-ishita"},
        {"id": "STU-2026-005", "name": "Kavya Nair", "email": "kavya.n@univ.edu", "course": "CS512-DEVOPS", "budget": Decimal("50.00"), "iam": "student-kavya"},
        {"id": "STU-2026-006", "name": "Rohan Mehra", "email": "rohan.m@univ.edu", "course": "CS512-DEVOPS", "budget": Decimal("30.00"), "iam": "student-rohan"}
    ]

    students_map = {}
    iam_map = {}
    for s_data in sample_students_data:
        student = Student(
            student_id=s_data["id"],
            full_name=s_data["name"],
            email=s_data["email"],
            course_code=s_data["course"],
            budget_limit=s_data["budget"],
            status="active"
        )
        db.add(student)
        db.flush()
        students_map[s_data["iam"]] = student

        iam = IAMIdentity(
            student_id=student.id,
            iam_username=s_data["iam"],
            iam_user_arn=f"arn:aws:iam::123456789012:user/{s_data['iam']}",
            account_id="123456789012",
            status="active",
            last_activity_at=datetime.now(timezone.utc) - timedelta(hours=2)
        )
        db.add(iam)
        db.flush()
        iam_map[s_data["iam"]] = iam

    # 3. Discovered Resources
    now = datetime.now(timezone.utc)
    resources_data = [
        # Student Aarav
        {"arn": "arn:aws:ec2:us-east-1:123456789012:instance/i-0a1b2c3d4e5f6001", "rid": "i-0a1b2c3d4e5f6001", "service": "ec2", "type": "instance", "iam": "student-aarav", "status": "running", "tags": {"Owner": "student-aarav", "Project": "Lab1-WebServer"}, "compliant": True},
        {"arn": "arn:aws:s3:::univ-cs401-aarav-bucket", "rid": "univ-cs401-aarav-bucket", "service": "s3", "type": "bucket", "iam": "student-aarav", "status": "active", "tags": {"Owner": "student-aarav"}, "compliant": True},
        
        # Student Bhavna (Untagged instance anomaly!)
        {"arn": "arn:aws:ec2:us-east-1:123456789012:instance/i-0a1b2c3d4e5f6002", "rid": "i-0a1b2c3d4e5f6002", "service": "ec2", "type": "instance", "iam": "student-bhavna", "status": "running", "tags": {}, "compliant": False},
        {"arn": "arn:aws:rds:us-east-1:123456789012:db:cs401-bhavna-db", "rid": "cs401-bhavna-db", "service": "rds", "type": "db_instance", "iam": "student-bhavna", "status": "running", "tags": {"Owner": "student-bhavna"}, "compliant": True},

        # Student Devansh (Budget overrun!)
        {"arn": "arn:aws:ec2:us-east-1:123456789012:instance/i-0a1b2c3d4e5f6003", "rid": "i-0a1b2c3d4e5f6003", "service": "ec2", "type": "instance", "iam": "student-devansh", "status": "running", "tags": {"Owner": "student-devansh", "Environment": "ML-Lab"}, "compliant": True},
        {"arn": "arn:aws:ec2:us-east-1:123456789012:volume/vol-0123456789000001", "rid": "vol-0123456789000001", "service": "ec2", "type": "volume", "iam": "student-devansh", "status": "in-use", "tags": {"Owner": "student-devansh"}, "compliant": True},

        # Student Ishita
        {"arn": "arn:aws:lambda:us-east-1:123456789012:function:cs401-ishita-api", "rid": "cs401-ishita-api", "service": "lambda", "type": "function", "iam": "student-ishita", "status": "active", "tags": {"Owner": "student-ishita"}, "compliant": True},
        
        # Student Kavya
        {"arn": "arn:aws:ec2:us-east-1:123456789012:instance/i-0a1b2c3d4e5f6005", "rid": "i-0a1b2c3d4e5f6005", "service": "ec2", "type": "instance", "iam": "student-kavya", "status": "stopped", "tags": {"Owner": "student-kavya"}, "compliant": True},

        # Unallocated Account Overhead Resource (NAT Gateway & Shared VPC)
        {"arn": "arn:aws:ec2:us-east-1:123456789012:natgateway/nat-0123456789abcdef0", "rid": "nat-0123456789abcdef0", "service": "vpc", "type": "natgateway", "iam": None, "status": "available", "tags": {"Infrastructure": "SharedBaseLab"}, "compliant": True}
    ]

    resource_objs = {}
    for r in resources_data:
        iam_obj = iam_map.get(r["iam"])
        student_obj = students_map.get(r["iam"])
        res = AWSResource(
            resource_arn=r["arn"],
            resource_id=r["rid"],
            service_name=r["service"],
            resource_type=r["type"],
            region="us-east-1",
            created_by_iam_id=iam_obj.id if iam_obj else None,
            attributed_student_id=student_obj.id if student_obj else None,
            creation_timestamp=now - timedelta(days=7),
            current_status=r["status"],
            tags_json=json.dumps(r["tags"]),
            is_tagged_compliant=r["compliant"],
            is_demo=True
        )
        db.add(res)
        db.flush()
        resource_objs[r["rid"]] = res

    # 4. Activity Events (CloudTrail)
    sample_events = [
        {"id": "evt-001", "name": "RunInstances", "svc": "ec2.amazonaws.com", "iam": "student-aarav", "rid": "i-0a1b2c3d4e5f6001", "hours": 48},
        {"id": "evt-002", "name": "CreateBucket", "svc": "s3.amazonaws.com", "iam": "student-aarav", "rid": "univ-cs401-aarav-bucket", "hours": 40},
        {"id": "evt-003", "name": "RunInstances", "svc": "ec2.amazonaws.com", "iam": "student-bhavna", "rid": "i-0a1b2c3d4e5f6002", "hours": 36},
        {"id": "evt-004", "name": "CreateDBInstance", "svc": "rds.amazonaws.com", "iam": "student-bhavna", "rid": "cs401-bhavna-db", "hours": 30},
        {"id": "evt-005", "name": "RunInstances", "svc": "ec2.amazonaws.com", "iam": "student-devansh", "rid": "i-0a1b2c3d4e5f6003", "hours": 24},
        {"id": "evt-006", "name": "CreateFunction20150331", "svc": "lambda.amazonaws.com", "iam": "student-ishita", "rid": "cs401-ishita-api", "hours": 18},
        {"id": "evt-007", "name": "StopInstances", "svc": "ec2.amazonaws.com", "iam": "student-kavya", "rid": "i-0a1b2c3d4e5f6005", "hours": 8},
        {"id": "evt-008", "name": "AuthorizeSecurityGroupIngress", "svc": "ec2.amazonaws.com", "iam": "student-devansh", "rid": "sg-012345678", "hours": 2}
    ]

    for ev in sample_events:
        student_obj = students_map.get(ev["iam"])
        act = ActivityEvent(
            event_id=ev["id"],
            event_time=now - timedelta(hours=ev["hours"]),
            event_name=ev["name"],
            event_source=ev["svc"],
            aws_region="us-east-1",
            source_ip_address="198.51.100.24",
            iam_username=ev["iam"],
            student_id=student_obj.id if student_obj else None,
            resource_id=ev["rid"],
            is_mutation=True,
            is_demo=True
        )
        db.add(act)

    # 5. Cost Records & Attributions (Past 7 Days)
    today = date.today()
    for day_offset in range(7, 0, -1):
        record_date = today - timedelta(days=day_offset)
        
        # Student Aarav EC2 ($1.20 / day)
        cr1 = CostRecord(
            record_source_id=f"demo-aarav-ec2-{record_date}",
            billing_period_start=record_date,
            billing_period_end=record_date + timedelta(days=1),
            service_name="Amazon Elastic Compute Cloud - Compute",
            usage_type="BoxUsage:t3.small",
            resource_id="i-0a1b2c3d4e5f6001",
            unblended_cost=Decimal("1.20"),
            record_source="demo",
            is_demo=True
        )
        db.add(cr1)
        db.flush()
        db.add(CostAttribution(
            cost_record_id=cr1.id,
            student_id=students_map["student-aarav"].id,
            resource_id=resource_objs["i-0a1b2c3d4e5f6001"].id,
            attributed_amount=Decimal("1.20"),
            attribution_tier="direct", # Tier 1 (Tag matched)
            confidence_score=Decimal("1.00"),
            billing_date=record_date,
            notes="Directly matched via Owner tag",
            is_demo=True
        ))

        # Student Bhavna Untagged EC2 ($1.68 / day) -> Attributed via Provenance Tier 2
        cr2 = CostRecord(
            record_source_id=f"demo-bhavna-ec2-{record_date}",
            billing_period_start=record_date,
            billing_period_end=record_date + timedelta(days=1),
            service_name="Amazon Elastic Compute Cloud - Compute",
            usage_type="BoxUsage:t3.medium",
            resource_id="i-0a1b2c3d4e5f6002",
            unblended_cost=Decimal("1.68"),
            record_source="demo",
            is_demo=True
        )
        db.add(cr2)
        db.flush()
        db.add(CostAttribution(
            cost_record_id=cr2.id,
            student_id=students_map["student-bhavna"].id,
            resource_id=resource_objs["i-0a1b2c3d4e5f6002"].id,
            attributed_amount=Decimal("1.68"),
            attribution_tier="direct", # Tier 2 (Provenance match)
            confidence_score=Decimal("0.95"),
            billing_date=record_date,
            notes="Attributed via CloudTrail RunInstances provenance",
            is_demo=True
        ))

        # Student Devansh Heavy ML EC2 Instance ($5.80 / day) -> Leading to budget overrun
        cr3 = CostRecord(
            record_source_id=f"demo-devansh-ec2-{record_date}",
            billing_period_start=record_date,
            billing_period_end=record_date + timedelta(days=1),
            service_name="Amazon Elastic Compute Cloud - Compute",
            usage_type="BoxUsage:g4dn.xlarge",
            resource_id="i-0a1b2c3d4e5f6003",
            unblended_cost=Decimal("5.80"),
            record_source="demo",
            is_demo=True
        )
        db.add(cr3)
        db.flush()
        db.add(CostAttribution(
            cost_record_id=cr3.id,
            student_id=students_map["student-devansh"].id,
            resource_id=resource_objs["i-0a1b2c3d4e5f6003"].id,
            attributed_amount=Decimal("5.80"),
            attribution_tier="direct",
            confidence_score=Decimal("1.00"),
            billing_date=record_date,
            notes="Directly matched via Owner tag",
            is_demo=True
        ))

        # Shared Regional Data Transfer ($0.45 / day) -> Estimated Tier 3
        cr4 = CostRecord(
            record_source_id=f"demo-datatransfer-{record_date}",
            billing_period_start=record_date,
            billing_period_end=record_date + timedelta(days=1),
            service_name="AWS Data Transfer",
            usage_type="DataTransfer-Regional-Bytes",
            resource_id=None,
            unblended_cost=Decimal("0.45"),
            record_source="demo",
            is_demo=True
        )
        db.add(cr4)
        db.flush()
        db.add(CostAttribution(
            cost_record_id=cr4.id,
            student_id=students_map["student-devansh"].id,
            resource_id=None,
            attributed_amount=Decimal("0.45"),
            attribution_tier="estimated",
            confidence_score=Decimal("0.65"),
            billing_date=record_date,
            notes="Estimated proportional share of egress data transfer",
            is_demo=True
        ))

        # Unallocated Shared NAT Gateway ($1.08 / day) -> Tier 4 Unallocated
        cr5 = CostRecord(
            record_source_id=f"demo-nat-{record_date}",
            billing_period_start=record_date,
            billing_period_end=record_date + timedelta(days=1),
            service_name="Amazon Virtual Private Cloud",
            usage_type="NatGateway-Hours",
            resource_id="nat-0123456789abcdef0",
            unblended_cost=Decimal("1.08"),
            record_source="demo",
            is_demo=True
        )
        db.add(cr5)
        db.flush()
        db.add(CostAttribution(
            cost_record_id=cr5.id,
            student_id=None,
            resource_id=resource_objs["nat-0123456789abcdef0"].id,
            attributed_amount=Decimal("1.08"),
            attribution_tier="unallocated",
            confidence_score=Decimal("0.00"),
            billing_date=record_date,
            notes="Account-level shared NAT Gateway overhead",
            is_demo=True
        ))

    # 6. Alerts
    db.add(Alert(
        alert_type="budget_exceeded_100",
        severity="critical",
        student_id=students_map["student-devansh"].id,
        message="Student Devansh Gupta has exceeded 100% of allocated budget ($40.60 / $35.00 limit) due to running g4dn.xlarge GPU instance.",
        is_demo=True
    ))
    db.add(Alert(
        alert_type="untagged_resource",
        severity="high",
        student_id=students_map["student-bhavna"].id,
        resource_id=resource_objs["i-0a1b2c3d4e5f6002"].id,
        message="Active EC2 instance i-0a1b2c3d4e5f6002 is running without mandatory 'Owner' tag.",
        is_demo=True
    ))

    # 7. Collection Run Log
    db.add(CollectionRun(
        collector_type="demo_seed",
        status="completed",
        records_processed=24,
        records_inserted=24,
        completed_at=now
    ))

    db.commit()
    return {"status": "seeded", "students": len(sample_students_data)}
