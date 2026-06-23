/**
 * API health monitoring hook.
 */

import { useState, useEffect } from 'react';
import { fetchHealth } from '../api.js';

/**
 * Hook for managing API base URL and health state.
 *
 * @param {string} defaultApiBase - Default API base URL.
 * @returns {{apiBase: string, apiBaseInput: string, health: object, setApiBase: Function, setApiBaseInput: Function}}
 */
export function useApiHealth(defaultApiBase = '') {
  const [apiBaseInput, setApiBaseInput] = useState(defaultApiBase);
  const [apiBase, setApiBase] = useState(defaultApiBase);
  const [health, setHealth] = useState({ state: 'checking', message: 'Checking API' });

  useEffect(() => {
    let isCurrent = true;

    async function checkHealth() {
      try {
        const response = await fetchHealth(apiBase);
        if (isCurrent) {
          setHealth({ state: 'ok', message: response.message || 'API is healthy' });
        }
      } catch (error) {
        if (isCurrent) {
          setHealth({ state: 'error', message: error.message || 'API unavailable' });
        }
      }
    }

    void checkHealth();

    return () => {
      isCurrent = false;
    };
  }, [apiBase]);

  return { apiBase, apiBaseInput, health, setApiBase, setApiBaseInput };
}
