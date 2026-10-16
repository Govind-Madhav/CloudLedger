# CloudLedger: AWS Student Cloud Usage & Cost Monitoring System
## Production-Grade Engineering Implementation Plan & Architecture Specification

**Project Name:** CloudLedger  
**Target Domain:** Cloud Financial Operations (FinOps), Academic Cloud Governance & Resource Auditing  
**Cloud Provider:** Amazon Web Services (AWS)  
**Target Stack:** React (TypeScript) + Tailwind CSS | Python FastAPI (Async SQLAlchemy 2.0) | PostgreSQL 16 | Terraform | GitHub Actions  
**Audience:** Academic Administrators, Lab Instructors, System Auditors  
**Document Status:** Final Architecture & Implementation Blueprint  

---

## 1. Executive Summary & Problem Formulation

### 1.1 The Academic Cloud Challenge
In shared AWS educational accounts, universities allocate individual IAM user credentials (or IAM federated roles) to students for cloud lab exercises, capstone projects, and coursework. This environment introduces distinct governance problems:
1. **The Attribution Void:** AWS Billing and Cost Management is billed at the Account/Organization level. Individual billing line items in AWS Cost and Usage Reports (CUR 2.0) track AWS Resource IDs (`lineItem/ResourceId`), Usage Types, and Tags, but **do not natively attribute charges to IAM Users**.
2. **Untagged & Orphaned Resources:** Students frequently spin up EC2 GPU instances, NAT Gateways, or unattached EBS volumes without tagging, or abandon resources after labs conclude, resulting in massive unexpected bills.
3. **Cost Delay & Latency:** AWS Cost Explorer has an 8–24 hour data latency; CUR parquet exports arrive every few hours or once daily; CloudTrail events arrive within 5–15 minutes. A system must bridge real-time activity tracking with delayed financial reconciliation.
4. **Account Overhead vs Student Usage:** Shared networking overhead (VPC endpoints, NAT Gateways, Route 53 zones, Data Transfer) cannot be attributed to a single student and must be segregated as **Unallocated Infrastructure Baseline Costs**.

### 1.2 System Purpose
**CloudLedger** is a centralized, self-hosted, administrator-facing governance and cost intelligence platform. It systematically correlates real-time CloudTrail management events, automated resource discovery inventories, and official AWS Cost Explorer & CUR 2.0 billing records. Through a 4-tier deterministic-to-heuristic attribution algorithm, CloudLedger generates transparent, auditable student-by-student cloud balance sheets while highlighting untagged resources, budget overruns, and billing anomalies.

---

## 2. Core Technical Architecture & Data Ingestion Pipeline

