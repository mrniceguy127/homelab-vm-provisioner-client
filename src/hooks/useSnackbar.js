/**
 * Snackbar notification hook.
 */

import { useState, useCallback } from 'react';

/**
 * Hook for managing snackbar notifications.
 *
 * @returns {{snackbar: object, showMessage: Function, hideSnackbar: Function}}
 */
export function useSnackbar() {
  const [snackbar, setSnackbar] = useState({ open: false, severity: 'info', message: '' });

  const showMessage = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbar((current) => ({ ...current, open: false }));
  }, []);

  return { snackbar, showMessage, hideSnackbar };
}
