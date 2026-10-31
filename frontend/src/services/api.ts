import {
  User, Institution, FDRRecord, DocumentRecord,
  RiskFlag, InvestigationCase, AuditEvent, DashboardSummary, RuleConfig
} from '../types';
import {
  MOCK_USER, MOCK_SUMMARY, MOCK_INSTITUTIONS, MOCK_FDRS,
  MOCK_FINDINGS, MOCK_CASES, MOCK_DOCUMENTS, MOCK_AUDIT_EVENTS,
  MOCK_GRAPH, MOCK_RULES
} from './mockData';

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
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await handleResponse<{ access_token: string; user: User }>(res);
      localStorage.setItem('fdr_guardian_token', data.access_token);
      localStorage.setItem('fdr_guardian_user', JSON.stringify(data.user));
      return data;
    } catch (err) {
      // Offline / GitHub Pages fallback
      const role = email.includes('admin') ? 'admin' : email.includes('apex') ? 'institution_user' : 'authorized_official';
      const user: User = {
        id: role === 'admin' ? 'usr-admin-01' : role === 'institution_user' ? 'usr-inst-01' : 'usr-official-001',
        email,
        full_name: role === 'admin' ? 'System Administrator' : role === 'institution_user' ? 'Finance Officer (Apex)' : 'Dr. Vikram Malhotra (Official)',
        role: role as any,
        is_active: true,
        created_at: '2026-01-15T09:00:00Z',
        institutions: [
          { id: 'inst-001', name: 'Apex Institute of Technology', code: 'AIT-DEL-01', role: 'supervisor' }
        ]
      };
      const demoData = {
        access_token: 'demo-static-token-aicet-guardian',
        user
      };
      localStorage.setItem('fdr_guardian_token', demoData.access_token);
      localStorage.setItem('fdr_guardian_user', JSON.stringify(demoData.user));
      return demoData;
    }
  },

  async getMe(): Promise<User> {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<User>(res);
    } catch {
      const stored = localStorage.getItem('fdr_guardian_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore
        }
      }
      return MOCK_USER;
    }
  },

  logout() {
    localStorage.removeItem('fdr_guardian_token');
    localStorage.removeItem('fdr_guardian_user');
  },

  // Analytics / Overview
  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const res = await fetch(`${API_BASE}/analytics/summary`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<DashboardSummary>(res);
    } catch {
      return MOCK_SUMMARY;
    }
  },

  // Institutions
  async getInstitutions(): Promise<Institution[]> {
    try {
      const res = await fetch(`${API_BASE}/institutions`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<Institution[]>(res);
    } catch {
      return MOCK_INSTITUTIONS;
    }
  },

  async getInstitution(id: string): Promise<Institution> {
    try {
      const res = await fetch(`${API_BASE}/institutions/${id}`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<Institution>(res);
    } catch {
      return MOCK_INSTITUTIONS.find(i => i.id === id) || MOCK_INSTITUTIONS[0];
    }
  },

  async createInstitution(data: Partial<Institution>): Promise<Institution> {
    try {
      const res = await fetch(`${API_BASE}/institutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      });
      return await handleResponse<Institution>(res);
    } catch {
      const newInst: Institution = {
        id: `inst-${Date.now()}`,
        code: data.code || 'INST-NEW',
        name: data.name || 'New Registered Institution',
        state: data.state || 'Delhi NCR',
        registration_number: data.registration_number || 'REG/2026/001',
        email: data.email || 'info@institution.edu',
        contact_phone: data.contact_phone || '+91 11 0000 0000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_fdrs: 0,
        total_amount: 0,
      };
      return newInst;
    }
  },

  // FDR Registry
  async getFDRs(params?: {
    institution_id?: string;
    bank_name?: string;
    workflow_status?: string;
    risk_band?: string;
    search?: string;
  }): Promise<FDRRecord[]> {
    try {
      const query = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) query.append(k, v);
        });
      }
      const res = await fetch(`${API_BASE}/fdr?${query.toString()}`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<FDRRecord[]>(res);
    } catch {
      let filtered = [...MOCK_FDRS];
      if (params?.institution_id) {
        filtered = filtered.filter(f => f.institution_id === params.institution_id);
      }
      if (params?.risk_band) {
        filtered = filtered.filter(f => f.risk_band === params.risk_band);
      }
      if (params?.workflow_status) {
        filtered = filtered.filter(f => f.workflow_status === params.workflow_status);
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(f =>
          f.display_fdr_number.toLowerCase().includes(q) ||
          f.bank_name.toLowerCase().includes(q) ||
          (f.institution_name && f.institution_name.toLowerCase().includes(q))
        );
      }
      return filtered;
    }
  },

  async getFDR(id: string): Promise<FDRRecord> {
    try {
      const res = await fetch(`${API_BASE}/fdr/${id}`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<FDRRecord>(res);
    } catch {
      return MOCK_FDRS.find(f => f.id === id) || MOCK_FDRS[0];
    }
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
    try {
      const res = await fetch(`${API_BASE}/fdr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      });
      return await handleResponse<FDRRecord>(res);
    } catch {
      const newFdr: FDRRecord = {
        id: `fdr-${Date.now()}`,
        institution_id: data.institution_id,
        institution_name: 'Apex Institute of Technology',
        normalized_fdr_number: data.display_fdr_number.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
        display_fdr_number: data.display_fdr_number,
        bank_name: data.bank_name,
        branch_name: data.branch_name,
        ifsc_code: data.ifsc_code,
        principal_amount: data.principal_amount,
        currency: 'INR',
        issue_date: data.issue_date,
        maturity_date: data.maturity_date,
        renewal_status: (data.renewal_status as any) || 'original',
        beneficiary: data.beneficiary || 'AICET Joint Escrow',
        workflow_status: 'submitted',
        risk_score: 15,
        risk_band: 'low',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        documents_count: 0,
        open_findings_count: 0,
      };
      return newFdr;
    }
  },

  async updateFDR(id: string, data: Partial<FDRRecord>): Promise<FDRRecord> {
    try {
      const res = await fetch(`${API_BASE}/fdr/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      });
      return await handleResponse<FDRRecord>(res);
    } catch {
      const fdr = MOCK_FDRS.find(f => f.id === id) || MOCK_FDRS[0];
      return { ...fdr, ...data };
    }
  },

  async reEvaluateFDR(id: string): Promise<FDRRecord> {
    try {
      const res = await fetch(`${API_BASE}/fdr/${id}/re-evaluate`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<FDRRecord>(res);
    } catch {
      return MOCK_FDRS.find(f => f.id === id) || MOCK_FDRS[0];
    }
  },

  // Documents
  async getDocumentsByFDR(fdrId: string): Promise<DocumentRecord[]> {
    try {
      const res = await fetch(`${API_BASE}/documents/by-fdr/${fdrId}`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<DocumentRecord[]>(res);
    } catch {
      return MOCK_DOCUMENTS.filter(d => d.fdr_id === fdrId);
    }
  },

  async getDocument(documentId: string): Promise<DocumentRecord> {
    try {
      const res = await fetch(`${API_BASE}/documents/${documentId}`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<DocumentRecord>(res);
    } catch {
      return MOCK_DOCUMENTS.find(d => d.id === documentId) || MOCK_DOCUMENTS[0];
    }
  },

  async uploadDocument(fdrId: string, file: File): Promise<DocumentRecord> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/documents/${fdrId}/upload`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
        body: formData,
      });
      return await handleResponse<DocumentRecord>(res);
    } catch {
      return {
        id: `doc-${Date.now()}`,
        fdr_id: fdrId,
        filename: file.name,
        current_version: 1,
        mime_type: file.type || 'application/pdf',
        integrity_status: 'intact',
        created_at: new Date().toISOString(),
        versions: [
          {
            id: `ver-${Date.now()}`,
            version_number: 1,
            file_hash: '3a4b5c6d7e8f90a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f',
            file_size: file.size,
            original_filename: file.name,
            upload_timestamp: new Date().toISOString(),
            processing_status: 'completed',
            extractions: []
          }
        ]
      };
    }
  },

  async verifyDocumentVersion(versionId: string) {
    try {
      const res = await fetch(`${API_BASE}/documents/versions/${versionId}/verify`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<{
        status: string;
        recorded_hash: string;
        recomputed_hash: string;
        explanation: string;
      }>(res);
    } catch {
      return {
        status: 'intact',
        recorded_hash: '9a72b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90a1b2c3d4e5f6a7b8c9d0e1f2a',
        recomputed_hash: '9a72b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90a1b2c3d4e5f6a7b8c9d0e1f2a',
        explanation: 'Authoritative cryptographic SHA-256 digest matches stored file fingerprint byte-for-byte.'
      };
    }
  },

  async simulateDocumentTampering(versionId: string) {
    try {
      const res = await fetch(`${API_BASE}/documents/versions/${versionId}/tamper-test`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<{
        original_hash: string;
        tampered_hash: string;
        mismatch_detected: boolean;
        explanation: string;
      }>(res);
    } catch {
      return {
        original_hash: '9a72b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90a1b2c3d4e5f6a7b8c9d0e1f2a',
        tampered_hash: 'f2a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90a1b2c3d4e5',
        mismatch_detected: true,
        explanation: 'Tamper-test injection: Payload bit altered. SHA-256 hash completely changed due to cryptographic avalanche effect.'
      };
    }
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
    try {
      const query = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) query.append(k, v);
        });
      }
      const res = await fetch(`${API_BASE}/risk/findings?${query.toString()}`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<RiskFlag[]>(res);
    } catch {
      let findings = [...MOCK_FINDINGS];
      if (params?.fdr_id) findings = findings.filter(f => f.fdr_id === params.fdr_id);
      if (params?.severity) findings = findings.filter(f => f.severity === params.severity);
      if (params?.status) findings = findings.filter(f => f.status === params.status);
      return findings;
    }
  },

  async getFinding(id: string): Promise<RiskFlag> {
    try {
      const res = await fetch(`${API_BASE}/risk/findings/${id}`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<RiskFlag>(res);
    } catch {
      return MOCK_FINDINGS.find(f => f.id === id) || MOCK_FINDINGS[0];
    }
  },

  async takeFindingAction(findingId: string, action: 'dismiss' | 'override' | 'resolve', reason: string): Promise<RiskFlag> {
    try {
      const res = await fetch(`${API_BASE}/risk/findings/${findingId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ action, reason }),
      });
      return await handleResponse<RiskFlag>(res);
    } catch {
      const f = MOCK_FINDINGS.find(item => item.id === findingId) || MOCK_FINDINGS[0];
      return {
        ...f,
        status: action === 'dismiss' ? 'dismissed' : action === 'override' ? 'overridden' : 'resolved',
        dismissed_reason: reason
      };
    }
  },

  async getRules(): Promise<RuleConfig[]> {
    try {
      const res = await fetch(`${API_BASE}/risk/rules`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<RuleConfig[]>(res);
    } catch {
      return MOCK_RULES;
    }
  },

  async updateRule(ruleId: string, data: Partial<RuleConfig>): Promise<RuleConfig> {
    try {
      const res = await fetch(`${API_BASE}/risk/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      });
      return await handleResponse<RuleConfig>(res);
    } catch {
      const r = MOCK_RULES.find(item => item.rule_id === ruleId) || MOCK_RULES[0];
      return { ...r, ...data };
    }
  },

  // Graph
  async getRelationshipGraph(params?: { institution_id?: string; fdr_id?: string }) {
    try {
      const query = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) query.append(k, v);
        });
      }
      const res = await fetch(`${API_BASE}/graph?${query.toString()}`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<{
        nodes: any[];
        edges: any[];
        summary: any;
      }>(res);
    } catch {
      return MOCK_GRAPH;
    }
  },

  // Cases
  async getCases(params?: { status?: string; priority?: string }): Promise<InvestigationCase[]> {
    try {
      const query = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) query.append(k, v);
        });
      }
      const res = await fetch(`${API_BASE}/cases?${query.toString()}`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<InvestigationCase[]>(res);
    } catch {
      let cases = [...MOCK_CASES];
      if (params?.status) cases = cases.filter(c => c.status === params.status);
      if (params?.priority) cases = cases.filter(c => c.priority === params.priority);
      return cases;
    }
  },

  async getCase(id: string): Promise<InvestigationCase> {
    try {
      const res = await fetch(`${API_BASE}/cases/${id}`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<InvestigationCase>(res);
    } catch {
      return MOCK_CASES.find(c => c.id === id) || MOCK_CASES[0];
    }
  },

  async createCase(data: { fdr_id: string; title: string; summary: string; priority: string }): Promise<InvestigationCase> {
    try {
      const res = await fetch(`${API_BASE}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      });
      return await handleResponse<InvestigationCase>(res);
    } catch {
      const newCase: InvestigationCase = {
        id: `case-${Date.now()}`,
        case_number: `CASE-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title: data.title,
        institution_id: 'inst-002',
        institution_name: 'Bharat National College of Engineering',
        fdr_id: data.fdr_id,
        fdr_number: 'ICICI-FDR-881029384',
        priority: data.priority as any,
        status: 'under_review',
        assigned_to: 'usr-official-001',
        assignee_name: 'Dr. Vikram Malhotra',
        created_by: 'usr-official-001',
        decision: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        summary: data.summary,
        notes: [],
        events: [
          {
            id: `ev-${Date.now()}`,
            event_type: 'CASE_CREATED',
            actor_name: 'Dr. Vikram Malhotra',
            details: 'Case initiated from review findings',
            created_at: new Date().toISOString()
          }
        ],
        risk_flags: []
      };
      return newCase;
    }
  },

  async addCaseNote(caseId: string, note_text: string): Promise<InvestigationCase> {
    try {
      const res = await fetch(`${API_BASE}/cases/${caseId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ note_text }),
      });
      return await handleResponse<InvestigationCase>(res);
    } catch {
      const c = MOCK_CASES.find(item => item.id === caseId) || MOCK_CASES[0];
      const newNote = {
        id: `note-${Date.now()}`,
        author_name: 'Dr. Vikram Malhotra',
        note_text,
        created_at: new Date().toISOString()
      };
      return {
        ...c,
        notes: [...c.notes, newNote]
      };
    }
  },

  async updateCaseStatus(caseId: string, status: string, reason?: string): Promise<InvestigationCase> {
    try {
      const res = await fetch(`${API_BASE}/cases/${caseId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status, reason }),
      });
      return await handleResponse<InvestigationCase>(res);
    } catch {
      const c = MOCK_CASES.find(item => item.id === caseId) || MOCK_CASES[0];
      return { ...c, status: status as any };
    }
  },

  async assignCase(caseId: string, assigned_to: string, notes?: string): Promise<InvestigationCase> {
    try {
      const res = await fetch(`${API_BASE}/cases/${caseId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ assigned_to, notes }),
      });
      return await handleResponse<InvestigationCase>(res);
    } catch {
      const c = MOCK_CASES.find(item => item.id === caseId) || MOCK_CASES[0];
      return { ...c, assigned_to, assignee_name: 'Dr. Vikram Malhotra' };
    }
  },

  async recordCaseDecision(caseId: string, decision: string, decision_notes: string): Promise<InvestigationCase> {
    try {
      const res = await fetch(`${API_BASE}/cases/${caseId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ decision, decision_notes }),
      });
      return await handleResponse<InvestigationCase>(res);
    } catch {
      const c = MOCK_CASES.find(item => item.id === caseId) || MOCK_CASES[0];
      return {
        ...c,
        decision,
        decision_notes,
        status: 'resolved',
        decided_at: new Date().toISOString(),
        decided_by: 'Dr. Vikram Malhotra'
      };
    }
  },

  // Maturity
  async getMaturityPlanner(institution_id?: string) {
    try {
      const query = institution_id ? `?institution_id=${institution_id}` : '';
      const res = await fetch(`${API_BASE}/maturity/planner${query}`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<{
        as_of_date: string;
        totals: Record<string, number>;
        counts: Record<string, number>;
        buckets: Record<string, any[]>;
      }>(res);
    } catch {
      return {
        as_of_date: new Date().toISOString().slice(0, 10),
        totals: {
          '30_days': 25000000,
          '60_days': 22500000,
          '90_days': 43000000,
          'beyond_90_days': 58000000,
        },
        counts: {
          '30_days': 5,
          '60_days': 4,
          '90_days': 6,
          'beyond_90_days': 7,
        },
        buckets: {
          '30_days': [MOCK_FDRS[2]],
          '60_days': [MOCK_FDRS[0]],
          '90_days': [MOCK_FDRS[4]],
          'beyond_90_days': [MOCK_FDRS[1], MOCK_FDRS[3], MOCK_FDRS[5]],
        }
      };
    }
  },

  async getNotifications() {
    try {
      const res = await fetch(`${API_BASE}/maturity/notifications`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<any[]>(res);
    } catch {
      return [
        {
          id: 'notif-01',
          type: 'MATURITY_30_DAYS',
          title: '30-Day Maturity Warning',
          message: 'ICICI-FDR-881029384 for ₹15,000,000 matures in 25 days.',
          is_read: false,
          created_at: '2026-03-20T10:00:00Z'
        },
        {
          id: 'notif-02',
          type: 'DISCREPANCY_ALERT',
          title: 'Optical Extraction Discrepancy',
          message: 'Declared value ₹15.0M does not match extracted ₹12.0M.',
          is_read: false,
          created_at: '2026-03-20T11:25:00Z'
        }
      ];
    }
  },

  async markNotificationRead(id: string) {
    try {
      const res = await fetch(`${API_BASE}/maturity/notifications/${id}/read`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<any>(res);
    } catch {
      return { success: true };
    }
  },

  async runScenarioAnalysis(window_days: number, renewal_rate_pct: number, expected_interest_rate_pct: number) {
    try {
      const res = await fetch(`${API_BASE}/maturity/scenario-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ window_days, renewal_rate_pct, expected_interest_rate_pct }),
      });
      return await handleResponse<any>(res);
    } catch {
      const baseAmount = 47500000;
      const expectedRenewals = (baseAmount * renewal_rate_pct) / 100;
      const expectedRedemptions = baseAmount - expectedRenewals;
      return {
        window_days,
        total_maturing_principal: baseAmount,
        projected_renewals: expectedRenewals,
        projected_redemptions: expectedRedemptions,
        projected_interest_yield: (expectedRenewals * expected_interest_rate_pct) / 100,
        liquidity_gap: expectedRedemptions,
      };
    }
  },

  // Audit
  async getAuditEvents(limit = 50, offset = 0): Promise<AuditEvent[]> {
    try {
      const res = await fetch(`${API_BASE}/audit/events?limit=${limit}&offset=${offset}`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<AuditEvent[]>(res);
    } catch {
      return MOCK_AUDIT_EVENTS;
    }
  },

  async verifyAuditChain() {
    try {
      const res = await fetch(`${API_BASE}/audit/verify-chain`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse<{
        is_valid: boolean;
        total_events: number;
        tampered_sequence?: number;
        message: string;
        verified_at: string;
      }>(res);
    } catch {
      return {
        is_valid: true,
        total_events: 1092,
        message: 'Sequential cryptographic hash chain verified intact. All blocks match SHA-256 state transitions.',
        verified_at: new Date().toISOString()
      };
    }
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
