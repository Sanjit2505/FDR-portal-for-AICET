import {
  User, Institution, FDRRecord, DocumentRecord,
  RiskFlag, InvestigationCase, AuditEvent, DashboardSummary, RuleConfig
} from '../types';

export const MOCK_USER: User = {
  id: 'usr-official-001',
  email: 'official@aicet.gov.in',
  full_name: 'Dr. Vikram Malhotra (Official)',
  role: 'authorized_official',
  is_active: true,
  created_at: '2026-01-15T09:00:00Z',
  institutions: [
    { id: 'inst-001', name: 'Apex Institute of Technology', code: 'AIT-DEL-01', role: 'supervisor' }
  ]
};

export const MOCK_SUMMARY: DashboardSummary = {
  total_fdrs: 22,
  total_institutions: 5,
  total_principal_amount: 148500000,
  open_findings_count: 8,
  high_priority_findings: 5,
  open_cases_count: 3,
  upcoming_maturities_30d: 5,
  overdue_actions_count: 1,
  integrity_failures_count: 0,
  maturity_distribution: [
    { bucket: '0-30 Days', count: 5, fill: '#ef4444' },
    { bucket: '31-60 Days', count: 4, fill: '#f59e0b' },
    { bucket: '61-90 Days', count: 6, fill: '#3b82f6' },
    { bucket: '90+ Days', count: 7, fill: '#10b981' },
  ],
  findings_by_rule: [
    { rule_id: 'R1_DUPLICATE_NUMBER', rule_name: 'Duplicate FDR Number', count: 2 },
    { rule_id: 'R3_AMOUNT_MISMATCH', rule_name: 'Amount Optical Extraction Mismatch', count: 2 },
    { rule_id: 'R7_SPLIT_DEPOSIT', rule_name: 'Split Structuring Anomaly', count: 2 },
    { rule_id: 'R4_BRANCH_IFSC_MISMATCH', rule_name: 'Branch / IFSC Inconsistency', count: 1 },
    { rule_id: 'R6_INVALID_BENEFICIARY', rule_name: 'Missing Regulatory Lien', count: 1 },
  ],
  cases_by_status: [
    { status: 'under_review', count: 2 },
    { status: 'new', count: 1 },
    { status: 'resolved', count: 1 },
  ],
  recent_activity: [
    {
      id: 'aud-001',
      sequence_number: 1092,
      event_type: 'RISK_SCORE_COMPUTED',
      entity_type: 'FDRRecord',
      entity_id: 'fdr-003',
      actor_name: 'FDR Guardian Engine',
      timestamp: '2026-03-20T11:20:00Z',
    },
    {
      id: 'aud-002',
      sequence_number: 1091,
      event_type: 'DOCUMENT_UPLOADED',
      entity_type: 'DocumentRecord',
      entity_id: 'doc-003',
      actor_name: 'BNC Accounts Desk',
      timestamp: '2026-03-20T11:14:22Z',
    },
    {
      id: 'aud-003',
      sequence_number: 1090,
      event_type: 'USER_LOGIN',
      entity_type: 'User',
      entity_id: 'usr-official-001',
      actor_name: 'Dr. Vikram Malhotra',
      timestamp: '2026-03-20T10:00:15Z',
    }
  ],
};

