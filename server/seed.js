import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Database } from 'bun:sqlite';
import { initSchema } from './db.js';

const DATA_DIR = path.resolve(import.meta.dir, '../data');
const VAULT_DIR = path.join(DATA_DIR, 'vault');
const VERSIONS_DIR = path.join(VAULT_DIR, '.versions');
const DB_PATH = path.join(DATA_DIR, 'metadata.db');

console.log('🔄 [DriveVault Seed] Initializing clean reset...');

// 1. Wipe ./data/vault and SQLite DB
if (fs.existsSync(VAULT_DIR)) {
  fs.rmSync(VAULT_DIR, { recursive: true, force: true });
}
if (fs.existsSync(DB_PATH)) {
  fs.rmSync(DB_PATH, { force: true });
}
if (fs.existsSync(`${DB_PATH}-wal`)) {
  fs.rmSync(`${DB_PATH}-wal`, { force: true });
}
if (fs.existsSync(`${DB_PATH}-shm`)) {
  fs.rmSync(`${DB_PATH}-shm`, { force: true });
}

// 2. Recreate directory structure
fs.mkdirSync(path.join(VAULT_DIR, 'invoices'), { recursive: true });
fs.mkdirSync(path.join(VAULT_DIR, 'contracts'), { recursive: true });
fs.mkdirSync(path.join(VAULT_DIR, 'scans'), { recursive: true });
fs.mkdirSync(path.join(VAULT_DIR, 'hr'), { recursive: true });
fs.mkdirSync(VERSIONS_DIR, { recursive: true });

// 3. Initialize fresh database
const db = new Database(DB_PATH);
initSchema(db);

// 4. Seed API Keys (matching BucketGuard principals)
const insertKeyStmt = db.prepare(`
  INSERT INTO api_keys (key, principal, role, created_at)
  VALUES (?, ?, ?, ?)
`);

const now = new Date().toISOString();
const SEEDED_KEYS = [
  // Feature 4: leaked in frontend JS comment
  { key: 'finance-ops-key-7f3a9c', principal: 'finance-ops-key', role: 'finance' },
  { key: 'finance-ops-key', principal: 'finance-ops-key', role: 'finance' },

  // Feature 4: leaked in GET /api/debug/env
  { key: 'ci-cd-deployer-2b8e1d', principal: 'ci-cd-deployer', role: 'ci-cd' },
  { key: 'ci-cd-deployer', principal: 'ci-cd-deployer', role: 'ci-cd' },

  // Principal 3: backup service
  { key: 'backup-service-4a91e8', principal: 'backup-service', role: 'backup' },
  { key: 'backup-service', principal: 'backup-service', role: 'backup' },
];

for (const k of SEEDED_KEYS) {
  insertKeyStmt.run(k.key, k.principal, k.role, now);
}

// Helper to compute sha256
function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Helper to write file and return metadata
function createFile(relPath, content) {
  const fullPath = path.join(VAULT_DIR, relPath);
  fs.writeFileSync(fullPath, content);
  const hash = sha256(content);
  const size = Buffer.byteLength(content);
  return {
    name: path.basename(relPath),
    path: relPath,
    size,
    sha256: hash,
  };
}

// =============================================================================
// GENERATE 60 REALISTIC FILES
// =============================================================================

