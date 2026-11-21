import { Database } from 'bun:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.resolve(import.meta.dir, '../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'metadata.db');
let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    // Enable WAL mode for high concurrency
    dbInstance.run('PRAGMA journal_mode = WAL;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

export function initSchema(db) {
  // Files table: records currently active vault files
  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      size INTEGER NOT NULL,
      mime_type TEXT,
      sha256 TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // File versions table: tracks previous versions for rollbacks (mirrors BucketGuard storage adapter)
  db.run(`
    CREATE TABLE IF NOT EXISTS file_versions (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      stored_path TEXT NOT NULL,
      size INTEGER NOT NULL,
      sha256 TEXT NOT NULL,
      action TEXT NOT NULL, -- 'overwrite' or 'delete'
      created_at TEXT NOT NULL,
      FOREIGN KEY (file_id) REFERENCES files (id)
    );
  `);

  // API Keys table: stores seeded principals
  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      key TEXT PRIMARY KEY,
      principal TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

export function getAllFiles() {
  const db = getDb();
  const stmt = db.query('SELECT * FROM files WHERE is_deleted = 0 ORDER BY updated_at DESC');
  return stmt.all().map(row => ({
    id: row.id,
    name: row.name,
    path: row.path,
    size: row.size,
    mimeType: row.mime_type,
    sha256: row.sha256,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export function getFileById(id) {
  const db = getDb();
  const stmt = db.query('SELECT * FROM files WHERE id = ?');
  const row = stmt.get(id);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    size: row.size,
    mimeType: row.mime_type,
    sha256: row.sha256,
    version: row.version,
    isDeleted: Boolean(row.is_deleted),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function getFileByPath(relPath) {
  const db = getDb();
  const stmt = db.query('SELECT * FROM files WHERE path = ?');
  const row = stmt.get(relPath);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    size: row.size,
    mimeType: row.mime_type,
    sha256: row.sha256,
    version: row.version,
    isDeleted: Boolean(row.is_deleted),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function insertFile(file) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO files (id, name, path, size, mime_type, sha256, version, is_deleted, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `);
  stmt.run(
    file.id,
    file.name,
    file.path,
    file.size,
    file.mimeType || 'application/octet-stream',
    file.sha256,
    file.version || 1,
    file.createdAt || new Date().toISOString(),
    file.updatedAt || new Date().toISOString()
  );
  return getFileById(file.id);
}

export function updateFile(id, updates) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE files
    SET size = ?, sha256 = ?, version = ?, is_deleted = 0, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(
    updates.size,
    updates.sha256,
    updates.version,
    updates.updatedAt || new Date().toISOString(),
    id
  );
  return getFileById(id);
}

export function markFileDeleted(id) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE files
    SET is_deleted = 1, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(new Date().toISOString(), id);
}

export function insertVersion(version) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO file_versions (id, file_id, version_number, stored_path, size, sha256, action, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    version.id,
    version.fileId,
    version.versionNumber,
    version.storedPath,
    version.size,
    version.sha256,
    version.action,
    version.createdAt || new Date().toISOString()
  );
}

export function getVersionsForFile(fileId) {
  const db = getDb();
  const stmt = db.query('SELECT * FROM file_versions WHERE file_id = ? ORDER BY version_number ASC');
  return stmt.all(fileId);
}

export function validateApiKey(key) {
  if (!key) return null;
  const db = getDb();
  const stmt = db.query('SELECT * FROM api_keys WHERE key = ?');
  const row = stmt.get(key);
  if (row) return row;

  // Also support principal fallback if exact key token matches
  const fallbackStmt = db.query('SELECT * FROM api_keys WHERE principal = ?');
  return fallbackStmt.get(key);
}

export function seedApiKeysTable() {
  const db = getDb();
  db.run('DELETE FROM api_keys;');
  const stmt = db.prepare(`
    INSERT INTO api_keys (key, principal, role, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const keys = [
    // Feature 4: finance-ops-key leaked in frontend comment
    { key: 'finance-ops-key-7f3a9c', principal: 'finance-ops-key', role: 'finance' },
    { key: 'finance-ops-key', principal: 'finance-ops-key', role: 'finance' },

    // Feature 4: ci-cd-deployer leaked in GET /api/debug/env
    { key: 'ci-cd-deployer-2b8e1d', principal: 'ci-cd-deployer', role: 'ci-cd' },
    { key: 'ci-cd-deployer', principal: 'ci-cd-deployer', role: 'ci-cd' },

    // Principal 3: backup-service
    { key: 'backup-service-4a91e8', principal: 'backup-service', role: 'backup' },
    { key: 'backup-service', principal: 'backup-service', role: 'backup' }
  ];

  const now = new Date().toISOString();
  for (const k of keys) {
    stmt.run(k.key, k.principal, k.role, now);
  }
}