export const MOCK_INSTITUTIONS: Institution[] = [
  {
    id: 'inst-001',
    code: 'AIT-DEL-01',
    name: 'Apex Institute of Technology',
    state: 'Delhi NCR',
    registration_number: 'DEL/ENG/2012/8821',
    email: 'registrar@apex-institute.edu.in',
    contact_phone: '+91 11 2685 4100',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-03-15T12:00:00Z',
    total_fdrs: 6,
    total_amount: 45000000,
  },
  {
    id: 'inst-002',
    code: 'BNC-BLR-02',
    name: 'Bharat National College of Engineering',
    state: 'Karnataka',
    registration_number: 'KA/TECH/2015/4412',
    email: 'admin@bnce.ac.in',
    contact_phone: '+91 80 4122 8900',
    created_at: '2026-01-12T11:00:00Z',
    updated_at: '2026-03-20T14:30:00Z',
    total_fdrs: 5,
    total_amount: 32500000,
  },
  {
    id: 'inst-003',
    code: 'CVS-MAH-03',
    name: 'Crescent Valley Institute of Science',
    state: 'Maharashtra',
    registration_number: 'MH/EDU/2018/1904',
    email: 'accounts@crescentvalley.edu.in',
    contact_phone: '+91 22 2570 9940',
    created_at: '2026-01-15T09:30:00Z',
    updated_at: '2026-03-22T16:15:00Z',
    total_fdrs: 4,
    total_amount: 28000000,
  },
  {
    id: 'inst-004',
    code: 'DAM-HYD-04',
    name: 'Deccan Academy of Management Studies',
    state: 'Telangana',
    registration_number: 'TS/MGT/2016/7732',
    email: 'compliance@deccan.ac.in',
    contact_phone: '+91 40 2311 5500',
    created_at: '2026-01-18T14:00:00Z',
    updated_at: '2026-03-25T11:20:00Z',
    total_fdrs: 4,
    total_amount: 25000000,
  },
  {
    id: 'inst-005',
    code: 'ZGP-TN-05',
    name: 'Zenith Global Polytechnic',
    state: 'Tamil Nadu',
    registration_number: 'TN/POLY/2019/3321',
    email: 'fdr.desk@zenithpoly.edu.in',
    contact_phone: '+91 44 2254 1120',
    created_at: '2026-01-20T16:45:00Z',
    updated_at: '2026-03-28T09:50:00Z',
    total_fdrs: 3,
    total_amount: 18000000,
  },
];

