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
 * Build VM log stream URL for Server-Sent Events.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} vmName - VM name.
 * @param {number} lines - Number of initial lines to stream.
 * @returns {string} Stream URL.
 */
export function buildVmLogStreamUrl(baseUrl, vmName, lines) {
  return buildApiUrl(baseUrl, `/api/vms/${encodeURIComponent(vmName)}/logs/stream`, { lines });
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
 * Fetch system configuration including resource limits.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @returns {Promise<any>} Config payload with limits.
 */
export function fetchConfig(baseUrl) {
  return requestJson(baseUrl, '/api/config');
}

/**
 * Fetch persisted tenant/user records.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @returns {Promise<any>} User list payload.
 */
export function fetchUsers(baseUrl) {
  return requestJson(baseUrl, '/api/users');
}

/**
 * Fetch configured network groups.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @returns {Promise<any>} Network-group list payload.
 */
export function fetchNetworkGroups(baseUrl) {
  return requestJson(baseUrl, '/api/network-groups');
}

/**
 * Fetch VM configs (definitions/templates) - these are NOT running VMs
 * 
 * @param {string} baseUrl - Optional external API base URL
 * @returns {Promise<any>} VM configs payload
 */
export function fetchConfigs(baseUrl) {
  return requestJson(baseUrl, '/api/configs');
}

/**
 * Create a new network group.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {object} payload - Network-group request payload.
 * @returns {Promise<any>} Created network-group payload.
 */
export function createNetworkGroup(baseUrl, payload) {
  return requestJson(baseUrl, '/api/network-groups', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a network group.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} networkGroupId - Network group ID to delete.
 * @returns {Promise<any>} Deleted network-group payload.
 */
export function deleteNetworkGroup(baseUrl, networkGroupId) {
  return requestJson(baseUrl, `/api/network-groups/${networkGroupId}`, {
    method: 'DELETE',
  });
}

/**
 * Validate a network group CIDR.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} cidr - CIDR to validate.
 * @returns {Promise<{valid: boolean, cidr: string, error?: string}>} Validation result.
 */
export function validateNetworkGroupCidr(baseUrl, cidr) {
  return requestJson(baseUrl, '/api/network-groups/validate-cidr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cidr }),
  });
}

/**
 * Get a suggested available CIDR for a new network group.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @returns {Promise<{cidr: string}>} Suggested CIDR.
 */
export function suggestNetworkGroupCidr(baseUrl) {
  return requestJson(baseUrl, '/api/network-groups/suggest-cidr');
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
 * Fetch VM state - combines original config + current runtime state
 * 
 * @param {string} baseUrl - Optional external API base URL
 * @param {string} vmName - VM name
 * @returns {Promise<any>} VM state payload with original_config and runtime_state
 */
export function fetchVmState(baseUrl, vmName) {
  return requestJson(baseUrl, `/api/vms/${encodeURIComponent(vmName)}/state`);
}

/**
 * Save a VM config without provisioning it.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {object} payload - Config request payload.
 * @returns {Promise<any>} Saved config payload.
 */
export function saveVmConfig(baseUrl, payload) {
  return requestJson(baseUrl, '/api/configs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing VM config.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} configName - Current config name.
 * @param {object} payload - Updated config request payload.
 * @returns {Promise<any>} Updated config payload.
 */
export function updateVmConfig(baseUrl, configName, payload) {
  return requestJson(baseUrl, `/api/configs/${encodeURIComponent(configName)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a VM config/template.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} configName - Config name to delete.
 * @returns {Promise<void>} Resolves when deleted.
 */
export function deleteVmConfig(baseUrl, configName) {
  return requestJson(baseUrl, `/api/configs/${encodeURIComponent(configName)}`, {
    method: 'DELETE',
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
 * Start a VM.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} vmName - VM name.
 * @returns {Promise<any>} Start result payload.
 */
export function startVm(baseUrl, vmName) {
  return requestJson(baseUrl, `/api/vms/${encodeURIComponent(vmName)}/start`, {
    method: 'POST',
  });
}

/**
 * Stop a VM.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} vmName - VM name.
 * @returns {Promise<any>} Stop result payload.
 */
export function stopVm(baseUrl, vmName) {
  return requestJson(baseUrl, `/api/vms/${encodeURIComponent(vmName)}/stop`, {
    method: 'POST',
  });
}

/**
 * Update saved per-VM network policy flags.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} vmName - VM name.
 * @param {object} payload - Policy patch payload.
 * @returns {Promise<any>} Updated config payload.
 */
export function updateVmPolicy(baseUrl, vmName, payload) {
  return requestJson(baseUrl, `/api/vms/${encodeURIComponent(vmName)}/policy`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Clone a VM using a new config payload.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} sourceVmName - Source VM name.
 * @param {object} payload - Clone config request payload.
 * @returns {Promise<any>} Clone result payload.
 */
export function cloneVm(baseUrl, sourceVmName, payload) {
  return requestJson(baseUrl, `/api/vms/${encodeURIComponent(sourceVmName)}/clone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Create a VM snapshot.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} vmName - VM name.
 * @returns {Promise<any>} Snapshot result payload.
 */
export function createVmSnapshot(baseUrl, vmName) {
  return requestJson(baseUrl, `/api/vms/${encodeURIComponent(vmName)}/snapshots`, {
    method: 'POST',
  });
}

/**
 * Restore a VM from a snapshot.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} vmName - VM name.
 * @param {string} snapshotId - Snapshot identifier.
 * @returns {Promise<any>} Restore result payload.
 */
export function restoreVmSnapshot(baseUrl, vmName, snapshotId) {
  return requestJson(baseUrl, `/api/vms/${encodeURIComponent(vmName)}/snapshots/${encodeURIComponent(snapshotId)}/restore`, {
    method: 'POST',
  });
}

/**
 * Delete a VM snapshot.
 *
 * @param {string} baseUrl - Optional external API base URL.
 * @param {string} vmName - VM name.
 * @param {string} snapshotId - Snapshot identifier.
 * @returns {Promise<any>} Delete result payload.
 */
export function deleteVmSnapshot(baseUrl, vmName, snapshotId) {
  return requestJson(baseUrl, `/api/vms/${encodeURIComponent(vmName)}/snapshots/${encodeURIComponent(snapshotId)}`, {
    method: 'DELETE',
  });
}


/**
 * Fetch VM logs from database snapshot
 * 
 * @param {string} baseUrl - Optional external API base URL
 * @param {string} vmName - VM name
 * @returns {Promise<object>} Log snapshot with vm_name, snapshot_at, line_count, log_content, collected_by
 */
export function fetchVmLogs(baseUrl, vmName) {
  return requestJson(baseUrl, `/api/vms/${encodeURIComponent(vmName)}/logs`);
}

/**
 * Fetch all VM log snapshots
 * 
 * @param {string} baseUrl - Optional external API base URL
 * @returns {Promise<object>} List of log snapshots
 */
export function fetchAllVmLogs(baseUrl) {
  return requestJson(baseUrl, '/api/logs');
}

/**
 * Fetch job details by ID
 * 
 * @param {string} baseUrl - Optional external API base URL
 * @param {string|number} jobId - Job ID
 * @returns {Promise<object>} Job details with status, type, result, error, etc.
 */
export function fetchJob(baseUrl, jobId) {
  return requestJson(baseUrl, `/api/jobs/${encodeURIComponent(jobId)}`);
}

/**
 * Fetch job events/logs by job ID
 * 
 * @param {string} baseUrl - Optional external API base URL
 * @param {string|number} jobId - Job ID
 * @param {number} [limit=100] - Maximum number of events to fetch
 * @returns {Promise<object>} Job events with timestamps and messages
 */
export function fetchJobEvents(baseUrl, jobId, limit = 100) {
  return requestJson(baseUrl, `/api/jobs/${encodeURIComponent(jobId)}/events`, {}, { limit });
}
