/**
 * VM polling hook for async-aware state management.
 * 
 * Tracks active VM jobs and polls until they complete,
 * keeping the UI in sync with backend state changes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchJob, fetchVms } from '../api.js';

const POLL_INTERVAL_MS = 3000; // Poll every 3 seconds while jobs are active
const SLOW_POLL_INTERVAL_MS = 30000; // Slow poll every 30 seconds when idle

/**
 * Hook for polling VM jobs and keeping VM state fresh.
 *
 * @param {string} apiBase - API base URL.
 * @param {Function} onVmsUpdate - Callback when VMs are refreshed.
 * @param {Function} showMessage - Snackbar notification function.
 * @param {boolean} enabled - Whether polling is enabled.
 * @returns {{
 *   activeJobs: Map<string, object>,
 *   trackJob: Function,
 *   clearJob: Function,
 *   getPendingOperation: Function,
 *   isVmBusy: Function,
 *   refreshVms: Function,
 * }}
 */
export function useVmPolling(apiBase, onVmsUpdate, showMessage, enabled = true) {
  // Map of vmName -> { job_id, status, type, timestamp }
  const [activeJobs, setActiveJobs] = useState(new Map());
  const pollIntervalRef = useRef(null);
  const lastPollRef = useRef(0);

  /**
   * Track a new job for a VM.
   *
   * @param {string} vmName - VM name.
   * @param {object} jobInfo - Job information { job_id, status, type }.
   */
  const trackJob = useCallback((vmName, jobInfo) => {
    setActiveJobs((prev) => {
      const next = new Map(prev);
      next.set(vmName, {
        ...jobInfo,
        timestamp: Date.now(),
      });
      return next;
    });
  }, []);

  /**
   * Clear a job for a VM.
   *
   * @param {string} vmName - VM name.
   */
  const clearJob = useCallback((vmName) => {
    setActiveJobs((prev) => {
      const next = new Map(prev);
      next.delete(vmName);
      return next;
    });
  }, []);

  /**
   * Get pending operation type for a VM.
   *
   * @param {string} vmName - VM name.
   * @returns {string|null} Operation type or null.
   */
  const getPendingOperation = useCallback(
    (vmName) => {
      const job = activeJobs.get(vmName);
      if (!job) return null;
      
      const isTerminal = job.status === 'succeeded' || job.status === 'failed' || job.status === 'canceled';
      return isTerminal ? null : job.type;
    },
    [activeJobs]
  );

  /**
   * Check if a VM has a pending operation.
   *
   * @param {string} vmName - VM name.
   * @returns {boolean} True if VM is busy.
   */
  const isVmBusy = useCallback(
    (vmName) => {
      return getPendingOperation(vmName) !== null;
    },
    [getPendingOperation]
  );

  /**
   * Refresh VM list from backend.
   *
   * @returns {Promise<void>}
   */
  const refreshVms = useCallback(async () => {
    try {
      const response = await fetchVms(apiBase);
      onVmsUpdate(response.vms || []);
    } catch (error) {
      // Silent failure for background refresh
      console.error('Background VM refresh failed:', error.message);
    }
  }, [apiBase, onVmsUpdate]);

  /**
   * Poll active jobs and update their status.
   */
  const pollJobs = useCallback(async () => {
    if (activeJobs.size === 0) {
      return;
    }

    const updates = new Map();
    let shouldRefreshVms = false;

    // Poll each active job
    for (const [vmName, jobInfo] of activeJobs.entries()) {
      try {
        const response = await fetchJob(apiBase, jobInfo.job_id);
        const job = response.job;

        if (!job) {
          updates.set(vmName, null); // Clear job if not found
          continue;
        }

        // Check if job reached terminal state
        const isTerminal =
          job.status === 'succeeded' ||
          job.status === 'failed' ||
          job.status === 'canceled';

        if (isTerminal) {
          shouldRefreshVms = true;
          
          // Show notification for completed/failed jobs
          if (job.status === 'succeeded') {
            showMessage(
              `${vmName}: ${jobInfo.type.replace(/_/g, ' ')} completed successfully`,
              'success'
            );
          } else if (job.status === 'failed') {
            showMessage(
              `${vmName}: ${jobInfo.type.replace(/_/g, ' ')} failed - ${job.error || 'Unknown error'}`,
              'error'
            );
          }

          // Clear terminal jobs after notification
          updates.set(vmName, null);
        } else if (job.status !== jobInfo.status) {
          // Update job status if changed
          updates.set(vmName, { ...jobInfo, status: job.status });
        }
      } catch (error) {
        console.error(`Failed to poll job for ${vmName}:`, error.message);
        // Don't clear the job on poll error - retry next interval
      }
    }

    // Apply updates
    if (updates.size > 0) {
      setActiveJobs((prev) => {
        const next = new Map(prev);
        for (const [vmName, update] of updates.entries()) {
          if (update === null) {
            next.delete(vmName);
          } else {
            next.set(vmName, update);
          }
        }
        return next;
      });
    }

    // Refresh VMs if any job completed
    if (shouldRefreshVms) {
      await refreshVms();
    }
  }, [apiBase, activeJobs, showMessage, refreshVms]);

  /**
   * Start polling interval.
   */
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      return; // Already polling
    }

    const poll = async () => {
      const now = Date.now();
      const hasActiveJobs = activeJobs.size > 0;
      const interval = hasActiveJobs ? POLL_INTERVAL_MS : SLOW_POLL_INTERVAL_MS;

      // Check if enough time passed since last poll
      if (now - lastPollRef.current < interval) {
        return;
      }

      lastPollRef.current = now;

      if (hasActiveJobs) {
        await pollJobs();
      } else {
        // Slow background refresh when idle
        await refreshVms();
      }
    };

    // Initial poll
    void poll();

    // Set up interval (use faster interval, check timing in poll function)
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }, [activeJobs.size, pollJobs, refreshVms]);

  /**
   * Stop polling interval.
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  /**
   * Handle visibility change - refresh when tab gains focus.
   */
  useEffect(() => {
    if (!enabled) return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshVms();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, refreshVms]);

  /**
   * Start/stop polling based on enabled state and active jobs.
   */
  useEffect(() => {
    if (!enabled) {
      stopPolling();
      return undefined;
    }

    startPolling();

    return () => {
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling]);

  return {
    activeJobs,
    trackJob,
    clearJob,
    getPendingOperation,
    isVmBusy,
    refreshVms,
  };
}
