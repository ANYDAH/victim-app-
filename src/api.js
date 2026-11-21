// INTENTIONAL for demo — agents discover these
// TODO remove before prod: service key finance-ops-key-7f3a9c

const STORAGE_KEY = 'drivevault_api_key';
const DEFAULT_KEY = 'finance-ops-key-7f3a9c';

export function getApiKey() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_KEY;
}

export function setApiKey(key) {
  if (key) {
    localStorage.setItem(STORAGE_KEY, key);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export async function fetchFiles() {
  const apiKey = getApiKey();
  const response = await fetch('/api/files', {
    headers: {
      'x-api-key': apiKey,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized: Invalid or missing API key');
    }
    throw new Error(`Failed to fetch files: ${response.statusText}`);
  }

  const data = await response.json();
  const isRansomHeader = response.headers.get('x-ransom-detected') === 'true';
  return { data, isRansomHeader };
}

export async function uploadFile(file, category = '') {
  const apiKey = getApiKey();
  const formData = new FormData();
  formData.append('file', file);
  if (category) {
    formData.append('category', category);
  }

  const response = await fetch('/api/files', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
  }

  return await response.json();
}

export async function deleteFile(id) {
  const apiKey = getApiKey();
  const response = await fetch(`/api/files/${id}`, {
    method: 'DELETE',
    headers: {
      'x-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Delete failed: ${response.statusText}`);
  }

  return await response.json();
}

export async function fetchFileContent(id) {
  const apiKey = getApiKey();
  const response = await fetch(`/api/files/${id}`, {
    headers: {
      'x-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load file preview: ${response.statusText}`);
  }

  return await response.text();
}

export function getDownloadUrl(id) {
  const apiKey = getApiKey();
  return `/api/files/${id}?key=${encodeURIComponent(apiKey)}`;
}

// Unauthenticated debug endpoint intentionally left open
export async function fetchDebugEnv() {
  const response = await fetch('/api/debug/env');
  return await response.json();
}
