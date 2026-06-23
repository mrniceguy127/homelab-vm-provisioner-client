import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

import { fetchJob, fetchJobEvents } from '../../api.js';
import { formatJson } from '../../utils/displayUtils.js';
import JsonPanel from '../../components/common/JsonPanel.jsx';
import JobStatusHeader from './components/JobStatusHeader.jsx';
import JobEventsTimeline from './components/JobEventsTimeline.jsx';

/**
 * Job Progress Dialog for monitoring async job execution.
 *
 * @param {object} props - Component props.
 * @param {boolean} props.open - Whether dialog is open.
 * @param {Function} props.onClose - Close handler.
 * @param {string|number} props.jobId - Job ID to monitor.
 * @param {string} props.apiBase - API base URL.
 * @param {Function} props.showMessage - Show snackbar message.
 * @returns {import('react').JSX.Element} Job Progress Dialog.
 */
export default function JobProgressDialog({ open, onClose, jobId, apiBase, showMessage }) {
  const [jobDetails, setJobDetails] = useState(null);
  const [jobEvents, setJobEvents] = useState([]);
  const [jobLoading, setJobLoading] = useState(false);

  // Load job progress when dialog opens or jobId changes
  useEffect(() => {
    if (!open || !jobId) {
      return;
    }

    async function loadJobProgress() {
      setJobLoading(true);
      try {
        const [jobResult, eventsResult] = await Promise.all([
          fetchJob(apiBase, jobId),
          fetchJobEvents(apiBase, jobId, 100),
        ]);

        setJobDetails(jobResult.job);
        setJobEvents(eventsResult.events || []);
      } catch (error) {
        showMessage(`Failed to load job progress: ${error.message}`, 'error');
      } finally {
        setJobLoading(false);
      }
    }

    void loadJobProgress();
  }, [open, jobId, apiBase, showMessage]);

  // Auto-refresh job progress when job is in progress
  useEffect(() => {
    if (!open || !jobId) {
      return undefined;
    }

    const isInProgress = jobDetails?.status === 'queued' || jobDetails?.status === 'running';
    if (!isInProgress) {
      return undefined;
    }

    const intervalId = setInterval(async () => {
      try {
        const [jobResult, eventsResult] = await Promise.all([
          fetchJob(apiBase, jobId),
          fetchJobEvents(apiBase, jobId, 100),
        ]);

        setJobDetails(jobResult.job);
        setJobEvents(eventsResult.events || []);
      } catch (error) {
        showMessage(`Failed to refresh job progress: ${error.message}`, 'error');
      }
    }, 3000); // Refresh every 3 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [open, jobId, jobDetails?.status, apiBase, showMessage]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <JobStatusHeader jobDetails={jobDetails} />
      </DialogTitle>
      <DialogContent>
        {jobLoading && !jobDetails ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : jobDetails ? (
          <Stack spacing={2.5}>
            {jobDetails.status === 'failed' && jobDetails.error ? (
              <Alert severity="error">
                <Typography variant="subtitle2">Job Failed</Typography>
                <Typography variant="body2">{jobDetails.error}</Typography>
              </Alert>
            ) : null}

            {jobDetails.status === 'succeeded' && jobDetails.result ? (
              <Alert severity="success">
                <Typography variant="subtitle2">Job Succeeded</Typography>
                <Typography variant="body2">
                  {jobDetails.result.message || 'Job completed successfully'}
                </Typography>
              </Alert>
            ) : null}

            <JobEventsTimeline jobEvents={jobEvents} />

            {jobDetails.result || jobDetails.error ? (
              <JsonPanel
                title={jobDetails.status === 'failed' ? 'Error Details' : 'Result Details'}
                subtitle="Full job result or error information"
                value={formatJson(jobDetails.result || jobDetails.error || {})}
              />
            ) : null}
          </Stack>
        ) : (
          <Typography color="text.secondary">No job details available.</Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="outlined"
          startIcon={<RefreshRoundedIcon />}
          onClick={() => void loadJobProgress()}
          disabled={jobLoading}
        >
          Refresh
        </Button>
      </DialogActions>
    </Dialog>
  );
}
