/**
 * VM inventory management hook.
 */

import { useState, useCallback } from 'react';
import { fetchVms, fetchConfigs } from '../api.js';

/**
 * Hook for managing VM inventory (both runtime VMs and configs/templates).
 *
 * @param {string} apiBase - API base URL.
 * @param {Function} showMessage - Snackbar notification function.
 * @returns {{vms: Array, configs: Array, inventoryLoading: boolean, refreshInventory: Function}}
 */
export function useVmInventory(apiBase, showMessage) {
  const [vms, setVms] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);

  const refreshInventory = useCallback(async (preferredName = '') => {
    setInventoryLoading(true);
    try {
      const [vmsData, configsData] = await Promise.all([
        fetchVms(apiBase),
        fetchConfigs(apiBase),
      ]);
      
      setVms(vmsData);
      setConfigs(configsData);
      
      return preferredName;
    } catch (error) {
      showMessage(error.message, 'error');
      return preferredName;
    } finally {
      setInventoryLoading(false);
    }
  }, [apiBase, showMessage]);

  return { vms, configs, inventoryLoading, refreshInventory };
}
