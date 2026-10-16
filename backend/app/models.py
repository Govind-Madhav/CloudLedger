import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, Numeric, DateTime, ForeignKey, 
    Text, Index, Date, Integer
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

def generate_uuid():
    return str(uuid.uuid4())

class Admin(Base):
    __tablename__ = "admins"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="professor") # super_admin, professor, auditor
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), unique=True, nullable=False, index=True) # Roll/Registration number
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    course_code = Column(String(64), nullable=False, default="CS401")
    budget_limit = Column(Numeric(10, 2), default=50.00, nullable=False) # In USD
    status = Column(String(32), default="active", nullable=False) # active, suspended, completed
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    iam_identities = relationship("IAMIdentity", back_populates="student", cascade="all, delete-orphan")
    resources = relationship("AWSResource", back_populates="student")
    cost_attributions = relationship("CostAttribution", back_populates="student")
    alerts = relationship("Alert", back_populates="student")

class IAMIdentity(Base):
    __tablename__ = "iam_identities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="SET NULL"), nullable=True, index=True)
    iam_username = Column(String(128), unique=True, nullable=False, index=True)
    iam_user_arn = Column(String(255), unique=True, nullable=False)
    account_id = Column(String(32), nullable=False, default="123456789012")
    status = Column(String(32), default="active") # active, inactive, locked
    last_activity_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    student = relationship("Student", back_populates="iam_identities")
    resources = relationship("AWSResource", back_populates="creator_iam")

class AWSResource(Base):
    __tablename__ = "aws_resources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    resource_arn = Column(String(512), unique=True, nullable=False, index=True)
    resource_id = Column(String(255), nullable=False, index=True) # e.g. i-0123456789, my-bucket
    service_name = Column(String(64), nullable=False, index=True) # ec2, s3, rds, lambda
    resource_type = Column(String(64), nullable=False) # instance, bucket, db_instance
    region = Column(String(32), nullable=False, default="us-east-1")
    created_by_iam_id = Column(String(36), ForeignKey("iam_identities.id", ondelete="SET NULL"), nullable=True)
    attributed_student_id = Column(String(36), ForeignKey("students.id", ondelete="SET NULL"), nullable=True, index=True)
    creation_timestamp = Column(DateTime(timezone=True), nullable=True)
    termination_timestamp = Column(DateTime(timezone=True), nullable=True)
    current_status = Column(String(32), default="running") # running, stopped, terminated, active, deleted
    tags_json = Column(Text, default="{}") # Serialized JSON key-value tags
    is_tagged_compliant = Column(Boolean, default=False, index=True)
    is_demo = Column(Boolean, default=False)
    discovered_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    student = relationship("Student", back_populates="resources")
    creator_iam = relationship("IAMIdentity", back_populates="resources")
    attributions = relationship("CostAttribution", back_populates="resource")

class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(128), unique=True, nullable=False, index=True) # CloudTrail EventId
    event_time = Column(DateTime(timezone=True), nullable=False, index=True)
    event_name = Column(String(128), nullable=False, index=True) # RunInstances, CreateBucket, etc.
    event_source = Column(String(128), nullable=False) # ec2.amazonaws.com
    aws_region = Column(String(32), nullable=False)
    source_ip_address = Column(String(64), nullable=True)
    iam_username = Column(String(128), nullable=True, index=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="SET NULL"), nullable=True, index=True)
    resource_arn = Column(String(512), nullable=True)
    resource_id = Column(String(255), nullable=True)
    is_mutation = Column(Boolean, default=True) # True if resource creation/update/deletion
    error_code = Column(String(128), nullable=True)
    raw_event_json = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class CostRecord(Base):
    __tablename__ = "cost_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    record_source_id = Column(String(255), unique=True, nullable=False, index=True) # Unique idempotency hash
    billing_period_start = Column(Date, nullable=False, index=True)
    billing_period_end = Column(Date, nullable=False)
    service_name = Column(String(128), nullable=False, index=True)
    usage_type = Column(String(255), nullable=True)
    operation = Column(String(128), nullable=True)
    resource_id = Column(String(255), nullable=True, index=True)
    unblended_cost = Column(Numeric(12, 6), nullable=False)
    currency = Column(String(10), default="USD")
    record_source = Column(String(32), default="cost_explorer") # cost_explorer, cur_parquet, demo
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    attributions = relationship("CostAttribution", back_populates="cost_record", cascade="all, delete-orphan")

class CostAttribution(Base):
    __tablename__ = "cost_attributions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    cost_record_id = Column(String(36), ForeignKey("cost_records.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=True, index=True)
    resource_id = Column(String(36), ForeignKey("aws_resources.id", ondelete="SET NULL"), nullable=True)
    attributed_amount = Column(Numeric(10, 4), nullable=False)
    attribution_tier = Column(String(32), nullable=False) # direct (tag/provenance), estimated, unallocated
    confidence_score = Column(Numeric(3, 2), default=1.00) # 1.0 (direct), 0.7 (estimated), 0.0 (unallocated)
    billing_date = Column(Date, nullable=False, index=True)
    notes = Column(String(255), nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    student = relationship("Student", back_populates="cost_attributions")
    cost_record = relationship("CostRecord", back_populates="attributions")
    resource = relationship("AWSResource", back_populates="attributions")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    alert_type = Column(String(64), nullable=False) # budget_warning_80, budget_exceeded_100, untagged_resource, high_spend
    severity = Column(String(32), default="medium") # low, medium, high, critical
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=True, index=True)
    resource_id = Column(String(36), ForeignKey("aws_resources.id", ondelete="SET NULL"), nullable=True)
    message = Column(Text, nullable=False)
    is_acknowledged = Column(Boolean, default=False, index=True)
    acknowledged_by = Column(String(36), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    student = relationship("Student", back_populates="alerts")

class CollectionRun(Base):
    __tablename__ = "collection_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    collector_type = Column(String(64), nullable=False) # cloudtrail, resources, cost_explorer, cur_s3, demo_seed
    status = Column(String(32), default="in_progress") # in_progress, completed, failed
    records_processed = Column(Integer, default=0)
    records_inserted = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), default=utc_now)
    completed_at = Column(DateTime(timezone=True), nullable=True)
