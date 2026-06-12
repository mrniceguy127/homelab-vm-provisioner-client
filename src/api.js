/**
 * Normalize an optional API base URL.
 *
 * @param {string} baseUrl - User-supplied API base URL.
 * @returns {string} Trimmed base URL without a trailing slash.
 */
export function normalizeBaseUrl(baseUrl) {
  return (baseUrl || '').trim().replace(/\/$/, '');
}

/**
 * Build a same-origin relative API URL.
 *
 * @param {string} pathname - Request path.
 * @param {Record<string, string|number|undefined|null>} [searchParams] - Optional query parameters.
 * @returns {string} Relative request URL.
 */
export function buildRelativeUrl(pathname, searchParams) {
  const url = new URL(pathname, window.location.origin);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return `${url.pathname}${url.search}`;
}

/**
 * Build an absolute API URL from an explicit base URL.
 *
 * @param {string} baseUrl - External API base URL.
 * @param {string} pathname - Request path.
 * @param {Record<string, string|number|undefined|null>} [searchParams] - Optional query parameters.
 * @returns {string} Absolute request URL.
 */
export function buildAbsoluteUrl(baseUrl, pathname, searchParams) {
  const base = normalizeBaseUrl(baseUrl);
  const url = new URL(pathname, `${base}/`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

/**
 * Build an API URL using either a custom base URL or same-origin routing.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} pathname - Request path.
 * @param {Record<string, string|number|undefined|null>} [searchParams] - Optional query parameters.
 * @returns {string} Absolute or relative request URL.
 */
export function buildApiUrl(baseUrl, pathname, searchParams) {
  return normalizeBaseUrl(baseUrl)
    ? buildAbsoluteUrl(baseUrl, pathname, searchParams)
    : buildRelativeUrl(pathname, searchParams);
}

/**
 * Issue an HTTP request and parse a JSON-style API response.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} pathname - Request path.
 * @param {RequestInit} [options={}] - Fetch options.
 * @param {Record<string, string|number|undefined|null>} [searchParams] - Optional query parameters.
 * @returns {Promise<any>} Parsed response payload.
 * @throws {Error} Throws when the API responds with a non-success status.
 */
export async function requestJson(baseUrl, pathname, options = {}, searchParams) {
  const response = await fetch(buildApiUrl(baseUrl, pathname, searchParams), options);

  let payload = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    payload = await response.json();
  } else {
    const text = await response.text();
    payload = text ? { error: text } : null;
  }

  if (!response.ok) {
    const message = payload?.error || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.details = payload?.details || null;
    throw error;
  }

  return payload;
}

/**
 * Fetch the API health endpoint.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @returns {Promise<any>} Health payload.
 */
export function fetchHealth(baseUrl) {
  return requestJson(baseUrl, '/health');
}

/**
 * Fetch the configured VM inventory.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @returns {Promise<any>} VM inventory payload.
 */
export function fetchVms(baseUrl) {
  return requestJson(baseUrl, '/api/vms');
}

/**
 * Fetch one VM detail payload.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} vmName - VM name.
 * @returns {Promise<any>} VM detail payload.
 */
export function fetchVm(baseUrl, vmName) {
  return requestJson(baseUrl, `/api/vms/${encodeURIComponent(vmName)}`);
}

/**
 * Save a VM config without provisioning it.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {object} payload - Config request payload.
 * @returns {Promise<any>} Saved config payload.
 */
export function saveVmConfig(baseUrl, payload) {
  return requestJson(baseUrl, '/api/vms/configs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Save and provision a VM from a supplied config payload.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {object} payload - Config request payload.
 * @returns {Promise<any>} Provision result payload.
 */
export function createVm(baseUrl, payload) {
  return requestJson(baseUrl, '/api/vms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Provision a VM from an existing saved config.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} vmName - Saved config VM name.
 * @returns {Promise<any>} Provision result payload.
 */
export function provisionSavedVm(baseUrl, vmName) {
  return requestJson(baseUrl, `/api/vms/${encodeURIComponent(vmName)}/provision`, {
    method: 'POST',
  });
}

/**
 * Destroy a VM while keeping its saved config.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} vmName - VM name.
 * @returns {Promise<any>} Destroy result payload.
 */
export function destroyVm(baseUrl, vmName) {
  return requestJson(baseUrl, `/api/vms/${encodeURIComponent(vmName)}`, {
    method: 'DELETE',
  });
}

/**
 * Fetch a snapshot of VM logs.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} vmName - VM name.
 * @param {number} [lines=200] - Number of lines to request.
 * @returns {Promise<any>} Log snapshot payload.
 */
export function fetchVmLogs(baseUrl, vmName, lines = 200) {
  return requestJson(baseUrl, `/api/vms/${encodeURIComponent(vmName)}/logs`, {}, { lines });
}

/**
 * Build the Server-Sent Events URL for live VM logs.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} vmName - VM name.
 * @param {number} [lines=100] - Number of initial lines to request.
 * @returns {string} EventSource URL.
 */
export function buildVmLogStreamUrl(baseUrl, vmName, lines = 100) {
  return buildApiUrl(baseUrl, `/api/vms/${encodeURIComponent(vmName)}/logs/stream`, { lines });
}
