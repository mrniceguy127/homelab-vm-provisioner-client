/**
 * Job progress tracking hook.
 */

import { useState, useCallback, useEffect } from 'react';
import { fetchJob, fetchJobEvents } from '../api.js';

/**
 * Hook for managing job progress tracking.
 *
 * @param {string} apiBase - API base URL.
 * @param {Function} showMessage - Snackbar notification function.
 * @returns {{vmJobs: object, jobProgressOpen: boolean, selectedJobId: string|null, jobDetails: object|null, jobEvents: Array, jobLoading: boolean, setVmJobs: Function, openJobProgress: Function, closeJobProgress: Function, loadJobProgress: Function}}
 */
export function useJobProgress(apiBase, showMessage) {
  const [vmJobs, setVmJobs] = useState({});
  const [jobProgressOpen, setJobProgressOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [jobEvents, setJobEvents] = useState([]);
  const [jobLoading, setJobLoading] = useState(false);

  const loadJobProgress = useCallback(async (jobId) => {
    if (!jobId) return;

    setJobLoading(true);
    try {
      const [details, events] = await Promise.all([
        fetchJob(apiBase, jobId),
        fetchJobEvents(apiBase, jobId),
      ]);
      
      setJobDetails(details);
      setJobEvents(events);
    } catch (error) {
      showMessage(`Failed to load job progress: ${error.message}`, 'error');
    } finally {
      setJobLoading(false);
    }
  }, [apiBase, showMessage]);

  const openJobProgress = useCallback((jobId) => {
    setSelectedJobId(jobId);
    setJobProgressOpen(true);
    void loadJobProgress(jobId);
  }, [loadJobProgress]);

  const closeJobProgress = useCallback(() => {
    setJobProgressOpen(false);
    setSelectedJobId(null);
    setJobDetails(null);
    setJobEvents([]);
  }, []);

  // Auto-refresh job progress when dialog is open and job is in progress
  useEffect(() => {
    if (!jobProgressOpen || !selectedJobId) return undefined;

    const status = jobDetails?.status;
    if (status === 'succeeded' || status === 'failed') return undefined;

    const interval = setInterval(() => {
      void loadJobProgress(selectedJobId);
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [jobProgressOpen, selectedJobId, jobDetails?.status, loadJobProgress]);

  return {
    vmJobs,
    jobProgressOpen,
    selectedJobId,
    jobDetails,
    jobEvents,
    jobLoading,
    setVmJobs,
    openJobProgress,
    closeJobProgress,
    loadJobProgress,
  };
}