// --- 15 INVOICES (*.csv) ---
const INVOICE_VENDORS = [
  { name: 'CloudFlare Enterprise Network Services', id: 'INV-2024-001', amount: 14250.00, due: '2024-12-15' },
  { name: 'Amazon Web Services EMEA Cloud Tier', id: 'INV-2024-002', amount: 89420.50, due: '2024-12-18' },
  { name: 'Snowflake Data Cloud Data Warehouse', id: 'INV-2024-003', amount: 32100.00, due: '2024-12-20' },
  { name: 'Datadog Full Stack Observability', id: 'INV-2024-004', amount: 9840.00, due: '2024-12-22' },
  { name: 'Stripe Corporate Billing & Processing', id: 'INV-2024-005', amount: 4560.75, due: '2024-12-28' },
  { name: 'MongoDB Atlas Dedicated Cluster Ops', id: 'INV-2024-006', amount: 12500.00, due: '2025-01-05' },
  { name: 'Atlassian Jira Enterprise Cloud', id: 'INV-2024-007', amount: 6400.00, due: '2025-01-10' },
  { name: 'Salesforce CRM Platform Expansion', id: 'INV-2024-008', amount: 48900.00, due: '2025-01-12' },
  { name: 'Twilio Programmable Communications', id: 'INV-2024-009', amount: 3200.50, due: '2025-01-15' },
  { name: 'GitHub Enterprise Suite Seats', id: 'INV-2024-010', amount: 18450.00, due: '2025-01-18' },
  { name: 'Google Cloud Platform Compute Fleet', id: 'INV-2024-011', amount: 67320.00, due: '2025-01-20' },
  { name: 'Workday Human Capital Management', id: 'INV-2024-012', amount: 28400.00, due: '2025-01-25' },
  { name: 'Figma Organization Design License', id: 'INV-2024-013', amount: 5200.00, due: '2025-02-01' },
  { name: 'Zoom Enterprise Video Communications', id: 'INV-2024-014', amount: 4100.00, due: '2025-02-05' },
  { name: 'Slack Enterprise Grid Annual Renewal', id: 'INV-2024-015', amount: 22600.00, due: '2025-02-10' },
];

const invoiceFiles = [];
for (let i = 0; i < INVOICE_VENDORS.length; i++) {
  const v = INVOICE_VENDORS[i];
  const csvContent = [
    `InvoiceNumber,Vendor,BillingDate,DueDate,ItemDescription,Quantity,UnitPrice,TaxRate,Subtotal,TotalAmount,Currency,PaymentStatus`,
    `"${v.id}","${v.name}","2024-11-15","${v.due}","Enterprise SaaS Infrastructure License",1,${(v.amount * 0.9).toFixed(2)},10%,${(v.amount * 0.9).toFixed(2)},${v.amount.toFixed(2)},USD,PENDING_APPROVAL`,
    `"${v.id}","${v.name}","2024-11-15","${v.due}","Priority 24/7 SLA Support Tier",1,${(v.amount * 0.1).toFixed(2)},10%,${(v.amount * 0.1).toFixed(2)},${(v.amount * 0.11).toFixed(2)},USD,PENDING_APPROVAL`,
  ].join('\n');

  const fileName = `invoices/${v.id.toLowerCase()}_${v.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.csv`;
  invoiceFiles.push(createFile(fileName, csvContent));
}

