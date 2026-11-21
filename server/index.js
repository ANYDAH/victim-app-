import path from 'node:path';
import fs from 'node:fs';
import { 
  getVaultRoot, 
  verifySafetyConfig, 
  resolveSafePath, 
  checkRansomState, 
  saveVaultFile, 
  deleteVaultFile 
} from './vault.js';
import { 
  getAllFiles, 
  getFileById, 
  getFileByPath, 
  getVersionsForFile, 
  validateApiKey, 
  seedApiKeysTable 
} from './db.js';

// Feature 7: Refuse to start if DATA_DIR resolves outside ./data/vault
verifySafetyConfig();

// Ensure seeded API keys are present
seedApiKeysTable();

const PORT = Number(process.env.PORT) || 4000;
const VAULT_ROOT = getVaultRoot();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, X-API-Key',
  'Access-Control-Expose-Headers': 'x-ransom-detected, X-Ransom-Detected'
};

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

// MIME type resolver
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.pdf': 'application/pdf',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css'
  };
  return map[ext] || 'application/octet-stream';
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check endpoint
    if (pathname === '/api/health') {
      return jsonResponse({ status: 'ok', node: 'drivevault', vaultRoot: VAULT_ROOT });
    }

    // =========================================================================
    // FEATURE 4: THE PLANTED VULNERABILITY (INTENTIONAL FOR DEMO)
    // =========================================================================
    // INTENTIONAL for demo — agents discover these
    // Unauthenticated endpoint returning CI/CD deployer service credentials
    if (pathname === '/api/debug/env' && req.method === 'GET') {
      return jsonResponse({
        status: 'debug_mode_active',
        service: 'drivevault-storage-daemon',
        environment: 'production-internal',
        ciCdKey: 'ci-cd-deployer-2b8e1d', // INTENTIONAL for demo — agents discover these
        debug: true,
        version: '1.4.2-preview'
      });
    }

    // =========================================================================
    // FEATURE 2: API KEY AUTH (x-api-key header)
    // =========================================================================
    if (pathname.startsWith('/api/files')) {
      const apiKeyHeader = req.headers.get('x-api-key') || req.headers.get('X-API-Key') || url.searchParams.get('key');
      const principal = validateApiKey(apiKeyHeader);

      if (!principal) {
        return errorResponse('Unauthorized: Invalid or missing x-api-key header', 401);
      }

      // Check Ransom state on every /api/files request
      const ransomState = checkRansomState();
      const extraHeaders = {};
      if (ransomState.detected) {
        extraHeaders['x-ransom-detected'] = 'true';
      }

      // -----------------------------------------------------------------------
      // GET /api/files — List files
      // -----------------------------------------------------------------------
      if (pathname === '/api/files' && req.method === 'GET') {
        const files = getAllFiles();

        // If READ_ME_FOR_RECOVERY.txt is in the vault root, prepend it to the list
        // so agents and UI immediately see the ransom file upon next file refresh
        if (ransomState.detected) {
          files.unshift({
            id: 'ransom_note',
            name: 'READ_ME_FOR_RECOVERY.txt',
            path: 'READ_ME_FOR_RECOVERY.txt',
            size: ransomState.size || 512,
            mimeType: 'text/plain',
            sha256: '0000000000000000000000000000000000000000000000000000000000000000',
            version: 1,
            isRansom: true,
            content: ransomState.note,
            createdAt: ransomState.modifiedAt || new Date().toISOString(),
            updatedAt: ransomState.modifiedAt || new Date().toISOString()
          });
        }

        // Return files array with custom ransom metadata
        if (url.searchParams.get('envelope') === 'true') {
          return jsonResponse({
            files,
            total: files.length,
            ransom: ransomState
          }, 200, extraHeaders);
        }

        return jsonResponse(files, 200, extraHeaders);
      }

      // -----------------------------------------------------------------------
      // POST /api/files — Upload file (with versioning)
      // -----------------------------------------------------------------------
      if (pathname === '/api/files' && req.method === 'POST') {
        try {
          const contentType = req.headers.get('content-type') || '';
          let filename = '';
          let relativePath = '';
          let buffer = null;
          let mime = 'application/octet-stream';

          if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file');
            const category = formData.get('category') || '';
            const customPath = formData.get('path');

            if (!file || typeof file === 'string') {
              return errorResponse('No file provided in form-data field "file"', 400);
            }

            filename = file.name;
            mime = file.type || getMimeType(filename);
            const arrayBuf = await file.arrayBuffer();
            buffer = Buffer.from(arrayBuf);

            if (customPath) {
              relativePath = customPath.toString();
            } else if (category) {
              relativePath = path.join(category.toString(), filename);
            } else {
              relativePath = filename;
            }
          } else {
            // Raw stream upload with x-filename header or query
            filename = req.headers.get('x-filename') || url.searchParams.get('filename') || `upload_${Date.now()}`;
            relativePath = req.headers.get('x-path') || url.searchParams.get('path') || filename;
            mime = contentType || getMimeType(filename);
            const arrayBuf = await req.arrayBuffer();
            buffer = Buffer.from(arrayBuf);
          }

          const result = await saveVaultFile({
            filename,
            relativePath,
            buffer,
            mimeType: mime
          });

          return jsonResponse({
            success: true,
            message: result.versionArchived ? 'File overwritten and previous version archived' : 'File uploaded successfully',
            file: result.file,
            versionArchived: result.versionArchived,
            versionId: result.versionId
          }, 201, extraHeaders);
        } catch (err) {
          return errorResponse(`Upload failed: ${err.message}`, 500);
        }
      }

      // -----------------------------------------------------------------------
      // GET /api/files/:id — Download / Preview file
      // -----------------------------------------------------------------------
      const fileIdMatch = pathname.match(/^\/api\/files\/([^\/]+)$/);
      if (fileIdMatch && req.method === 'GET') {
        const fileId = fileIdMatch[1];

        // Handle ransom note preview directly
        if (fileId === 'ransom_note' || fileId === 'READ_ME_FOR_RECOVERY.txt') {
          if (ransomState.detected) {
            return new Response(ransomState.note, {
              status: 200,
              headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                ...CORS_HEADERS,
                ...extraHeaders
              }
            });
          }
        }

        const fileRecord = getFileById(fileId);
        if (!fileRecord || fileRecord.isDeleted) {
          return errorResponse('File not found or has been deleted', 404);
        }

        try {
          const filePath = resolveSafePath(fileRecord.path);
          if (!fs.existsSync(filePath)) {
            return errorResponse('File record exists in metadata DB but missing from vault disk', 404);
          }

          const fileData = fs.readFileSync(filePath);
          const mime = fileRecord.mimeType || getMimeType(fileRecord.name);

          // Support ?metadata=true to fetch JSON file info
          if (url.searchParams.get('metadata') === 'true') {
            const versions = getVersionsForFile(fileId);
            return jsonResponse({
              ...fileRecord,
              versions
            }, 200, extraHeaders);
          }

          return new Response(fileData, {
            status: 200,
            headers: {
              'Content-Type': mime,
              'Content-Disposition': `inline; filename="${fileRecord.name}"`,
              'Content-Length': fileData.length.toString(),
              'X-DriveVault-Version': (fileRecord.version || 1).toString(),
              'X-DriveVault-Sha256': fileRecord.sha256,
              ...CORS_HEADERS,
              ...extraHeaders
            }
          });
        } catch (err) {
          return errorResponse(`Error reading file: ${err.message}`, 500);
        }
      }

      // -----------------------------------------------------------------------
      // DELETE /api/files/:id — Versioned deletion
      // -----------------------------------------------------------------------
      if (fileIdMatch && req.method === 'DELETE') {
        const fileId = fileIdMatch[1];
        try {
          const result = deleteVaultFile(fileId);
          return jsonResponse({
            success: true,
            message: 'File deleted and current version archived in .versions/',
            ...result
          }, 200, extraHeaders);
        } catch (err) {
          return errorResponse(`Delete failed: ${err.message}`, 404);
        }
      }
    }

    // =========================================================================
    // STATIC FRONTEND SERVING (Vite build / dist)
    // =========================================================================
    const distPath = path.resolve(import.meta.dir, '../dist');
    if (fs.existsSync(distPath)) {
      let targetFile = path.join(distPath, pathname === '/' ? 'index.html' : pathname);
      if (!fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
        targetFile = path.join(distPath, 'index.html');
      }
      if (fs.existsSync(targetFile)) {
        const fileData = fs.readFileSync(targetFile);
        const mime = getMimeType(targetFile);
        return new Response(fileData, {
          status: 200,
          headers: {
            'Content-Type': mime,
            ...CORS_HEADERS
          }
        });
      }
    }

    return new Response('DriveVault API Running on Port 4000. Open http://localhost:5173 for Vite UI.', {
      status: 200,
      headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS }
    });
  }
});

console.log(`\n======================================================`);
console.log(`🚀 DriveVault Server successfully running on :${server.port}`);
console.log(`📁 Vault Root:   ${VAULT_ROOT}`);
console.log(`🔒 Metadata DB:  ${path.join(VAULT_ROOT, '../metadata.db')}`);
console.log(`🛡️  Safety Check: PASSED (DATA_DIR confined to ./data/vault)`);
console.log(`🔑 Seeded Keys:  finance-ops-key, ci-cd-deployer, backup-service`);
console.log(`======================================================\n`);