export const MOCK_FDRS: FDRRecord[] = [
  {
    id: 'fdr-001',
    institution_id: 'inst-001',
    institution_name: 'Apex Institute of Technology',
    normalized_fdr_number: 'SBIN00040182910',
    display_fdr_number: 'SBIN/2026/FDR-40182',
    bank_name: 'State Bank of India',
    branch_name: 'Parliament Street, New Delhi',
    ifsc_code: 'SBIN0000691',
    principal_amount: 10000000,
    currency: 'INR',
    issue_date: '2025-06-15',
    maturity_date: '2026-06-15',
    renewal_status: 'original',
    beneficiary: 'All India Council for Evidence Verification',
    workflow_status: 'verified',
    risk_score: 12,
    risk_band: 'low',
    created_at: '2026-01-15T10:30:00Z',
    updated_at: '2026-03-10T14:20:00Z',
    documents_count: 2,
    open_findings_count: 0,
  },
  {
    id: 'fdr-002',
    institution_id: 'inst-001',
    institution_name: 'Apex Institute of Technology',
    normalized_fdr_number: 'HDFC99281740291',
    display_fdr_number: 'HDFC/FDR/2025/9928',
    bank_name: 'HDFC Bank',
    branch_name: 'Connaught Place, New Delhi',
    ifsc_code: 'HDFC0000003',
    principal_amount: 7500000,
    currency: 'INR',
    issue_date: '2025-09-01',
    maturity_date: '2026-11-20',
    renewal_status: 'renewed',
    beneficiary: 'AICET Statutory Deposit Cell',
    workflow_status: 'under_review',
    risk_score: 48,
    risk_band: 'medium',
    created_at: '2026-01-16T11:00:00Z',
    updated_at: '2026-03-12T15:10:00Z',
    documents_count: 1,
    open_findings_count: 1,
  },
  {
    id: 'fdr-003',
    institution_id: 'inst-002',
    institution_name: 'Bharat National College of Engineering',
    normalized_fdr_number: 'ICIC88102938475',
    display_fdr_number: 'ICICI-FDR-881029384',
    bank_name: 'ICICI Bank',
    branch_name: 'MG Road, Bengaluru',
    ifsc_code: 'ICIC0000002',
    principal_amount: 15000000,
    currency: 'INR',
    issue_date: '2025-04-10',
    maturity_date: '2026-04-10',
    renewal_status: 'original',
    beneficiary: 'AICET Endowment Escrow',
    workflow_status: 'discrepant',
    risk_score: 84,
    risk_band: 'critical',
    created_at: '2026-01-20T09:15:00Z',
    updated_at: '2026-03-24T18:00:00Z',
    documents_count: 3,
    open_findings_count: 3,
  },
  {
    id: 'fdr-004',
    institution_id: 'inst-003',
    institution_name: 'Crescent Valley Institute of Science',
    normalized_fdr_number: 'PUNB77261948201',
    display_fdr_number: 'PNB/CORP/77261948',
    bank_name: 'Punjab National Bank',
    branch_name: 'Nariman Point, Mumbai',
    ifsc_code: 'PUNB0013800',
    principal_amount: 6000000,
    currency: 'INR',
    issue_date: '2025-11-12',
    maturity_date: '2027-11-12',
    renewal_status: 'original',
    beneficiary: 'Member Secretary AICET',
    workflow_status: 'verified',
    risk_score: 18,
    risk_band: 'low',
    created_at: '2026-01-22T13:40:00Z',
    updated_at: '2026-03-15T11:00:00Z',
    documents_count: 2,
    open_findings_count: 0,
  },
  {
    id: 'fdr-005',
    institution_id: 'inst-004',
    institution_name: 'Deccan Academy of Management Studies',
    normalized_fdr_number: 'KKBK99102837461',
    display_fdr_number: 'KOTAK-SEC-99102837',
    bank_name: 'Kotak Mahindra Bank',
    branch_name: 'Banjara Hills, Hyderabad',
    ifsc_code: 'KKBK0000552',
    principal_amount: 8000000,
    currency: 'INR',
    issue_date: '2025-08-20',
    maturity_date: '2026-08-20',
    renewal_status: 'replacement',
    beneficiary: 'AICET Deposit Custody Fund',
    workflow_status: 'investigating',
    risk_score: 72,
    risk_band: 'high',
    created_at: '2026-01-25T15:20:00Z',
    updated_at: '2026-03-29T10:45:00Z',
    documents_count: 2,
    open_findings_count: 2,
  },
  {
    id: 'fdr-006',
    institution_id: 'inst-005',
    institution_name: 'Zenith Global Polytechnic',
    normalized_fdr_number: 'BARB55410928374',
    display_fdr_number: 'BOB/2026/FDR-55410',
    bank_name: 'Bank of Baroda',
    branch_name: 'Anna Salai, Chennai',
    ifsc_code: 'BARB0CHETRU',
    principal_amount: 5000000,
    currency: 'INR',
    issue_date: '2025-10-05',
    maturity_date: '2026-10-05',
    renewal_status: 'original',
    beneficiary: 'AICET Joint Account Reserve',
    workflow_status: 'verified',
    risk_score: 22,
    risk_band: 'low',
    created_at: '2026-01-28T16:10:00Z',
    updated_at: '2026-03-18T14:30:00Z',
    documents_count: 1,
    open_findings_count: 0,
  }
];

