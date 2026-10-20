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
    throw new Error(`Health check failed (${response.status}): ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetches the supported configuration options and limits from the backend.
 * @returns {Promise<object>} Supported configurations metadata
 */
export async function fetchBackendConfig() {
  const url = `${BASE_URL}/api/config`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load server configuration (${response.status}): ${response.statusText}`);
  }

  return response.json();
}

/**
 * Sends a simulation request to the C++ backend.
 * @param {object} payload Simulation parameters
 * @returns {Promise<object>} Full simulation report and access trace history
 */
export async function runSimulation(payload) {
  const url = `${BASE_URL}/api/simulate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = `Simulation request failed (${response.status})`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      // Body wasn't JSON
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Sends a multi-configuration comparison request to the C++ backend.
 * The backend generates the workload memory access trace once and runs
 * all configurations on the identical sequence.
 * @param {object} payload Comparison parameters with workload and configurations
 * @returns {Promise<object>} Comparison response with metrics for all configurations
 */
export async function runComparison(payload) {
  const url = `${BASE_URL}/api/compare`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = `Comparison request failed (${response.status})`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      // Body wasn't JSON
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export function getApiBaseUrl() {
  return BASE_URL || '(Proxy to backend: http://localhost:8080)';
}

