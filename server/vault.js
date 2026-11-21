import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { 
  getFileById, 
  getFileByPath, 
  insertFile, 
  updateFile, 
  markFileDeleted, 
  insertVersion 
} from './db.js';

// Feature 7 SAFETY CHECK: Server refuses to start if DATA_DIR resolves outside ./data/vault
const DEFAULT_VAULT_DIR = path.resolve(import.meta.dir, '../data/vault');
const VAULT_ROOT = path.resolve(process.env.DATA_DIR || DEFAULT_VAULT_DIR);

export function verifySafetyConfig() {
  const allowedPrefix = DEFAULT_VAULT_DIR;
  if (!VAULT_ROOT.startsWith(allowedPrefix)) {
    console.error(`\n======================================================`);
    console.error(`FATAL SAFETY ERROR: DATA_DIR resolves outside ./data/vault!`);
    console.error(`Configured DATA_DIR: ${VAULT_ROOT}`);
    console.error(`Permitted Root:      ${allowedPrefix}`);
    console.error(`Server refusing to start.`);
    console.error(`======================================================\n`);
    process.exit(1);
  }
}

// Run safety check on module import
verifySafetyConfig();

// Ensure vault and .versions directories exist
const VERSIONS_ROOT = path.join(VAULT_ROOT, '.versions');
if (!fs.existsSync(VERSIONS_ROOT)) {
  fs.mkdirSync(VERSIONS_ROOT, { recursive: true });
}

export function getVaultRoot() {
  return VAULT_ROOT;
}

export function computeSha256(bufferOrString) {
  return crypto.createHash('sha256').update(bufferOrString).digest('hex');
}

export function computeFileSha256(filePath) {
  const buffer = fs.readFileSync(filePath);
  return computeSha256(buffer);
}

// Safe path resolver that blocks directory traversal
export function resolveSafePath(relPath) {
  // Normalize and remove leading slashes
  const cleanPath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '').replace(/^[\/\\]+/, '');
  const target = path.resolve(VAULT_ROOT, cleanPath);
  if (!target.startsWith(VAULT_ROOT)) {
    throw new Error('Access denied: Path traversal detected outside vault root');
  }
  return target;
}

// Feature 6: Check for Ransom Note in vault root
export function checkRansomState() {
  const ransomPath = path.join(VAULT_ROOT, 'READ_ME_FOR_RECOVERY.txt');
  if (fs.existsSync(ransomPath)) {
    try {
      const note = fs.readFileSync(ransomPath, 'utf-8');
      const stat = fs.statSync(ransomPath);
      return {
        detected: true,
        filename: 'READ_ME_FOR_RECOVERY.txt',
        path: 'READ_ME_FOR_RECOVERY.txt',
        note: note,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString()
      };
    } catch (e) {
      return {
        detected: true,
        filename: 'READ_ME_FOR_RECOVERY.txt',
        note: 'YOUR FILES HAVE BEEN ENCRYPTED',
        error: e.message
      };
    }
  }
  return { detected: false };
}

// Save or Overwrite a file with automatic version archiving
export async function saveVaultFile({ filename, relativePath, buffer, mimeType }) {
  const relPath = relativePath || filename;
  const fullPath = resolveSafePath(relPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const newHash = computeSha256(buffer);
  const newSize = buffer.length;
  const now = new Date().toISOString();

  // Check if file already exists in DB or on disk
  const existingRecord = getFileByPath(relPath);

  if (existingRecord) {
    const fileId = existingRecord.id;
    const currentVersion = existingRecord.version || 1;

    // Feature 3: Archive existing file to .versions/<fileId>/
    const fileVersionsDir = path.join(VERSIONS_ROOT, fileId);
    if (!fs.existsSync(fileVersionsDir)) {
      fs.mkdirSync(fileVersionsDir, { recursive: true });
    }

    const versionFilename = `v${currentVersion}_${existingRecord.sha256.substring(0, 10)}_${path.basename(relPath)}`;
    const versionPath = path.join(fileVersionsDir, versionFilename);

    if (fs.existsSync(fullPath)) {
      fs.copyFileSync(fullPath, versionPath);
    }

    // Record previous version in SQLite
    const versionId = `ver_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
    insertVersion({
      id: versionId,
      fileId: fileId,
      versionNumber: currentVersion,
      storedPath: path.relative(VAULT_ROOT, versionPath),
      size: existingRecord.size,
      sha256: existingRecord.sha256,
      action: 'overwrite',
      createdAt: now
    });

    // Write new content to disk
    fs.writeFileSync(fullPath, buffer);

    // Update SQLite files table
    const updated = updateFile(fileId, {
      size: newSize,
      sha256: newHash,
      version: currentVersion + 1,
      updatedAt: now
    });

    return { file: updated, versionArchived: true, versionId };
  } else {
    // New file creation
    const fileId = `file_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
    fs.writeFileSync(fullPath, buffer);

    const inserted = insertFile({
      id: fileId,
      name: path.basename(relPath),
      path: relPath,
      size: newSize,
      mimeType: mimeType || 'application/octet-stream',
      sha256: newHash,
      version: 1,
      createdAt: now,
      updatedAt: now
    });

    return { file: inserted, versionArchived: false };
  }
}

// Delete file with automatic version archiving
export function deleteVaultFile(fileId) {
  const record = getFileById(fileId);
  if (!record) {
    throw new Error('File not found in database');
  }

  const fullPath = resolveSafePath(record.path);
  const currentVersion = record.version || 1;
  const now = new Date().toISOString();

  // Feature 3: Archive version to .versions/<fileId>/
  const fileVersionsDir = path.join(VERSIONS_ROOT, fileId);
  if (!fs.existsSync(fileVersionsDir)) {
    fs.mkdirSync(fileVersionsDir, { recursive: true });
  }

  const versionFilename = `v${currentVersion}_deleted_${record.sha256.substring(0, 10)}_${path.basename(record.path)}`;
  const versionPath = path.join(fileVersionsDir, versionFilename);

  if (fs.existsSync(fullPath)) {
    fs.renameSync(fullPath, versionPath); // Move to versions folder
  }

  const versionId = `ver_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
  insertVersion({
    id: versionId,
    fileId: fileId,
    versionNumber: currentVersion,
    storedPath: path.relative(VAULT_ROOT, versionPath),
    size: record.size,
    sha256: record.sha256,
    action: 'delete',
    createdAt: now
  });

  // Mark deleted in SQLite
  markFileDeleted(fileId);

  return { success: true, archivedVersionId: versionId, storedPath: path.relative(VAULT_ROOT, versionPath) };
}