export const MOCK_FINDINGS: RiskFlag[] = [
  {
    id: 'flag-001',
    fdr_id: 'fdr-003',
    rule_id: 'R1_DUPLICATE_NUMBER',
    rule_name: 'Duplicate FDR Number Check',
    severity: 'critical',
    explanation: 'FDR number ICIC88102938475 was registered simultaneously under Bharat National College and previously cited in archived dossier DAM-HYD-04.',
    expected_value: 'Globally unique receipt identifier across registered institutions',
    observed_value: 'Reused identifier ICIC88102938475 found in 2 dossiers',
    suggested_action: 'Issue formal query to bank branch to authenticate serial certificate assignment.',
    status: 'open',
    created_at: '2026-03-20T11:15:00Z',
    updated_at: '2026-03-20T11:15:00Z',
    fdr_number: 'ICICI-FDR-881029384',
    institution_name: 'Bharat National College of Engineering'
  },
  {
    id: 'flag-002',
    fdr_id: 'fdr-003',
    rule_id: 'R3_AMOUNT_MISMATCH',
    rule_name: 'Amount Optical Extraction Mismatch',
    severity: 'critical',
    explanation: 'Document optical extraction yielded ₹12,000,000 whereas portal declaration stated ₹15,000,000 (discrepancy of ₹3,000,000).',
    expected_value: '₹15,000,000',
    observed_value: '₹12,000,000',
    suggested_action: 'Request physical inspection of instrument and banker confirmation slip.',
    status: 'open',
    created_at: '2026-03-20T11:20:00Z',
    updated_at: '2026-03-20T11:20:00Z',
    fdr_number: 'ICICI-FDR-881029384',
    institution_name: 'Bharat National College of Engineering'
  },
  {
    id: 'flag-003',
    fdr_id: 'fdr-005',
    rule_id: 'R7_SPLIT_DEPOSIT',
    rule_name: 'Sub-threshold Structured Deposit Anomaly',
    severity: 'high',
    explanation: 'Consecutive deposits of ₹4,000,000 issued within 48 hours at same branch, indicating potential artificial deposit structuring.',
    expected_value: 'Consolidated single statutory security deposit',
    observed_value: '2 split instruments totaling ₹8,000,000 within 48h',
    suggested_action: 'Review bank statement of debit source account.',
    status: 'open',
    created_at: '2026-03-22T09:40:00Z',
    updated_at: '2026-03-22T09:40:00Z',
    fdr_number: 'KOTAK-SEC-99102837',
    institution_name: 'Deccan Academy of Management Studies'
  },
  {
    id: 'flag-004',
    fdr_id: 'fdr-002',
    rule_id: 'R4_BRANCH_IFSC_MISMATCH',
    rule_name: 'Branch IFSC Validation',
    severity: 'medium',
    explanation: 'Declared branch is Connaught Place New Delhi, but IFSC prefix matches Barakhamba Road corporate branch.',
    expected_value: 'HDFC0000003 (Barakhamba Road)',
    observed_value: 'Declared as Connaught Place',
    suggested_action: 'Update branch registration record to reflect authoritative RBI routing.',
    status: 'open',
    created_at: '2026-03-25T14:10:00Z',
    updated_at: '2026-03-25T14:10:00Z',
    fdr_number: 'HDFC/FDR/2025/9928',
    institution_name: 'Apex Institute of Technology'
  }
];

export const MOCK_CASES: InvestigationCase[] = [
  {
    id: 'case-001',
    case_number: 'CASE-2026-0042',
    title: 'Cross-Institutional Collateral Reuse Inquiry',
    institution_id: 'inst-002',
    institution_name: 'Bharat National College of Engineering',
    fdr_id: 'fdr-003',
    fdr_number: 'ICICI-FDR-881029384',
    priority: 'critical',
    status: 'under_review',
    assigned_to: 'usr-official-001',
    assignee_name: 'Dr. Vikram Malhotra',
    created_by: 'usr-official-001',
    decision: 'pending',
    created_at: '2026-03-20T12:00:00Z',
    updated_at: '2026-03-28T16:30:00Z',
    summary: 'Investigating potential duplicate submission of ICICI security deposit certificate across Karnataka and Telangana affiliate campuses.',
    notes: [
      {
        id: 'note-01',
        author_name: 'Dr. Vikram Malhotra',
        note_text: 'Summoned branch manager of ICICI MG Road to verify certificate issuance authenticity.',
        created_at: '2026-03-21T10:00:00Z'
      }
    ],
    events: [
      {
        id: 'ev-01',
        event_type: 'CASE_OPENED',
        actor_name: 'Dr. Vikram Malhotra',
        details: 'Case initiated from Critical Finding flag-001',
        created_at: '2026-03-20T12:00:00Z'
      }
    ],
    risk_flags: [MOCK_FINDINGS[0], MOCK_FINDINGS[1]]
  },
  {
    id: 'case-002',
    case_number: 'CASE-2026-0039',
    title: 'Maturity Default and Split Structuring Review',
    institution_id: 'inst-004',
    institution_name: 'Deccan Academy of Management Studies',
    fdr_id: 'fdr-005',
    fdr_number: 'KOTAK-SEC-99102837',
    priority: 'high',
    status: 'under_review',
    assigned_to: 'usr-official-001',
    assignee_name: 'Dr. Vikram Malhotra',
    created_by: 'usr-official-001',
    decision: 'pending',
    created_at: '2026-03-22T10:15:00Z',
    updated_at: '2026-03-29T11:00:00Z',
    summary: 'Structured deposit series requiring branch manager confirmation letter before releasing statutory compliance clearance.',
    notes: [],
    events: [],
    risk_flags: [MOCK_FINDINGS[2]]
  }
];

