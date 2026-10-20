// API Service for CPU Cache Simulator
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Checks the status of the C++ Crow backend service.
 * @returns {Promise<object>} Backend status payload
 */
export async function getBackendHealth() {
  const url = `${BASE_URL}/api/health`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Backend error (${response.status}): ${response.statusText}`);
  }

  return response.json();
}

export function getApiBaseUrl() {
  return BASE_URL || '(Proxy to dev backend: http://localhost:8080)';
}
