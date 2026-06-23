import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import { fetchVmState } from '../../../api.js';

/**
 * Format JSON for display
 */
function formatJson(value) {
  return JSON.stringify(value ?? {}, null, 2);
}

/**
 * VM State Detail Component
 * Shows original creation config and current runtime state side-by-side
 */
export default function VMStateDetail({ apiBase, vmName }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stateData, setStateData] = useState(null);

  useEffect(() => {
    // Don't run effect if no vmName - component will just show the info message
    if (!vmName) {
      return;
    }

    async function loadState() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchVmState(apiBase, vmName);
        setStateData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadState();
  }, [apiBase, vmName]);

  if (!vmName) {
    return (
      <Alert severity="info">
        Select a VM to view its detailed state information.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 3 }}>
        <CircularProgress size={24} />
        <Typography>Loading VM state...</Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load VM state: {error}
      </Alert>
    );
  }

  if (!stateData) {
    return (
      <Alert severity="warning">
        No state data available for {vmName}
      </Alert>
    );
  }

  const { original_config, runtime_state } = stateData;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" gutterBottom>
          VM State: {vmName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This page shows the original creation configuration and current runtime state.
          Runtime state may drift from the original config as the VM runs.
        </Typography>
      </Box>

      <Divider />

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
        }}
      >
        {/* Original Creation Config */}
        <Paper sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="h6">
                  {original_config?.label || 'Original Creation Config'}
                </Typography>
                <Chip size="small" label="Template" color="secondary" />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {original_config?.note || 'The configuration used when this VM was first created.'}
              </Typography>
            </Box>

            <Box
              component="pre"
              sx={{
                p: 2,
                borderRadius: 2,
                overflow: 'auto',
                maxHeight: 600,
                backgroundColor: (theme) => alpha(theme.palette.common.black, 0.24),
                color: 'text.primary',
                fontSize: '0.875rem',
              }}
            >
              {formatJson(original_config)}
            </Box>
          </Stack>
        </Paper>

        {/* Runtime State */}
        <Paper sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="h6">Current Runtime State</Typography>
                {runtime_state?.state ? (
                  <Chip size="small" label="Active" color="success" />
                ) : (
                  <Chip size="small" label="No State" color="default" />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {runtime_state?.note || 'Current state observed by the worker. May differ from original config.'}
              </Typography>
              {runtime_state?.observed_at && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Last observed: {new Date(runtime_state.observed_at).toLocaleString()} 
                  {runtime_state.observation_source && ` (via ${runtime_state.observation_source})`}
                </Typography>
              )}
            </Box>

            {runtime_state?.state ? (
              <Box
                component="pre"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  overflow: 'auto',
                  maxHeight: 600,
                  backgroundColor: (theme) => alpha(theme.palette.common.black, 0.24),
                  color: 'text.primary',
                  fontSize: '0.875rem',
                }}
              >
                {formatJson(runtime_state.state)}
              </Box>
            ) : (
              <Alert severity="info">
                No runtime state available. The VM may not have been started yet, or state collection hasn&apos;t run.
              </Alert>
            )}
          </Stack>
        </Paper>
      </Box>

      <Paper sx={{ p: 2.5, backgroundColor: (theme) => alpha(theme.palette.info.main, 0.08) }}>
        <Stack spacing={1}>
          <Typography variant="subtitle2" color="info.main">
            💡 Understanding Config vs State
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Original Config:</strong> The template used when creating the VM. This never changes.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Runtime State:</strong> The current state of the running VM, which can drift as you make changes (resource adjustments, network modifications, etc.).
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the original config as a reference for recreating or cloning the VM. Use runtime state to understand its current operational status.
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}
