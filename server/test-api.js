import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:4000';

async function runTests() {
  console.log('🧪 Starting DriveVault Comprehensive Integration Tests...\n');

  // Test 1: Health check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  console.log('1. GET /api/health:', healthRes.status, await healthRes.json());
  if (healthRes.status !== 200) throw new Error('Health check failed');

  // Test 2: Feature 4 Planted Vulnerability - GET /api/debug/env (NO AUTH)
  const debugRes = await fetch(`${BASE_URL}/api/debug/env`);
  const debugData = await debugRes.json();
  console.log('2. GET /api/debug/env (No Auth):', debugRes.status, debugData);
  if (debugRes.status !== 200 || debugData.ciCdKey !== 'ci-cd-deployer-2b8e1d') {
    throw new Error('Debug env leak failed');
  }

  // Test 3: Feature 2 Auth Check - GET /api/files without auth header -> 401
  const unauthRes = await fetch(`${BASE_URL}/api/files`);
  console.log('3. GET /api/files without key:', unauthRes.status, await unauthRes.json());
  if (unauthRes.status !== 401) throw new Error('Expected 401 Unauthorized');

  // Test 4: Feature 2 Auth Check - GET /api/files with finance-ops-key
  const authRes = await fetch(`${BASE_URL}/api/files`, {
    headers: { 'x-api-key': 'finance-ops-key-7f3a9c' }
  });
  const files = await authRes.json();
  console.log('4. GET /api/files with finance-ops-key:', authRes.status, `Retrieved ${files.length} files`);
  if (authRes.status !== 200 || !Array.isArray(files) || files.length < 30) {
    throw new Error('Failed to retrieve files with seeded key');
  }

  // Test 5: Feature 2 Upload (POST /api/files)
  const testFilename = 'test_audit_ledger.txt';
  const formData = new FormData();
  const fileBlob = new Blob(['DRIVEVAULT TEST INTEGRATION AUDIT LEDGER v1'], { type: 'text/plain' });
  formData.append('file', fileBlob, testFilename);
  formData.append('category', 'contracts');

  const uploadRes = await fetch(`${BASE_URL}/api/files`, {
    method: 'POST',
    headers: { 'x-api-key': 'ci-cd-deployer-2b8e1d' },
    body: formData
  });
  const uploadData = await uploadRes.json();
  console.log('5. POST /api/files (Create):', uploadRes.status, uploadData);
  if (uploadRes.status !== 201 || !uploadData.file) throw new Error('Upload create failed');

  const createdFileId = uploadData.file.id;

  // Test 6: Feature 3 Versioning on Overwrite
  const formDataV2 = new FormData();
  const fileBlobV2 = new Blob(['DRIVEVAULT TEST INTEGRATION AUDIT LEDGER v2 OVERWRITE CONTENT'], { type: 'text/plain' });
  formDataV2.append('file', fileBlobV2, testFilename);
  formDataV2.append('category', 'contracts');

  const overwriteRes = await fetch(`${BASE_URL}/api/files`, {
    method: 'POST',
    headers: { 'x-api-key': 'backup-service-4a91e8' },
    body: formDataV2
  });
  const overwriteData = await overwriteRes.json();
  console.log('6. POST /api/files (Overwrite):', overwriteRes.status, overwriteData);
  if (overwriteData.file.version !== 2 || !overwriteData.versionArchived) {
    throw new Error('Versioning on overwrite failed');
  }

  // Test 7: GET /api/files/:id
  const getFileRes = await fetch(`${BASE_URL}/api/files/${createdFileId}`, {
    headers: { 'x-api-key': 'finance-ops-key' }
  });
  const fileText = await getFileRes.text();
  console.log('7. GET /api/files/:id:', getFileRes.status, `Content: "${fileText.substring(0, 35)}..."`);
  if (!fileText.includes('v2 OVERWRITE CONTENT')) throw new Error('File content mismatch');

  // Test 8: Feature 3 Versioning on Delete (DELETE /api/files/:id)
  const deleteRes = await fetch(`${BASE_URL}/api/files/${createdFileId}`, {
    method: 'DELETE',
    headers: { 'x-api-key': 'ci-cd-deployer' }
  });
  const deleteData = await deleteRes.json();
  console.log('8. DELETE /api/files/:id:', deleteRes.status, deleteData);
  if (!deleteData.success || !deleteData.archivedVersionId) {
    throw new Error('Versioned delete failed');
  }

  // Test 9: Feature 6 Ransom State Detection
  console.log('\n--- Testing Feature 6: Ransom State Trigger ---');
  const vaultDir = path.resolve(import.meta.dir, '../data/vault');
  const ransomPath = path.join(vaultDir, 'READ_ME_FOR_RECOVERY.txt');
  const ransomDemand = 'ATTENTION: ALL YOUR CORPORATE ASSETS HAVE BEEN LOCKED BY BLACKSHADOW RANSOMWARE.\nPAY 5 BTC TO BC1QXY2KG...*/';
  fs.writeFileSync(ransomPath, ransomDemand);

  const ransomCheckRes = await fetch(`${BASE_URL}/api/files`, {
    headers: { 'x-api-key': 'finance-ops-key' }
  });
  const ransomFiles = await ransomCheckRes.json();
  const ransomHeader = ransomCheckRes.headers.get('x-ransom-detected');
  console.log('9. Ransom Check - Header x-ransom-detected:', ransomHeader);
  console.log('   Top file in list:', ransomFiles[0]);

  if (ransomHeader !== 'true' || ransomFiles[0]?.name !== 'READ_ME_FOR_RECOVERY.txt') {
    throw new Error('Ransom detection failed');
  }

  // Clean up ransom note to restore pristine state
  fs.unlinkSync(ransomPath);
  console.log('   Removed READ_ME_FOR_RECOVERY.txt. Restoring normal state...');
  const normalRes = await fetch(`${BASE_URL}/api/files`, {
    headers: { 'x-api-key': 'finance-ops-key' }
  });
  console.log('   Post-cleanup Header x-ransom-detected:', normalRes.headers.get('x-ransom-detected'));

  console.log('\n🎉 ALL 9 INTEGRATION TESTS PASSED PERFECTLY!\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
