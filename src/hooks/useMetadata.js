/**
 * Metadata fetching hook (users, network groups, resource limits).
 */

import { useState, useEffect } from 'react';
import { fetchUsers, fetchNetworkGroups } from '../api.js';

/**
 * Hook for fetching and managing global metadata.
 *
 * @param {string} apiBase - API base URL.
 * @param {Function} showMessage - Snackbar notification function.
 * @returns {{users: Array, networkGroups: Array, resourceLimits: object}}
 */
export function useMetadata(apiBase, showMessage) {
  const [users, setUsers] = useState([]);
  const [networkGroups, setNetworkGroups] = useState([]);
  const [resourceLimits] = useState({
    maxRamMb: 8192,
    maxVcpus: 4,
    maxDiskGb: 20,
  });

  useEffect(() => {
    let isCurrent = true;

    async function fetchMetadata() {
      try {
        const [usersData, groupsData] = await Promise.all([
          fetchUsers(apiBase),
          fetchNetworkGroups(apiBase),
        ]);
        
        if (isCurrent) {
          setUsers(usersData);
          setNetworkGroups(groupsData);
          
          // Extract resource limits from API response if available
          // For now, using hardcoded defaults
        }
      } catch (error) {
        if (isCurrent) {
          showMessage(`Failed to load metadata: ${error.message}`, 'error');
        }
      }
    }

    void fetchMetadata();

    return () => {
      isCurrent = false;
    };
  }, [apiBase, showMessage]);

  return { users, networkGroups, resourceLimits };
}
