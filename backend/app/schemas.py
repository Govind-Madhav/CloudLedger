from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date

# --- Auth ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: "AdminProfile"

class AdminProfile(BaseModel):
    id: str
    email: str
    full_name: str
    role: str

# --- Students ---
class StudentBase(BaseModel):
    student_id: str
    full_name: str
    email: EmailStr
    course_code: str = "CS401"
    budget_limit: float = 50.0

class StudentCreate(StudentBase):
    iam_username: Optional[str] = None

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    course_code: Optional[str] = None
    budget_limit: Optional[float] = None
    status: Optional[str] = None

class IAMIdentityResponse(BaseModel):
    id: str
    iam_username: str
    iam_user_arn: str
    account_id: str
    status: str
    last_activity_at: Optional[datetime] = None

class StudentResponse(StudentBase):
    id: str
    status: str
    created_at: datetime
    iam_identities: List[IAMIdentityResponse] = []
    total_spend: float = 0.0
    active_resource_count: int = 0
    budget_used_percentage: float = 0.0

class MapIAMRequest(BaseModel):
    iam_username: str
    account_id: Optional[str] = "123456789012"

# --- Resources ---
class ResourceResponse(BaseModel):
    id: str
    resource_arn: str
    resource_id: str
    service_name: str
    resource_type: str
    region: str
    current_status: str
    tags: Dict[str, str] = {}
    is_tagged_compliant: bool
    is_demo: bool
    attributed_student_id: Optional[str] = None
    attributed_student_name: Optional[str] = None
    discovered_at: datetime

class ReassignResourceRequest(BaseModel):
    student_id: Optional[str] = None # None means unassign

# --- Activity ---
class ActivityEventResponse(BaseModel):
    id: str
    event_id: str
    event_time: datetime
    event_name: str
    event_source: str
    aws_region: str
    iam_username: Optional[str] = None
    student_name: Optional[str] = None
    resource_id: Optional[str] = None
    is_mutation: bool
    is_demo: bool

# --- Costs & Attribution ---
class CostRecordResponse(BaseModel):
    id: str
    billing_period_start: date
    billing_period_end: date
    service_name: str
    unblended_cost: float
    record_source: str
    is_demo: bool

class CostAttributionResponse(BaseModel):
    id: str
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    resource_id: Optional[str] = None
    attributed_amount: float
    attribution_tier: str # direct, estimated, unallocated
    confidence_score: float
    billing_date: date
    notes: Optional[str] = None
    is_demo: bool

class DailyCostPoint(BaseModel):
    date: str
    direct: float = 0.0
    estimated: float = 0.0
    unallocated: float = 0.0
    total: float = 0.0

class ServiceBreakdownPoint(BaseModel):
    service: str
    cost: float
    percentage: float

# --- Analytics Overview ---
class OverviewKPIs(BaseModel):
    total_cost: float
    direct_cost: float
    estimated_cost: float
    unallocated_cost: float
    student_count: int
    active_resource_count: int
    untagged_resource_count: int
    open_alerts_count: int
    is_demo_mode: bool

class DashboardAnalyticsResponse(BaseModel):
    kpis: OverviewKPIs
    daily_trends: List[DailyCostPoint]
    service_breakdown: List[ServiceBreakdownPoint]
    top_spenders: List[Dict[str, Any]]

# --- Alerts ---
class AlertResponse(BaseModel):
    id: str
    alert_type: str
    severity: str
    message: str
    student_name: Optional[str] = None
    is_acknowledged: bool
    created_at: datetime

# --- System & Sync ---
class SyncStatusResponse(BaseModel):
    last_sync: Optional[datetime] = None
    collector_type: str
    status: str
    records_processed: int
    is_mock: bool

class TriggerSyncResponse(BaseModel):
    message: str
    records_added: int
    status: str
