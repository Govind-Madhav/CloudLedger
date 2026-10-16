const API_BASE = '/api/v1';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface OverviewKPIs {
  total_cost: number;
  direct_cost: number;
  estimated_cost: number;
  unallocated_cost: number;
  student_count: number;
  active_resource_count: number;
  untagged_resource_count: number;
  open_alerts_count: number;
  is_demo_mode: boolean;
}

export interface DailyTrendPoint {
  date: string;
  direct: number;
  estimated: number;
  unallocated: number;
  total: number;
}

export interface ServiceBreakdownPoint {
  service: string;
  cost: number;
  percentage: number;
}

export interface TopSpender {
  id: string;
  full_name: string;
  student_id: string;
  budget_limit: number;
  total_spent: number;
  percentage_used: number;
}

export interface DashboardData {
  kpis: OverviewKPIs;
  daily_trends: DailyTrendPoint[];
  service_breakdown: ServiceBreakdownPoint[];
  top_spenders: TopSpender[];
}

export interface Student {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  course_code: string;
  budget_limit: number;
  status: string;
  total_spend: number;
  active_resource_count: number;
  budget_used_percentage: number;
  iam_identities: {
    id: string;
    iam_username: string;
    iam_user_arn: string;
    account_id: string;
    status: string;
  }[];
}

export interface AWSResourceItem {
  id: string;
  resource_arn: string;
  resource_id: string;
  service_name: string;
  resource_type: string;
  region: string;
  current_status: string;
  tags: Record<string, string>;
  is_tagged_compliant: boolean;
  is_demo: boolean;
  attributed_student_id?: string;
  attributed_student_name?: string;
  discovered_at: string;
}

export interface ActivityEventItem {
  id: string;
  event_id: string;
  event_time: string;
  event_name: string;
  event_source: string;
  aws_region: string;
  iam_username?: string;
  student_name?: string;
  resource_id?: string;
  is_mutation: boolean;
  is_demo: boolean;
}

export interface CostAttributionItem {
  id: string;
  student_id?: string;
  student_name?: string;
  resource_id?: string;
  attributed_amount: number;
  attribution_tier: 'direct' | 'estimated' | 'unallocated';
  confidence_score: number;
  billing_date: string;
  notes?: string;
  is_demo: boolean;
}

export interface AlertItem {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  student_name?: string;
  is_acknowledged: boolean;
  created_at: string;
}

export interface SyncStatusItem {
  last_sync?: string;
  collector_type: string;
  status: string;
  records_processed: number;
  is_mock: boolean;
}

// Token storage
export const getToken = (): string | null => localStorage.getItem('cloudledger_token');
export const setToken = (t: string) => localStorage.setItem('cloudledger_token', t);
export const removeToken = () => localStorage.removeItem('cloudledger_token');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken();
    window.dispatchEvent(new Event('auth_expired'));
    throw new Error('Authentication expired. Please log in.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ access_token: string; admin: AdminUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => request<AdminUser>('/auth/me'),

  // Analytics
  getOverview: () => request<DashboardData>('/analytics/overview'),

  // Students
  listStudents: (params?: { search?: string; course_code?: string; over_budget_only?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.course_code) q.append('course_code', params.course_code);
    if (params?.over_budget_only) q.append('over_budget_only', 'true');
    return request<Student[]>(`/students?${q.toString()}`);
  },
  createStudent: (data: { student_id: string; full_name: string; email: string; course_code: string; budget_limit: number; iam_username?: string }) =>
    request<Student>('/students', { method: 'POST', body: JSON.stringify(data) }),
  getStudentDetail: (id: string) => request<any>(`/students/${id}`),
  mapIAM: (studentId: string, iam_username: string) =>
    request<{ message: string }>(`/students/${studentId}/map-iam`, {
      method: 'POST',
      body: JSON.stringify({ iam_username }),
    }),

  // Resources
  listResources: (params?: { service_name?: string; untagged_only?: boolean; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.service_name) q.append('service_name', params.service_name);
    if (params?.untagged_only) q.append('untagged_only', 'true');
    if (params?.search) q.append('search', params.search);
    return request<AWSResourceItem[]>(`/resources?${q.toString()}`);
  },
  reassignResource: (id: string, student_id: string | null) =>
    request<{ message: string }>(`/resources/${id}/reassign`, {
      method: 'POST',
      body: JSON.stringify({ student_id }),
    }),

  // Activity
  listActivity: (limit = 50) => request<ActivityEventItem[]>(`/activity?limit=${limit}`),

  // Costs
  listAttributions: (tier?: string) => {
    const q = tier ? `?attribution_tier=${tier}` : '';
    return request<CostAttributionItem[]>(`/costs/attributions${q}`);
  },

  // System
  getSyncStatus: () => request<SyncStatusItem[]>('/system/sync-status'),
  triggerSync: () => request<{ message: string; records_added: number; status: string }>('/system/trigger-sync', { method: 'POST' }),
  seedDemo: () => request<{ message: string }>('/system/seed-demo', { method: 'POST' }),
  listAlerts: () => request<AlertItem[]>('/system/alerts'),
  acknowledgeAlert: (id: string) => request<{ message: string }>(`/system/alerts/${id}/ack`, { method: 'POST' }),
};