```
                                      AWS CLOUD ENVIRONMENT
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                        │
 │   ┌───────────────────────┐   ┌──────────────────────────┐   ┌─────────────────────┐   │
 │   │  CloudTrail S3 Bucket │   │ AWS Cost & Usage Reports │   │ Active AWS Services │   │
 │   │  (Management Events)  │   │  (CUR 2.0 S3 Parquet)    │   │ (EC2, S3, RDS, etc) │   │
 │   └──────────┬────────────┘   └─────────────┬────────────┘   └──────────┬──────────┘   │
 └──────────────┼──────────────────────────────┼───────────────────────────┼──────────────┘
                │ S3 Event / Polling           │ Daily / Hourly Sync       │ Boto3 Describe/List
                ▼                              ▼                           ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                               CLOUDLEDGER INGESTION ENGINE                             │
 │                                                                                        │
 │  ┌─────────────────────────┐  ┌───────────────────────────┐  ┌──────────────────────┐  │
 │  │ CloudTrail Event Parser │  │   CUR 2.0 Parquet Parser  │  │  Resource Discovery  │  │
 │  │  (Identity & Provenance)│  │     & DuckDB Normalizer   │  │   & Tag Compliance   │  │
 │  └───────────┬─────────────┘  └─────────────┬─────────────┘  └──────────┬───────────┘  │
 │              │                              │                           │              │
 │              └────────────────────────► ◄───┴───────────────────────────┘              │
 │                                         │                                              │
 │                                         ▼                                              │
 │                         ┌───────────────────────────────┐                              │
 │                         │ 4-Tier Cost Attribution Engine│                              │
 │                         └───────────────┬───────────────┘                              │
 └─────────────────────────────────────────┼──────────────────────────────────────────────┘
                                           │
                                           ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                             STORAGE & CORE SERVICES LAYER                              │
 │                                                                                        │
 │  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
 │  │ Amazon RDS PostgreSQL 16 (Foreign Keys, Indexes, Partitioned Event/Cost Tables)  │  │
 │  └──────────────────────────────────────────┬───────────────────────────────────────┘  │
 │                                             │                                          │
 │                                             ▼                                          │
 │  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
 │  │ FastAPI Backend Core (Auth JWT, REST Endpoints, Background Workers, Boto3 Cache) │  │
 │  └──────────────────────────────────────────┬───────────────────────────────────────┘  │
 └─────────────────────────────────────────────┼──────────────────────────────────────────┘
                                               │ Secure HTTPS REST API
                                               ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                          ADMINISTRATIVE USER INTERFACE                                 │
 │  React 18 + TypeScript + Tailwind CSS + Recharts + Lucide Icons                       │
 │  (KPI Overview, Student Ledger, Resource Governance, Anomaly Alerter, Cost Explorer)    │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The 4-Tier Student Cost Attribution Model

To solve the lack of native per-IAM-user billing in AWS, CloudLedger implements a multi-stage attribution pipeline:

```
                                  AWS Billing Line Item (CUR)
                                              │
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │ Tier 1: User-Defined Cost Allocation Tag│
                         │   Tag key: `Owner` or `StudentId`       │
                         └────────────────────┬────────────────────┘
                                              │
                           Matched? ──────────┴────────── No
                              │                            │
                             Yes                           ▼
                              │           ┌─────────────────────────────────────────┐
                              │           │ Tier 2: CloudTrail Resource Provenance  │
                              │           │   Match `ResourceId` -> `aws_resources` │
                              │           │   Look up `creator_iam_identity`        │
                              │           └────────────────┬────────────────────────┘
                              │                            │
                              │             Matched? ──────┴────── No
                              │                │                    │
                              │               Yes                   ▼
                              │                │   ┌────────────────────────────────┐
                              │                │   │ Tier 3: Time-Window Heuristic  │
                              │                │   │ Active IAM session in same     │
                              │                │   │ region/service during creation │
                              │                │   └────────────────┬───────────────┘
                              │                │                    │
                              │                │     Matched? ──────┴────── No
                              │                │        │                    │
                              │                │       Yes                   ▼
                              │                │        │   ┌───────────────────────────────┐
                              ▼                ▼        ▼   │ Tier 4: Unallocated Pool      │
                       [High Confidence] [High Conf] [Medium]│ (Shared VPC, Base NAT, Tax,   │
                                                            │  Untagged unprovable spend)   │
                                                            └───────────────────────────────┘
```

1. **Tier 1: Explicit Cost Allocation Tags (Confidence: 100%)**
   - Requires AWS User-Defined Cost Allocation Tags (`Owner`, `StudentId`, `Project`) to be activated in AWS Billing Console.
   - If line item contains `resourceTags/user:Owner == student_username`, attribute 100% directly.
2. **Tier 2: Event Provenance Linking (Confidence: 95%)**
   - When resources lack tags in billing or tags are stripped, CloudLedger cross-references the billing `ResourceId` (e.g., `vol-0123456789abcdef0`, `i-0987654321`) with the internal `aws_resources` catalog.
   - The catalog preserves the exact `creator_iam_identity` captured at creation time from CloudTrail management events (`RunInstances`, `CreateVolume`, `CreateBucket`).
3. **Tier 3: Time-Window Pro-Rata Attribution (Confidence: 65% - Flagged as Estimated)**
   - Used for non-resource-specific usage (e.g., Regional Data Transfer, S3 standard requests) where a student’s active resource was the exclusive consumer in that service/region during the 1-hour billing window.
4. **Tier 4: Unallocated Account Overhead (Confidence: N/A - Account Overhead)**
   - Unattributable costs: AWS Support Fees, Tax, Shared Multi-AZ NAT Gateways, Route 53 Hosted Zones.
   - Categorized separately so total account expenditure = `Attributed Costs + Unallocated Costs`.

---

## 4. Production Database Architecture (PostgreSQL 16)

The database schema is designed for auditable financial records, high-throughput event logging, and rapid aggregation.

```sql
-- CloudLedger Production Schema (PostgreSQL 16)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Administrators Table
CREATE TABLE administrators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'professor', 'teaching_assistant', 'auditor')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);