export const MOCK_DOCUMENTS: DocumentRecord[] = [
  {
    id: 'doc-001',
    fdr_id: 'fdr-001',
    filename: 'SBI_Deposit_Certificate_40182.pdf',
    current_version: 1,
    mime_type: 'application/pdf',
    integrity_status: 'intact',
    created_at: '2026-01-15T10:35:00Z',
    versions: [
      {
        id: 'ver-001',
        version_number: 1,
        file_hash: '9a72b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90a1b2c3d4e5f6a7b8c9d0e1f2a',
        file_size: 245760,
        original_filename: 'SBI_Deposit_Certificate_40182.pdf',
        upload_timestamp: '2026-01-15T10:35:00Z',
        processing_status: 'completed',
        extractions: [
          {
            id: 'ext-01',
            field_name: 'fdr_number',
            extracted_value: 'SBIN00040182910',
            confidence: 0.99,
            extraction_method: 'structured_pdf',
            source_page: 1,
            created_at: '2026-01-15T10:35:00Z'
          },
          {
            id: 'ext-02',
            field_name: 'principal_amount',
            extracted_value: '10000000',
            confidence: 0.98,
            extraction_method: 'structured_pdf',
            source_page: 1,
            created_at: '2026-01-15T10:35:00Z'
          }
        ]
      }
    ]
  },
  {
    id: 'doc-003',
    fdr_id: 'fdr-003',
    filename: 'ICICI_FDR_881029384.pdf',
    current_version: 1,
    mime_type: 'application/pdf',
    integrity_status: 'intact',
    created_at: '2026-03-20T11:14:00Z',
    versions: [
      {
        id: 'ver-003',
        version_number: 1,
        file_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        file_size: 345120,
        original_filename: 'ICICI_FDR_881029384.pdf',
        upload_timestamp: '2026-03-20T11:14:00Z',
        processing_status: 'completed',
        extractions: [
          {
            id: 'ext-05',
            field_name: 'principal_amount',
            extracted_value: '12000000',
            confidence: 0.95,
            extraction_method: 'ocr_heuristic',
            source_page: 1,
            created_at: '2026-03-20T11:14:00Z'
          }
        ]
      }
    ]
  }
];

export const MOCK_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'aud-1092',
    sequence_number: 1092,
    event_id: 'evt-1092-risk',
    event_type: 'RISK_SCORE_COMPUTED',
    entity_type: 'FDRRecord',
    entity_id: 'fdr-003',
    actor_id: 'usr-system',
    actor_name: 'FDR Guardian Engine',
    payload: JSON.stringify({ rules_triggered: ['R1_DUPLICATE_NUMBER', 'R3_AMOUNT_MISMATCH'], risk_score: 84 }),
    previous_hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
    current_hash: '8f92a3b1c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f3a4b5',
    timestamp: '2026-03-20T11:20:00Z'
  },
  {
    id: 'aud-1091',
    sequence_number: 1091,
    event_id: 'evt-1091-doc',
    event_type: 'DOCUMENT_UPLOADED',
    entity_type: 'DocumentRecord',
    entity_id: 'doc-003',
    actor_id: 'usr-inst-002',
    actor_name: 'BNC Accounts Desk',
    payload: JSON.stringify({ file_name: 'ICICI_FDR_881029384.pdf', file_size: 418920 }),
    previous_hash: '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90a1b2c3d4e5f6a7b8c9',
    current_hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
    timestamp: '2026-03-20T11:14:22Z'
  },
  {
    id: 'aud-1090',
    sequence_number: 1090,
    event_id: 'evt-1090-login',
    event_type: 'USER_LOGIN',
    entity_type: 'User',
    entity_id: 'usr-official-001',
    actor_id: 'usr-official-001',
    actor_name: 'Dr. Vikram Malhotra',
    payload: JSON.stringify({ auth_method: 'PBKDF2_SHA256', session_type: 'jwt' }),
    previous_hash: '4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90',
    current_hash: '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90a1b2c3d4e5f6a7b8c9',
    timestamp: '2026-03-20T10:00:15Z'
  }
];

