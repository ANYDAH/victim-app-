# DriveVault 🛡️📁

> **Enterprise File-Storage Prototype** — Deliberately vulnerable target environment for the BucketGuard ransomware attack, detection, and rollback demonstration.

DriveVault looks, behaves, and operates like a sleek enterprise SaaS storage cloud (similar to Box, Google Drive, or Notion Drive). Beneath the clean UI lies an intentional set of vulnerabilities designed to be discovered and exploited by autonomous offensive agents during the ransomware demonstration, while providing a SHA-256 versioned storage engine that mirrors BucketGuard's storage adapter for instant recovery.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Seed pristine data (60 realistic files on disk + 30 SQLite DB rows + API keys)
bun run seed

# 3. Start development environment (API server on :4000 + Vite UI on :5173)
bun run dev
```

- **Frontend Drive UI:** [http://localhost:5173](http://localhost:5173) (Proxies `/api` to port 4000)
- **Backend API Server:** [http://localhost:4000](http://localhost:4000)
- **Health Check:** [http://localhost:4000/api/health](http://localhost:4000/api/health)
- **Debug Endpoint:** [http://localhost:4000/api/debug/env](http://localhost:4000/api/debug/env)

---

## 🏗️ Architecture & Features

### 1. Modern SaaS UI
- **Mock Login Screen:** Accepts any corporate email and password.
- **Drive View:**
  - Responsive file grid with visual previews:
    - **SVG Images / Scans:** Rendered directly in thumbnail cards and modal viewers.
    - **Spreadsheet CSVs:** Rendered with spreadsheet badges and an interactive table viewer.
    - **Legal Contracts (TXT):** Rendered with document icons and formatted line viewers.
    - **HR Data (JSON):** Rendered with syntax-highlighted code viewers.
  - **Storage Allocation Bar:** Dynamic segmented bar displaying total storage, quota percentage, and category breakdown.
  - **Principal Selector:** UI indicator allowing seamless switching between seeded principals (`finance-ops-key`, `ci-cd-deployer`, `backup-service`).
  - **File Operations:** Upload modal (with category selection), direct download, preview modal, and versioned deletion.

### 2. API with API-Key Auth (`x-api-key`)
All `/api/files` endpoints require an `x-api-key` header matching one of the seeded principals:

| Principal | Role | Seeded Key Tokens | Discovery Method |
| :--- | :--- | :--- | :--- |
| `finance-ops-key` | Finance Operations | `finance-ops-key-7f3a9c`, `finance-ops-key` | Leaked in built frontend JS comment |
| `ci-cd-deployer` | CI/CD Pipeline | `ci-cd-deployer-2b8e1d`, `ci-cd-deployer` | Leaked in unauthenticated `GET /api/debug/env` |
| `backup-service` | Automated Backup | `backup-service-4a91e8`, `backup-service` | Pre-configured service principal |

#### API Endpoints
- `GET /api/files` — List active vault files.
- `POST /api/files` — Upload a file (multipart `file` field or raw body with `x-filename`). Overwriting an existing file automatically archives the previous version.
- `GET /api/files/:id` — Download or preview file stream (`?metadata=true` returns JSON metadata).
- `DELETE /api/files/:id` — Versioned deletion (archives current version to `.versions/<fileId>/`).

### 3. Versioning Engine (BucketGuard Mirror)
Every file overwrite or deletion preserves the preceding version in:
```
./data/vault/.versions/<fileId>/v<version>_<sha256>_<filename>
```
The version number, file size, SHA-256 hash, action (`overwrite` or `delete`), and ISO timestamp are immutably recorded in SQLite table `file_versions`. This mirrors BucketGuard's storage adapter and provides the ground truth required for rollback after an attack.


### 4. Idempotent Reset Script (`bun run seed`)
Running `bun run seed`:
1. Purges `./data/vault` (including `.versions/`) and removes `./data/metadata.db`.
2. Generates **60 realistic corporate files** on disk across 4 distinct categories:
   - `invoices/*.csv` (15 realistic vendor invoices: CloudFlare, Snowflake, AWS, Datadog, etc.)
   - `contracts/*.txt` (15 complete legal agreements with clauses, parties, and jurisdictions)
   - `scans/*.svg` (15 realistic document scans with official stamps, bar codes, and seals)
   - `hr/*.json` (15 personnel budgets, compensation bands, and payroll records)
3. Seeds **exactly 30 rows** into the SQLite `files` table (representing active indexed assets in the drive).
4. Seeds 6 API key tokens for the 3 principals.
5. Seeds baseline historical version records in `.versions/`.

*Running `bun run seed` at any point instantly restores pristine state between demo acts.*

### 5. Ransom State Trigger (Automatic Full-Screen Red Banner)
If a file named `READ_ME_FOR_RECOVERY.txt` appears in the vault root (`./data/vault/READ_ME_FOR_RECOVERY.txt`):
- `GET /api/files` automatically prepends the note to the file list and attaches response header `X-Ransom-Detected: true`.
- On the very next file-list refresh (manual or automatic 8-second poll), the UI transitions into a full-screen, pulsing red ransomware screen displaying:
  - **"YOUR FILES HAVE BEEN ENCRYPTED"**
  - The verbatim demand text extracted directly from `READ_ME_FOR_RECOVERY.txt`.
  - Target directory path and lock status.
  - Live recovery re-scan button.
- When `READ_ME_FOR_RECOVERY.txt` is removed (or rolled back by BucketGuard), the UI immediately dismisses the banner and returns to normal.

### 6. Safety Invariant
The server strictly enforces vault boundary containment on startup:
```javascript
if (!VAULT_ROOT.startsWith(path.resolve('./data/vault'))) {
  console.error('FATAL SAFETY ERROR: DATA_DIR resolves outside ./data/vault');
  process.exit(1);
}
```
Any attempt to point `DATA_DIR` outside `./data/vault` causes the server to immediately abort. All file paths are sanitized against directory traversal attacks (`../`).

---

## 🧪 Testing the Attack & Recovery Flow

### Step 1: Probe Debug Endpoint (Agent Reconnaissance)
```bash
curl -s http://localhost:4000/api/debug/env
# Output: { "ciCdKey": "ci-cd-deployer-2b8e1d", ... }
```

### Step 2: Query Vault with Stolen Key
```bash
curl -s -H "x-api-key: ci-cd-deployer-2b8e1d" http://localhost:4000/api/files
```

### Step 3: Simulate Ransomware Attack
Place the ransom demand file in the vault root:
```bash
cat << 'EOF' > ./data/vault/READ_ME_FOR_RECOVERY.txt
ALL YOUR CORPORATE ASSETS AND DATABASES HAVE BEEN ENCRYPTED.
To obtain the decryption private key, transfer 5 BTC to:
bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
Unique Victim ID: DV-TARGET-0941
EOF
```
*Observe the DriveVault web UI ([http://localhost:5173](http://localhost:5173)) instantly lock into the full-screen red warning banner.*

### Step 4: Simulate Rollback / Recovery
Remove the ransom note (or restore via version history):
```bash
rm ./data/vault/READ_ME_FOR_RECOVERY.txt
```
Click **"Check Recovery / Re-scan"** in the UI to confirm immediate restoration.

### Step 5: Instant Reset Between Demo Acts
```bash
bun run seed
```

---

## 📁 Repository Layout

```
victim-app/
├── package.json              # Scripts and dependencies
├── vite.config.js            # Vite configuration with banner comment preservation
├── index.html                # HTML entrypoint
├── README.md                 # Complete documentation
├── src/
│   ├── main.jsx              # React DOM render
│   ├── App.jsx               # Auth state & global ransom banner controller
│   ├── index.css             # SaaS styles & ransom animations
│   ├── api.js                # API client with leaked service key comment
│   └── components/
│       ├── Login.jsx         # Mock SaaS login screen
│       ├── DriveView.jsx     # Drive dashboard & sidebar
│       ├── FileGrid.jsx      # File cards with image rendering & doc icons
│       ├── FilePreviewModal.jsx # Content inspector (CSV tables, SVG scans, JSON, TXT)
│       ├── StorageBar.jsx    # Storage usage widget
│       ├── UploadModal.jsx   # Drag-and-drop upload modal
│       └── RansomBanner.jsx  # Full-screen red ransom alert
├── server/
│   ├── index.js              # Bun server on :4000 with auth & planted vulnerability
│   ├── db.js                 # SQLite database & version schema
│   ├── vault.js              # File operations, SHA-256 hashing & safety check
│   ├── seed.js               # Idempotent reset script (60 files + 30 DB rows)
│   └── test-api.js           # Automated end-to-end integration test suite
└── data/
    ├── metadata.db           # SQLite database
    └── vault/                # Storage root
        ├── invoices/         # 15 CSV files
        ├── contracts/        # 15 TXT files
        ├── scans/            # 15 SVG files
        ├── hr/               # 15 JSON files
        └── .versions/        # Archived historical versions for rollback
```