// --- 15 CONTRACTS (*.txt) ---
const CONTRACT_TITLES = [
  { file: 'contracts/Master_Services_Agreement_CloudFlare_2024.txt', title: 'MASTER SERVICES AGREEMENT', partner: 'CloudFlare, Inc.', jurisdiction: 'State of California' },
  { file: 'contracts/Mutual_Non_Disclosure_Snowflake_Enterprises.txt', title: 'MUTUAL NON-DISCLOSURE AGREEMENT', partner: 'Snowflake Enterprises, LLC', jurisdiction: 'State of Delaware' },
  { file: 'contracts/Enterprise_Software_License_MongoDB_v4.txt', title: 'ENTERPRISE SOFTWARE LICENSE AGREEMENT', partner: 'MongoDB Global Services', jurisdiction: 'State of New York' },
  { file: 'contracts/Vendor_SLA_Amazon_Web_Services_Tier1.txt', title: 'INFRASTRUCTURE SERVICE LEVEL AGREEMENT', partner: 'Amazon Web Services, Inc.', jurisdiction: 'State of Washington' },
  { file: 'contracts/Commercial_Office_Lease_Suite_400_SanFrancisco.txt', title: 'COMMERCIAL REAL ESTATE LEASE AGREEMENT', partner: 'Transbay Commercial Properties', jurisdiction: 'City and County of San Francisco' },
  { file: 'contracts/Cybersecurity_Consulting_Engagement_SecOps_LLC.txt', title: 'CYBERSECURITY ENGAGEMENT AGREEMENT', partner: 'SecOps Advisory Group LLC', jurisdiction: 'Commonwealth of Massachusetts' },
  { file: 'contracts/Data_Processing_Addendum_GDPR_Compliance_2024.txt', title: 'DATA PROCESSING ADDENDUM (GDPR/CCPA)', partner: 'Global SaaS Processing Consortium', jurisdiction: 'European Union (Ireland)' },
  { file: 'contracts/Executive_Employment_Agreement_VP_Finance.txt', title: 'EXECUTIVE EMPLOYMENT AGREEMENT', partner: 'Executive Employee #9042', jurisdiction: 'State of Delaware' },
  { file: 'contracts/Hardware_Procurement_Dell_PowerEdge_Servers.txt', title: 'HARDWARE PROCUREMENT CONTRACT', partner: 'Dell Enterprise Solutions', jurisdiction: 'State of Texas' },
  { file: 'contracts/Intellectual_Property_Assignment_Agreement.txt', title: 'PROPRIETARY INFORMATION AND IP ASSIGNMENT', partner: 'All Engineering Principals', jurisdiction: 'State of California' },
  { file: 'contracts/Freight_Logistics_Master_Carrier_Contract.txt', title: 'GLOBAL CARRIER & LOGISTICS AGREEMENT', partner: 'Pacific Expedited Freight Ltd.', jurisdiction: 'State of Illinois' },
  { file: 'contracts/Facilities_HVAC_Maintenance_Services_Contract.txt', title: 'ANNUAL FACILITIES SERVICE AGREEMENT', partner: 'Bay Area HVAC Systems Inc.', jurisdiction: 'State of California' },
  { file: 'contracts/Corporate_Cyber_Insurance_Underwriting_Policy.txt', title: 'CYBER RISK INSURANCE POLICY SCHEDULE', partner: 'AIG Corporate Underwriting', jurisdiction: 'State of New York' },
  { file: 'contracts/External_Financial_Audit_Engagement_Letter_KPMG.txt', title: 'INDEPENDENT AUDITOR ENGAGEMENT LETTER', partner: 'KPMG Advisory LLP', jurisdiction: 'State of Delaware' },
  { file: 'contracts/Statement_Of_Work_AI_Infrastructure_Cluster.txt', title: 'STATEMENT OF WORK: CLUSTER EXPANSION', partner: 'Scale Compute Engineering Inc.', jurisdiction: 'State of California' },
];

const contractFiles = [];
for (let i = 0; i < CONTRACT_TITLES.length; i++) {
  const c = CONTRACT_TITLES[i];
  const contractContent = `================================================================================
${c.title}
CONFIDENTIAL & PROPRIETARY — EXCLUSIVELY FOR INTERNAL RECORD
================================================================================

PARTIES:
This Agreement is entered into as of November 15, 2024 ("Effective Date"),
by and between DriveVault Systems Corporation ("Company") and ${c.partner} ("Partner").

1. PURPOSE AND SCOPE
Partner agrees to deliver the designated enterprise software, cloud resources,
and technical advisory services as specified in Schedule A attached hereto.
Company shall pay the agreed billing rates within forty-five (45) days of receipt.

2. CONFIDENTIALITY AND DATA GOVERNANCE
Each party agrees that all software architectures, financial ledgers, encryption
keys, and customer metadata disclosed under this Agreement shall remain strictly
confidential and protected from unauthorized public exposure.

3. WARRANTIES AND LIABILITY
Neither party shall be liable for indirect, incidental, or consequential damages.
Maximum aggregate liability shall not exceed fees paid over the preceding 12 months.

4. GOVERNING LAW
This contract shall be construed in accordance with the laws of ${c.jurisdiction}.

IN WITNESS WHEREOF, authorized signatories have executed this instrument:
  For DriveVault Systems:  Alex Chen, VP of Finance & Infrastructure
  For Partner:             Authorized Corporate Signatory
================================================================================
`;

  contractFiles.push(createFile(c.file, contractContent));
}

