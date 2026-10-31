export type UserRole = 'admin' | 'authorized_official' | 'institution_user';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  institutions?: Array<{
    id: string;
    name: string;
    code: string;
    role: string;
  }>;
}

export interface Institution {
  id: string;
  code: string;
  name: string;
  state: string;
  registration_number?: string;
  email?: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
  total_fdrs: number;
  total_amount: number;
}

export type RenewalStatus = 'original' | 'renewed' | 'replacement';
export type WorkflowStatus = 'submitted' | 'under_review' | 'verified' | 'discrepant' | 'investigating' | 'resolved';
export type RiskBand = 'low' | 'medium' | 'high' | 'critical';

export interface FDRRecord {
  id: string;
  institution_id: string;
  institution_name?: string;
  normalized_fdr_number: string;
  display_fdr_number: string;
  bank_name: string;
  branch_name: string;
  ifsc_code: string;
  principal_amount: number;
  currency: string;
  issue_date: string;
  maturity_date: string;
  renewal_status: RenewalStatus;
  previous_fdr_id?: string;
  replacement_fdr_id?: string;
  beneficiary?: string;
  workflow_status: WorkflowStatus;
  risk_score: number;
  risk_band: RiskBand;
  created_by?: string;
  created_at: string;
  updated_at: string;
  documents_count: number;
  open_findings_count: number;
}

export interface Extraction {
  id: string;
  field_name: string;
  extracted_value?: string;
  normalized_value?: string;
  confidence: number;
  extraction_method: string;
  source_page: number;
  bounding_box?: string;
  raw_context?: string;
  created_at: string;
}

export interface DocumentVersion {
  id: string;
  version_number: number;
  file_hash: string;
  file_size: number;
  original_filename: string;
  upload_timestamp: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  extractions: Extraction[];
}

export interface DocumentRecord {
  id: string;
  fdr_id: string;
  filename: string;
  current_version: number;
  mime_type: string;
  integrity_status: 'intact' | 'modified' | 'missing' | 'unverified';
  created_at: string;
  versions: DocumentVersion[];
}

export interface RiskFlag {
  id: string;
  fdr_id: string;
  rule_id: string;
  rule_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  expected_value?: string;
  observed_value?: string;
  suggested_action?: string;
  status: 'open' | 'dismissed' | 'overridden' | 'resolved';
  dismissed_reason?: string;
  reviewed_by?: string;
  source_page?: number;
  supporting_evidence?: string;
  created_at: string;
  updated_at: string;
  fdr_number?: string;
  institution_name?: string;
}

export interface CaseNote {
  id: string;
  author_id?: string;
  author_name?: string;
  note_text: string;
  created_at: string;
}

export interface CaseEvent {
  id: string;
  event_type: string;
  actor_id?: string;
  actor_name?: string;
  details?: string;
  created_at: string;
}

export interface InvestigationCase {
  id: string;
  case_number: string;
  fdr_id: string;
  institution_id: string;
  title: string;
  summary: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'under_review' | 'awaiting_information' | 'escalated' | 'resolved' | 'dismissed';
  assigned_to?: string;
  assignee_name?: string;
  created_by?: string;
  decision: string;
  decision_notes?: string;
  decided_at?: string;
  decided_by?: string;
  created_at: string;
  updated_at: string;
  institution_name?: string;
  fdr_number?: string;
  notes: CaseNote[];
  events: CaseEvent[];
  risk_flags: RiskFlag[];
}

export interface AuditEvent {
  id: string;
  sequence_number: number;
  event_id: string;
  actor_id?: string;
  actor_name?: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: string;
  previous_hash: string;
  current_hash: string;
  timestamp: string;
}

export interface DashboardSummary {
  total_fdrs: number;
  total_institutions: number;
  total_principal_amount: number;
  open_findings_count: number;
  high_priority_findings: number;
  open_cases_count: number;
  upcoming_maturities_30d: number;
  overdue_actions_count: number;
  integrity_failures_count: number;
  maturity_distribution: Array<{ bucket: string; count: number; fill: string }>;
  findings_by_rule: Array<{ rule_id: string; rule_name: string; count: number }>;
  cases_by_status: Array<{ status: string; count: number }>;
  recent_activity: Array<{
    id: string;
    sequence_number: number;
    event_type: string;
    entity_type: string;
    entity_id: string;
    actor_name: string;
    timestamp: string;
  }>;
}

export interface RuleConfig {
  rule_id: string;
  rule_name: string;
  description: string;
  weight: number;
  is_enabled: boolean;
  parameters?: string;
}