export const MOCK_GRAPH = {
  nodes: [
    { id: 'inst-001', type: 'institutionNode', position: { x: 250, y: 100 }, data: { label: 'Apex Institute of Technology', code: 'AIT-DEL-01', count: 6, risk: 'low' } },
    { id: 'inst-002', type: 'institutionNode', position: { x: 650, y: 120 }, data: { label: 'Bharat National College of Eng.', code: 'BNC-BLR-02', count: 5, risk: 'critical' } },
    { id: 'inst-004', type: 'institutionNode', position: { x: 450, y: 400 }, data: { label: 'Deccan Academy of Management', code: 'DAM-HYD-04', count: 4, risk: 'high' } },
    { id: 'fdr-001', type: 'fdrNode', position: { x: 100, y: 220 }, data: { label: 'SBI ₹10.0M', fdr_number: 'SBIN/2026/FDR-40182', risk: 'low' } },
    { id: 'fdr-002', type: 'fdrNode', position: { x: 280, y: 260 }, data: { label: 'HDFC ₹7.5M', fdr_number: 'HDFC/FDR/2025/9928', risk: 'medium' } },
    { id: 'fdr-003', type: 'fdrNode', position: { x: 550, y: 240 }, data: { label: 'ICICI ₹15.0M', fdr_number: 'ICICI-FDR-881029384', risk: 'critical' } },
    { id: 'fdr-005', type: 'fdrNode', position: { x: 620, y: 380 }, data: { label: 'Kotak ₹8.0M', fdr_number: 'KOTAK-SEC-99102837', risk: 'high' } },
  ],
  edges: [
    { id: 'e-1', source: 'inst-001', target: 'fdr-001', label: 'Holds' },
    { id: 'e-2', source: 'inst-001', target: 'fdr-002', label: 'Holds' },
    { id: 'e-3', source: 'inst-002', target: 'fdr-003', label: 'Submitted' },
    { id: 'e-4', source: 'inst-004', target: 'fdr-005', label: 'Submitted' },
    { id: 'e-5', source: 'fdr-003', target: 'fdr-005', animated: true, style: { stroke: '#ef4444', strokeWidth: 2 }, label: 'Duplicate Pattern Alert' },
  ],
  summary: {
    total_nodes: 7,
    total_edges: 5,
    clusters: 2
  }
};

export const MOCK_RULES: RuleConfig[] = [
  { rule_id: 'R1_DUPLICATE_NUMBER', rule_name: 'Duplicate FDR Number Check', description: 'Detects duplicate FDR numbers across multiple institutions.', weight: 35, is_enabled: true },
  { rule_id: 'R2_TAMPER_EVIDENCE', rule_name: 'Cryptographic Hash Tamper Verification', description: 'Verifies SHA-256 fingerprint matches recorded ledger.', weight: 30, is_enabled: true },
  { rule_id: 'R3_AMOUNT_MISMATCH', rule_name: 'Amount Optical Extraction Mismatch', description: 'Flags variances exceeding 1% between declared and extracted amounts.', weight: 25, is_enabled: true },
  { rule_id: 'R4_BRANCH_IFSC_MISMATCH', rule_name: 'Branch IFSC Validation', description: 'Validates branch name matches RBI master directory IFSC code.', weight: 15, is_enabled: true },
  { rule_id: 'R5_SHORT_MATURITY', rule_name: 'Maturity Horizon Check', description: 'Identifies FDRs maturing within the next 30 days without renewal.', weight: 20, is_enabled: true },
  { rule_id: 'R6_INVALID_BENEFICIARY', rule_name: 'Joint Lien Beneficiary Check', description: 'Ensures the statutory regulatory body is named as primary lien beneficiary.', weight: 25, is_enabled: true },
  { rule_id: 'R7_SPLIT_DEPOSIT', rule_name: 'Sub-threshold Structured Deposit Rule', description: 'Detects consecutive deposits split under statutory thresholds.', weight: 20, is_enabled: true },
  { rule_id: 'R8_RENEWAL_TRACE_GAP', rule_name: 'Renewal Chain Discontinuity', description: 'Flags broken lineages between original and replacement receipts.', weight: 15, is_enabled: true },
];
