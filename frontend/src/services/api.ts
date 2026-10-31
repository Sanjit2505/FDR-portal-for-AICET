import {
  User, Institution, FDRRecord, DocumentRecord,
  RiskFlag, InvestigationCase, AuditEvent, DashboardSummary, RuleConfig
} from '../types';

const API_BASE = '/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('fdr_guardian_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      errMsg = errData.detail || errData.message || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<{ access_token: string; user: User }>(res);
    localStorage.setItem('fdr_guardian_token', data.access_token);
    localStorage.setItem('fdr_guardian_user', JSON.stringify(data.user));
    return data;
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<User>(res);
  },

  logout() {
    localStorage.removeItem('fdr_guardian_token');
    localStorage.removeItem('fdr_guardian_user');
  },

  // Analytics / Overview
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/analytics/summary`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<DashboardSummary>(res);
  },

  // Institutions
  async getInstitutions(): Promise<Institution[]> {
    const res = await fetch(`${API_BASE}/institutions`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<Institution[]>(res);
  },

  async getInstitution(id: string): Promise<Institution> {
    const res = await fetch(`${API_BASE}/institutions/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<Institution>(res);
  },

  async createInstitution(data: Partial<Institution>): Promise<Institution> {
    const res = await fetch(`${API_BASE}/institutions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<Institution>(res);
  },

  // FDR Registry
  async getFDRs(params?: {
    institution_id?: string;
    bank_name?: string;
    workflow_status?: string;
    risk_band?: string;
    search?: string;
  }): Promise<FDRRecord[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) query.append(k, v);
      });
    }
    const res = await fetch(`${API_BASE}/fdr?${query.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<FDRRecord[]>(res);
  },

  async getFDR(id: string): Promise<FDRRecord> {
    const res = await fetch(`${API_BASE}/fdr/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<FDRRecord>(res);
  },

  async createFDR(data: {
    institution_id: string;
    display_fdr_number: string;
    bank_name: string;
    branch_name: string;
    ifsc_code: string;
    principal_amount: number;
    issue_date: string;
    maturity_date: string;
    renewal_status?: string;
    beneficiary?: string;
  }): Promise<FDRRecord> {
    const res = await fetch(`${API_BASE}/fdr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<FDRRecord>(res);
  },

  async updateFDR(id: string, data: Partial<FDRRecord>): Promise<FDRRecord> {
    const res = await fetch(`${API_BASE}/fdr/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<FDRRecord>(res);
  },

  async reEvaluateFDR(id: string): Promise<FDRRecord> {
    const res = await fetch(`${API_BASE}/fdr/${id}/re-evaluate`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<FDRRecord>(res);
  },

  // Documents
  async getDocumentsByFDR(fdrId: string): Promise<DocumentRecord[]> {
    const res = await fetch(`${API_BASE}/documents/by-fdr/${fdrId}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<DocumentRecord[]>(res);
  },

  async getDocument(documentId: string): Promise<DocumentRecord> {
    const res = await fetch(`${API_BASE}/documents/${documentId}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<DocumentRecord>(res);
  },

  async uploadDocument(fdrId: string, file: File): Promise<DocumentRecord> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/documents/${fdrId}/upload`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    return handleResponse<DocumentRecord>(res);
  },

  async verifyDocumentVersion(versionId: string) {
    const res = await fetch(`${API_BASE}/documents/versions/${versionId}/verify`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{
      status: string;
      recorded_hash: string;
      recomputed_hash: string;
      explanation: string;
    }>(res);
  },

  async simulateDocumentTampering(versionId: string) {
    const res = await fetch(`${API_BASE}/documents/versions/${versionId}/tamper-test`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{
      original_hash: string;
      tampered_hash: string;
      mismatch_detected: boolean;
      explanation: string;
    }>(res);
  },

  getDocumentDownloadUrl(documentId: string): string {
    return `${API_BASE}/documents/${documentId}/download`;
  },

  // Risk & Findings
  async getFindings(params?: {
    rule_id?: string;
    severity?: string;
    status?: string;
    fdr_id?: string;
  }): Promise<RiskFlag[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) query.append(k, v);
      });
    }
    const res = await fetch(`${API_BASE}/risk/findings?${query.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<RiskFlag[]>(res);
  },

  async getFinding(id: string): Promise<RiskFlag> {
    const res = await fetch(`${API_BASE}/risk/findings/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<RiskFlag>(res);
  },

  async takeFindingAction(findingId: string, action: 'dismiss' | 'override' | 'resolve', reason: string): Promise<RiskFlag> {
    const res = await fetch(`${API_BASE}/risk/findings/${findingId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ action, reason }),
    });
    return handleResponse<RiskFlag>(res);
  },

  async getRules(): Promise<RuleConfig[]> {
    const res = await fetch(`${API_BASE}/risk/rules`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<RuleConfig[]>(res);
  },

  async updateRule(ruleId: string, data: Partial<RuleConfig>): Promise<RuleConfig> {
    const res = await fetch(`${API_BASE}/risk/rules/${ruleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<RuleConfig>(res);
  },

  // Graph
  async getRelationshipGraph(params?: { institution_id?: string; fdr_id?: string }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) query.append(k, v);
      });
    }
    const res = await fetch(`${API_BASE}/graph?${query.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{
      nodes: any[];
      edges: any[];
      summary: any;
    }>(res);
  },

  // Cases
  async getCases(params?: { status?: string; priority?: string }): Promise<InvestigationCase[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) query.append(k, v);
      });
    }
    const res = await fetch(`${API_BASE}/cases?${query.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<InvestigationCase[]>(res);
  },

  async getCase(id: string): Promise<InvestigationCase> {
    const res = await fetch(`${API_BASE}/cases/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<InvestigationCase>(res);
  },

  async createCase(data: { fdr_id: string; title: string; summary: string; priority: string }): Promise<InvestigationCase> {
    const res = await fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<InvestigationCase>(res);
  },

  async addCaseNote(caseId: string, note_text: string): Promise<InvestigationCase> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ note_text }),
    });
    return handleResponse<InvestigationCase>(res);
  },

  async updateCaseStatus(caseId: string, status: string, reason?: string): Promise<InvestigationCase> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, reason }),
    });
    return handleResponse<InvestigationCase>(res);
  },

  async assignCase(caseId: string, assigned_to: string, notes?: string): Promise<InvestigationCase> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ assigned_to, notes }),
    });
    return handleResponse<InvestigationCase>(res);
  },

  async recordCaseDecision(caseId: string, decision: string, decision_notes: string): Promise<InvestigationCase> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ decision, decision_notes }),
    });
    return handleResponse<InvestigationCase>(res);
  },

  // Maturity
  async getMaturityPlanner(institution_id?: string) {
    const query = institution_id ? `?institution_id=${institution_id}` : '';
    const res = await fetch(`${API_BASE}/maturity/planner${query}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{
      as_of_date: string;
      totals: Record<string, number>;
      counts: Record<string, number>;
      buckets: Record<string, any[]>;
    }>(res);
  },

  async getNotifications() {
    const res = await fetch(`${API_BASE}/maturity/notifications`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any[]>(res);
  },

  async markNotificationRead(id: string) {
    const res = await fetch(`${API_BASE}/maturity/notifications/${id}/read`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async runScenarioAnalysis(window_days: number, renewal_rate_pct: number, expected_interest_rate_pct: number) {
    const res = await fetch(`${API_BASE}/maturity/scenario-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ window_days, renewal_rate_pct, expected_interest_rate_pct }),
    });
    return handleResponse<any>(res);
  },

  // Audit
  async getAuditEvents(limit = 50, offset = 0): Promise<AuditEvent[]> {
    const res = await fetch(`${API_BASE}/audit/events?limit=${limit}&offset=${offset}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<AuditEvent[]>(res);
  },

  async verifyAuditChain() {
    const res = await fetch(`${API_BASE}/audit/verify-chain`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{
      is_valid: boolean;
      total_events: number;
      tampered_sequence?: number;
      message: string;
      verified_at: string;
    }>(res);
  },

  // Reports
  getFDRsCSVUrl(institution_id?: string): string {
    const query = institution_id ? `?institution_id=${institution_id}` : '';
    return `${API_BASE}/reports/fdr/csv${query}`;
  },

  getFindingsCSVUrl(): string {
    return `${API_BASE}/reports/findings/csv`;
  }
};