// --- 15 SCANS (*.svg) ---
const SCAN_DOCS = [
  { file: 'scans/PO_Approved_Scan_7841.svg', title: 'PURCHASE ORDER #7841', status: 'APPROVED', date: 'NOV 12 2024', color: '#16a34a' },
  { file: 'scans/Bank_Wire_Confirmation_Scan_9021.svg', title: 'FEDWIRE TRANSFER RECEIPT', status: 'CONFIRMED', date: 'NOV 14 2024', color: '#2563eb' },
  { file: 'scans/Certificate_Of_Incorporation_Delaware.svg', title: 'CERTIFICATE OF INCORPORATION', status: 'OFFICIAL SEAL', date: 'OCT 01 2021', color: '#7c3aed' },
  { file: 'scans/Customs_Declaration_Air_Freight_Scan.svg', title: 'AIR WAYBILL & CUSTOMS ENTRY', status: 'CLEARED', date: 'NOV 08 2024', color: '#059669' },
  { file: 'scans/Building_Permit_DataCenter_Expansion.svg', title: 'MUNICIPAL BUILDING PERMIT', status: 'PERMIT GRANTED', date: 'AUG 19 2024', color: '#d97706' },
  { file: 'scans/Tax_Exemption_Certificate_W9_Scan.svg', title: 'IRS FORM W-9 VERIFICATION', status: 'VERIFIED', date: 'JAN 10 2024', color: '#475569' },
  { file: 'scans/ISO_27001_Compliance_Certificate.svg', title: 'ISO/IEC 27001:2022 ACCREDITATION', status: 'CERTIFIED', date: 'SEP 30 2024', color: '#0891b2' },
  { file: 'scans/SOC2_Type_II_Attestation_Report_Cover.svg', title: 'SOC 2 TYPE II AUDIT REPORT', status: 'UNQUALIFIED OPINION', date: 'OCT 15 2024', color: '#4f46e5' },
  { file: 'scans/Notarized_Corporate_Resolution_Scan.svg', title: 'NOTARIZED BOARD RESOLUTION', status: 'RECORDED', date: 'NOV 02 2024', color: '#9333ea' },
  { file: 'scans/Vendor_Cheque_Remittance_Advice_Scan.svg', title: 'REMITTANCE ADVICE SCHEDULE', status: 'PROCESSED', date: 'NOV 15 2024', color: '#15803d' },
  { file: 'scans/Facility_Badge_Access_Audit_Log_Scan.svg', title: 'SECURE FACILITY BADGE AUDIT', status: 'PASS', date: 'NOV 10 2024', color: '#0284c7' },
  { file: 'scans/Hardware_Warranty_Registration_Card.svg', title: 'OEM HARDWARE WARRANTY COVERAGE', status: 'ACTIVE 3-YR', date: 'JUL 14 2024', color: '#e11d48' },
  { file: 'scans/Shipping_Manifest_Confidential_Scan.svg', title: 'HAZMAT / BATTERY SHIPPING MANIFEST', status: 'COMPLIANT', date: 'OCT 29 2024', color: '#ca8a04' },
  { file: 'scans/Real_Estate_Title_Deed_Scan.svg', title: 'TITLE DEED & TITLE GUARANTEE', status: 'REGISTERED', date: 'MAR 22 2022', color: '#4338ca' },
  { file: 'scans/Executive_Signature_Specimen_Card.svg', title: 'BANKING SIGNATURE SPECIMEN CARD', status: 'AUTHORIZED', date: 'NOV 01 2024', color: '#b91c1c' },
];