-- 2. Students Registry
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(64) UNIQUE NOT NULL, -- University Enrollment/Roll Number
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    course_code VARCHAR(64) NOT NULL,       -- e.g., 'CS445-CLOUD-COMPUTING'
    budget_limit NUMERIC(10, 2) DEFAULT 25.00, -- Maximum budget allocated ($USD)
    status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'completed')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. IAM Identities Mapping
CREATE TABLE iam_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    iam_username VARCHAR(128) UNIQUE NOT NULL,
    iam_user_arn VARCHAR(255) UNIQUE NOT NULL,
    account_id VARCHAR(32) NOT NULL,
    status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked')),
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Discovered AWS Resources
CREATE TABLE aws_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_arn VARCHAR(512) UNIQUE NOT NULL,
    resource_id VARCHAR(255) NOT NULL, -- e.g., 'i-0ab12cd34ef'
    service_name VARCHAR(64) NOT NULL,  -- 'ec2', 's3', 'rds', 'lambda'
    resource_type VARCHAR(64) NOT NULL, -- 'instance', 'bucket', 'db_instance'
    region VARCHAR(32) NOT NULL,
    created_by_iam_id UUID REFERENCES iam_identities(id) ON DELETE SET NULL,
    attributed_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    creation_timestamp TIMESTAMPTZ,
    termination_timestamp TIMESTAMPTZ,
    current_status VARCHAR(32) DEFAULT 'running' CHECK (current_status IN ('running', 'stopped', 'terminated', 'active', 'deleted')),
    tags JSONB DEFAULT '{}'::jsonb,
    is_tagged_compliant BOOLEAN DEFAULT FALSE,
    discovered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. CloudTrail Activity Events (Partitioned by Month for Performance)
CREATE TABLE activity_events (
    id UUID DEFAULT uuid_generate_v4(),
    event_id VARCHAR(128) NOT NULL,
    event_time TIMESTAMPTZ NOT NULL,
    event_name VARCHAR(128) NOT NULL,     -- e.g., 'RunInstances', 'CreateBucket'
    event_source VARCHAR(128) NOT NULL,   -- e.g., 'ec2.amazonaws.com'
    aws_region VARCHAR(32) NOT NULL,
    source_ip_address VARCHAR(64),
    user_agent TEXT,
    iam_username VARCHAR(128),
    iam_identity_id UUID REFERENCES iam_identities(id) ON DELETE SET NULL,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    resource_arn VARCHAR(512),
    request_parameters JSONB,
    response_elements JSONB,
    error_code VARCHAR(128),
    is_mutation BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, event_time)
) PARTITION BY RANGE (event_time);