const scanFiles = [];
for (let i = 0; i < SCAN_DOCS.length; i++) {
  const s = SCAN_DOCS[i];
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <defs>
    <linearGradient id="paperGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
  </defs>
  <!-- Document Sheet -->
  <rect x="20" y="20" width="560" height="360" rx="8" fill="url(#paperGrad)" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="40" y="40" width="520" height="40" fill="#f1f5f9" rx="4"/>
  <text x="60" y="66" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="16" font-weight="bold" fill="#1e293b">${s.title}</text>
  <text x="480" y="66" font-family="monospace" font-size="12" fill="#64748b">${s.date}</text>
  
  <!-- Content Lines Simulation -->
  <line x1="60" y1="120" x2="540" y2="120" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="60" y1="150" x2="480" y2="150" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="60" y1="180" x2="520" y2="180" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="60" y1="210" x2="440" y2="210" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="60" y1="240" x2="500" y2="240" stroke="#e2e8f0" stroke-width="2"/>

  <!-- Barcode Simulation -->
  <g transform="translate(60, 290)">
    <rect x="0" y="0" width="4" height="40" fill="#334155"/>
    <rect x="8" y="0" width="2" height="40" fill="#334155"/>
    <rect x="14" y="0" width="6" height="40" fill="#334155"/>
    <rect x="24" y="0" width="3" height="40" fill="#334155"/>
    <rect x="32" y="0" width="5" height="40" fill="#334155"/>
    <rect x="42" y="0" width="2" height="40" fill="#334155"/>
    <rect x="48" y="0" width="4" height="40" fill="#334155"/>
    <rect x="58" y="0" width="8" height="40" fill="#334155"/>
    <rect x="70" y="0" width="3" height="40" fill="#334155"/>
    <text x="0" y="55" font-family="monospace" font-size="10" fill="#64748b">SCAN-DOC-${1000 + i}</text>
  </g>

  <!-- Official Stamp Badge -->
  <g transform="translate(380, 260) rotate(-8)">
    <rect x="0" y="0" width="160" height="50" rx="6" fill="none" stroke="${s.color}" stroke-width="3" stroke-dasharray="6 3"/>
    <text x="80" y="32" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="900" fill="${s.color}" letter-spacing="1">${s.status}</text>
  </g>
</svg>`;

  scanFiles.push(createFile(s.file, svgContent));
}

// --- 15 HR RECORDS (*.json) ---
const HR_RECORDS = [
  { file: 'hr/payroll_summary_2024_q1.json', dept: 'Executive & Finance', headCount: 14, budget: 1420000 },
  { file: 'hr/executive_compensation_bands_2024.json', dept: 'Board of Directors', headCount: 6, budget: 2100000 },
  { file: 'hr/employee_directory_engineering_dept.json', dept: 'Core Infrastructure', headCount: 42, budget: 6850000 },
  { file: 'hr/health_benefits_enrollment_data.json', dept: 'Company-Wide', headCount: 128, budget: 980000 },
  { file: 'hr/401k_employer_matching_contributions.json', dept: 'Finance & HR Ops', headCount: 115, budget: 460000 },
  { file: 'hr/annual_performance_bonus_allocations.json', dept: 'All Business Units', headCount: 94, budget: 1850000 },
  { file: 'hr/onboarding_checklist_security_clearances.json', dept: 'SecOps & Compliance', headCount: 18, budget: 290000 },
  { file: 'hr/stock_option_grant_allocations_series_b.json', dept: 'Equity Pool Reserve', headCount: 120, budget: 14000000 },
  { file: 'hr/quarterly_headcount_budget_variance.json', dept: 'Strategic Finance', headCount: 128, budget: 15400000 },
  { file: 'hr/employee_severance_contingency_fund.json', dept: 'Legal & Risk Reserve', headCount: 1, budget: 500000 },
  { file: 'hr/remote_work_stipend_reimbursements.json', dept: 'People Ops', headCount: 88, budget: 88000 },
  { file: 'hr/h1b_visa_sponsorship_case_tracking.json', dept: 'Talent Mobility', headCount: 12, budget: 144000 },
  { file: 'hr/recruiting_agency_fee_schedule.json', dept: 'Talent Acquisition', headCount: 22, budget: 320000 },
  { file: 'hr/corporate_travel_per_diem_guidelines.json', dept: 'Travel & Procurement', headCount: 128, budget: 210000 },
  { file: 'hr/diversity_and_inclusion_metrics_2024.json', dept: 'ESG Committee', headCount: 128, budget: 95000 },
];

const hrFiles = [];
for (let i = 0; i < HR_RECORDS.length; i++) {
  const h = HR_RECORDS[i];
  const jsonContent = JSON.stringify({
    reportId: `HR-REP-${202400 + i}`,
    title: h.file.replace('hr/', '').replace('.json', '').replace(/_/g, ' ').toUpperCase(),
    department: h.dept,
    headcountCovered: h.headCount,
    allocatedBudgetUsd: h.budget,
    fiscalYear: 2024,
    status: 'AUDITED_AND_APPROVED',
    generatedAt: '2024-11-15T10:00:00Z',
    confidentialityClassification: 'RESTRICTED_INTERNAL_ONLY',
    auditLedgerRef: `0x${crypto.randomBytes(8).toString('hex')}`
  }, null, 2);

  hrFiles.push(createFile(h.file, jsonContent));
}

const allCreatedFiles = [...invoiceFiles, ...contractFiles, ...scanFiles, ...hrFiles];
console.log(`✅ [Seed] Successfully generated 60 realistic files on disk (${allCreatedFiles.length} total)`);

// =============================================================================
// SEED EXACTLY 30 DB ROWS INTO SQLITE (Feature 5)
// =============================================================================
// We select 30 primary managed documents across all 4 categories:
// 8 Invoices, 8 Contracts, 7 Scans, 7 HR records = exactly 30 DB rows!
const PRIMARY_SELECTION = [
  ...invoiceFiles.slice(0, 8),
  ...contractFiles.slice(0, 8),
  ...scanFiles.slice(0, 7),
  ...hrFiles.slice(0, 7),
];

const insertFileStmt = db.prepare(`
  INSERT INTO files (id, name, path, size, mime_type, sha256, version, is_deleted, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
`);

function getMime(filename) {
  if (filename.endsWith('.csv')) return 'text/csv';
  if (filename.endsWith('.txt')) return 'text/plain';
  if (filename.endsWith('.svg')) return 'image/svg+xml';
  if (filename.endsWith('.json')) return 'application/json';
  return 'application/octet-stream';
}

for (let i = 0; i < PRIMARY_SELECTION.length; i++) {
  const f = PRIMARY_SELECTION[i];
  const fileId = `file_${(i + 1).toString().padStart(3, '0')}`;
  insertFileStmt.run(
    fileId,
    f.name,
    f.path,
    f.size,
    getMime(f.name),
    f.sha256,
    1,
    now,
    now
  );
}

// Also seed a few historical version records in .versions to mirror BucketGuard
const insertVersionStmt = db.prepare(`
  INSERT INTO file_versions (id, file_id, version_number, stored_path, size, sha256, action, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (let i = 0; i < 5; i++) {
  const f = PRIMARY_SELECTION[i];
  const fileId = `file_${(i + 1).toString().padStart(3, '0')}`;
  const verDir = path.join(VERSIONS_DIR, fileId);
  fs.mkdirSync(verDir, { recursive: true });

  const oldHash = crypto.randomBytes(32).toString('hex');
  const oldFilename = `v0_${oldHash.substring(0, 10)}_${f.name}.bak`;
  fs.writeFileSync(path.join(verDir, oldFilename), 'PREVIOUS VERSION BACKUP COPY');

  insertVersionStmt.run(
    `ver_init_${i + 1}`,
    fileId,
    0,
    path.join('.versions', fileId, oldFilename),
    f.size,
    oldHash,
    'overwrite',
    new Date(Date.now() - 86400000 * (i + 1)).toISOString()
  );
}

console.log(`✅ [Seed] Successfully seeded exactly 30 DB rows into SQLite 'files' table`);
console.log(`✅ [Seed] Seeded 6 API key tokens for 3 BucketGuard principals:`);
console.log(`       - finance-ops-key (finance-ops-key-7f3a9c)`);
console.log(`       - ci-cd-deployer (ci-cd-deployer-2b8e1d)`);
console.log(`       - backup-service (backup-service-4a91e8)`);
console.log(`✨ [Seed] Idempotent reset complete. System in pristine state!\n`);