-- 6. Cost Records (Raw Aggregated AWS Spend)
CREATE TABLE cost_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    service_name VARCHAR(128) NOT NULL,
    usage_type VARCHAR(255),
    operation VARCHAR(128),
    resource_id VARCHAR(255),
    unblended_cost NUMERIC(12, 6) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    record_source VARCHAR(32) CHECK (record_source IN ('cost_explorer', 'cur_parquet', 'manual_adjustment')),
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Attributed Student Costs (Reconciled Financial Ledger)
CREATE TABLE cost_attributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    cost_record_id UUID REFERENCES cost_records(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES aws_resources(id) ON DELETE SET NULL,
    attributed_amount NUMERIC(10, 4) NOT NULL,
    attribution_tier VARCHAR(32) CHECK (attribution_tier IN ('tag_exact', 'event_provenance', 'time_window_heuristic', 'unallocated_overhead')),
    confidence_score NUMERIC(3, 2) NOT NULL, -- 1.00 (Tier 1), 0.95 (Tier 2), 0.65 (Tier 3)
    billing_date DATE NOT NULL,
    is_disputed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Budget and Usage Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(64) NOT NULL CHECK (alert_type IN ('budget_warning_80', 'budget_exceeded_100', 'untagged_resource', 'expensive_instance_spawned', 'long_running_instance')),
    severity VARCHAR(32) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES aws_resources(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES administrators(id),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Ingestion Sync Audit Log
CREATE TABLE collection_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collector_type VARCHAR(64) NOT NULL, -- 'cloudtrail_sync', 'cur_sync', 'resource_discovery'
    status VARCHAR(32) NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
    records_processed INT DEFAULT 0,
    records_inserted INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

-- Strategic Query Indexes
CREATE INDEX idx_resources_student ON aws_resources(attributed_student_id);
CREATE INDEX idx_resources_service_status ON aws_resources(service_name, current_status);
CREATE INDEX idx_resources_compliant ON aws_resources(is_tagged_compliant);
CREATE INDEX idx_iam_identities_student ON iam_identities(student_id);
CREATE INDEX idx_cost_attributions_student_date ON cost_attributions(student_id, billing_date);
CREATE INDEX idx_alerts_acknowledged ON alerts(is_acknowledged, severity);
```

---

## 5. API Surface Specification (FastAPI RESTful Endpoints)

### 5.1 Authentication & System Administration
- `POST /api/v1/auth/login`: Admin credentials authentication -> Returns JWT Bearer token + Refresh token.
- `GET /api/v1/auth/me`: Returns current administrator profile, permissions, and session status.
- `POST /api/v1/auth/change-password`: Self-service password rotation.

### 5.2 Dashboard Executive Analytics
- `GET /api/v1/analytics/overview`: High-level KPI summary:
  - Account total spend (Month-to-Date vs Previous Month).
  - Breakdown: Attributed to students ($) vs Unallocated Account Baseline ($).
  - Total active student count, active EC2/RDS resources, untagged resource count.
  - Urgent alerts count (students >= 100% budget, untagged high-cost resources).
- `GET /api/v1/analytics/cost-trends?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&interval=daily`: Time-series cost breakdown by service and attribution category.
- `GET /api/v1/analytics/service-breakdown`: Aggregated spend grouped by AWS service (EC2, S3, RDS, SageMaker, Lambda, VPC/DataTransfer).

### 5.3 Student Ledger & IAM Governance
- `GET /api/v1/students`: Paginated list of students with real-time spend, budget cap, status, active resource count, and tag compliance rate.
  - Query parameters: `page`, `page_size`, `search`, `course_code`, `status`, `over_budget_only`.
- `POST /api/v1/students`: Register student and assign initial budget cap.
- `GET /api/v1/students/{id}`: Deep profile of student:
  - Mapped IAM identity ARN & username.
  - Complete list of active/historical resources.
  - Day-by-day itemized cost ledger.
  - Recent CloudTrail API activity history.
- `PUT /api/v1/students/{id}`: Update budget limit or active status.
- `POST /api/v1/students/{id}/map-iam`: Link an AWS IAM username to this student.
- `POST /api/v1/students/bulk-import`: CSV batch upload of students (Roll No, Name, Email, Course, IAM Username).

### 5.4 Resource Inventory & Tag Compliance
- `GET /api/v1/resources`: Filterable catalog of all AWS resources discovered in the account.
  - Filters: `service_name`, `region`, `status`, `student_id`, `is_tagged_compliant`, `search`.
- `GET /api/v1/resources/{id}`: Complete resource metadata, tags, CloudTrail creation event record, and attributed cumulative cost.
- `POST /api/v1/resources/{id}/reassign`: Manually assign or override ownership to a specific student with audit justification.
- `GET /api/v1/resources/untagged`: Quick-filter endpoint for untagged / orphaned resources requiring immediate intervention.

### 5.5 Activity Event Stream
- `GET /api/v1/activity`: Searchable audit log of CloudTrail management events.
  - Filters: `student_id`, `iam_username`, `service`, `event_name`, `start_time`, `end_time`.

### 5.6 Ingestion Pipeline & Background Sync Controls
- `GET /api/v1/system/sync-status`: Status of last CloudTrail sync, Cost Explorer sync, CUR 2.0 S3 fetch, and resource discovery scan.
- `POST /api/v1/system/trigger-sync`: Manually trigger on-demand sync for testing or immediate updates.
- `GET /api/v1/alerts`: Paginated list of active alerts with action buttons to acknowledge or dismiss.

---

## 6. AWS Security & Least-Privilege IAM Policy

CloudLedger requires **read-only** inspection access to the target AWS account to gather CloudTrail events, resource tags, and billing data without any write or delete permissions on student resources.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudLedgerCostBillingReadOnly",
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostAndUsageWithResources",
        "ce:GetDimensionValues",
        "ce:GetTags",
        "cur:DescribeReportDefinitions",
        "bcm:GetAccountPreferences"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudLedgerResourceDiscoveryReadOnly",
      "Effect": "Allow",
      "Action": [
        "tag:GetResources",
        "tag:GetTagKeys",
        "tag:GetTagValues",
        "ec2:DescribeInstances",
        "ec2:DescribeVolumes",
        "ec2:DescribeVpcs",
        "ec2:DescribeNatGateways",
        "s3:ListAllMyBuckets",
        "s3:GetBucketTagging",
        "s3:GetBucketLocation",
        "rds:DescribeDBInstances",
        "rds:ListTagsForResource",
        "lambda:ListFunctions",
        "lambda:ListTags",
        "sagemaker:ListNotebookInstances",
        "sagemaker:ListTags"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudLedgerCloudTrailAuditReadOnly",
      "Effect": "Allow",
      "Action": [
        "cloudtrail:LookupEvents",
        "cloudtrail:DescribeTrails",
        "cloudtrail:GetTrailStatus"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudLedgerS3CurBucketReadOnly",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::cloudledger-cur-reports-*",
        "arn:aws:s3:::cloudledger-cur-reports-*/*"
      ]
    }
  ]
}
```

---

## 7. Frontend Architecture & Design Aesthetic Standard

In accordance with modern web engineering standards, the UI must avoid basic generic layouts and deliver an intuitive, high-density, professional FinOps cockpit:

### 7.1 Visual Design Tokens
- **Theme:** Sleek dark-mode primary aesthetic (`slate-950` / `zinc-900` backgrounds, crisp typography using Inter/Geist).
- **Cards & Surfaces:** Glassmorphic translucent cards (`bg-slate-900/70 border border-slate-800/80 backdrop-blur-md`).
- **Accents:** Electric Indigo (`#6366f1`) and Cyan (`#06b6d4`) for primary metrics, Emerald (`#10b981`) for compliant tags & healthy budgets, Amber (`#f59e0b`) for approaching thresholds, Rose (`#f43f5e`) for overruns and untagged anomalies.
- **Charts:** Interactive Recharts SVG elements (Stacked Area chart for Service Burn, Donut chart for Attributed vs Unallocated, Horizontal Bar Chart for Top 10 Student Spenders).

### 7.2 Core Views & User Journeys
1. **Executive FinOps Overview:**
   - 4-Card Hero Metrics: Total Month-to-Date Spend, Attributable Student Ratio (%), Active Resource Count, Compliance Score.
   - Interactive 30-Day Cost Trend with stacked service breakdowns.
   - Live Anomaly Alert Drawer.
2. **Student Directory & Detail View:**
   - Real-time search, course filtering, and budget status indicators.
   - Slide-over / modal deep-dive displaying individual AWS resources, daily burn rate, and CloudTrail event feed.
3. **Resource Governance & Tag Auditor:**
   - Tabular view of all discovered resources with live tags, status badges, and 1-click reassignment.
   - Dedicated "Untagged Resources" view highlighting orphaned spenders.
4. **Activity & Audit Trail Explorer:**
   - Real-time stream of student API actions with color-coded badges for high-risk actions (`RunInstances`, `AuthorizeSecurityGroupIngress`).

---

## 8. Terraform Infrastructure as Code (IaC) Structure

The infrastructure is designed for AWS deployment with full repeatability:

```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── outputs.tf
│   └── prod/
│       ├── main.tf
│       ├── variables.tf
│       └── terraform.tfvars
└── modules/
    ├── networking/           # VPC, Public/Private Subnets, Security Groups
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── database/             # RDS PostgreSQL 16 (Private Subnet, Encrypted)
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── iam/                  # Read-only collector roles and App execution roles
    │   ├── main.tf
    │   ├── policies.json
    │   └── outputs.tf
    ├── s3_cur/               # S3 Bucket for CUR 2.0 exports with lifecycle rules
    │   ├── main.tf
    │   └── outputs.tf
    └── compute/              # AWS App Runner or ECS Fargate for Backend + Frontend
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

---

## 9. CI/CD & DevOps Pipeline (GitHub Actions)

Continuous Integration and Deployment guarantees code reliability and safe deployment:

```yaml
# .github/workflows/ci-cd.yml
name: CloudLedger CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-checks:
    name: Backend Lint, Type Check & Pytest
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - name: Install Dependencies
        run: |
          python -m pip install --upgrade pip
          pip install ruff mypy pytest pytest-asyncio moto boto3 sqlalchemy pydantic fastapi httpx
      - name: Ruff Lint & Format Check
        run: ruff check backend/ && ruff format --check backend/
      - name: Unit Tests with Moto (AWS Mocked)
        run: pytest backend/tests/ -v --cov=backend

  frontend-checks:
    name: Frontend Lint, Type Check & Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - name: Install Frontend Dependencies
        working-directory: frontend
        run: npm ci
      - name: TypeScript Check
        working-directory: frontend
        run: npx tsc --noEmit
      - name: Build Production Bundle
        working-directory: frontend
        run: npm run build

  security-scan:
    name: Security & IaC Vulnerability Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy Security Scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          ignore-unfixed: true
          severity: 'CRITICAL,HIGH'
```

---

## 10. Implementation Roadmap & Milestones

| Phase | Milestone | Core Deliverables | Target Status |
|---|---|---|---|
| **Phase 1** | **Repository Foundation & Data Modeling** | • Standard project structure (`backend/`, `frontend/`, `terraform/`, `.github/`)<br>• PostgreSQL 16 schema with Alembic migrations<br>• Pydantic v2 schemas & mock data generator for offline testing | Milestone 1 |
| **Phase 2** | **Backend Core & Mock Simulator** | • FastAPI application with async database session<br>• JWT authentication & RBAC<br>• Realistic AWS Cost & CloudTrail mock synthesizer<br>• Full CRUD APIs for Students, Resources, and Cost Records | Milestone 2 |
| **Phase 3** | **Interactive FinOps Dashboard (Frontend)** | • Vite + React 18 + Tailwind CSS frontend<br>• Recharts cost trend visualization<br>• Student directory with budget gauges and drilldown<br>• Resource inventory with compliance badges | Milestone 3 |
| **Phase 4** | **Live AWS Ingestion & Attribution Engine** | • Boto3 AWS Cost Explorer client with Redis/in-memory caching<br>• CloudTrail ingestion and event parser<br>• 4-tier cost attribution calculator<br>• Untagged resource detector and anomaly alerting | Milestone 4 |
| **Phase 5** | **Terraform IaC, Docker & Production Readiness** | • Multi-stage Dockerfiles for Frontend and Backend<br>• Docker Compose local dev stack<br>• Terraform modules for AWS RDS, S3, IAM<br>• GitHub Actions CI/CD workflows | Milestone 5 |

---

## 11. Cost Guardrails & Frugal Architecture
To prevent the monitoring tool itself from generating unnecessary AWS costs:
1. **Cost Explorer API Caching:** AWS charges **$0.01 per Cost Explorer request**. CloudLedger queries Cost Explorer at most once per 6 hours and caches results in PostgreSQL/memory, preventing recurring billing spikes.
2. **CloudTrail S3 vs LookupEvents:** Using `LookupEvents` API is free but limited to 90 days and subject to rate limits. For ongoing operations, CloudLedger consumes logs delivered to S3 with prefix filtering.
3. **AWS Free Tier Compatibility:** Local development runs entirely on Docker Compose with PostgreSQL and mock generators. In AWS, the app runs comfortably on `t4g.micro` or AWS App Runner with Single-AZ `db.t4g.micro` RDS.
