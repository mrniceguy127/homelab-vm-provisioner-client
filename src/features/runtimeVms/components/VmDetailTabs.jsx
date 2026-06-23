import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import BackupRoundedIcon from '@mui/icons-material/BackupRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';

import { restoreVmSnapshot, deleteVmSnapshot, buildVmLogStreamUrl } from '../../../api.js';
import { formatJson } from '../../../utils/displayUtils.js';
import { parseLineCount } from '../../../utils/formUtils.js';
import JsonPanel from '../../../components/common/JsonPanel.jsx';
import VMStateDetail from './VMStateDetail.jsx';

/**
 * VM detail tabs content.
 *
 * @param {object} props - Component props.
 * @returns {import('react').JSX.Element} VM detail tabs.
 */
export default function VmDetailTabs({
  detailTab,
  vmDetail,
  selectedVmName,
  selectedVmOwner,
  selectedVmNetworkGroup,
  snapshots,
  snapshotLines,
  snapshotLog,
  snapshotLoading,
  vmActionState,
  apiBase,
  canCreateSnapshot,
  onSnapshotLinesChange,
  onLoadSnapshot,
  onUpdateVmPolicy,
  onCreateRestorePoint,
  onRefresh,
  onLoadVmDetails,
  showMessage,
}) {
  const [streamLines, setStreamLines] = useState('100');
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamLog, setStreamLog] = useState('');
  const [streamError, setStreamError] = useState('');

  /**
   * Restore VM from snapshot.
   *
   * @param {string} snapshotId - Snapshot identifier.
   */
  async function handleRestoreSnapshot(snapshotId) {
    const confirmed = window.confirm(
      `Restore ${selectedVmName} from snapshot ${snapshotId}? The VM will be stopped and left powered off after the restore.`
    );
    if (!confirmed) {
      return;
    }

    try {
      await restoreVmSnapshot(apiBase, selectedVmName, snapshotId);
      showMessage(`Restored ${selectedVmName} from snapshot ${snapshotId}.`, 'success');
      await onRefresh();
      await onLoadVmDetails();
      await onLoadSnapshot();
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  /**
   * Delete a snapshot.
   *
   * @param {string} snapshotId - Snapshot identifier.
   */
  async function handleDeleteRestorePoint(snapshotId) {
    const confirmed = window.confirm(`Delete snapshot ${snapshotId} for ${selectedVmName}?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteVmSnapshot(apiBase, selectedVmName, snapshotId);
      showMessage(`Deleted snapshot ${snapshotId}.`, 'success');
      await onRefresh();
      await onLoadVmDetails();
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  // Reset stream state when tab changes
  useEffect(() => {
    if (detailTab !== 3) {
      setStreamEnabled(false);
      setStreamConnected(false);
      setStreamLog('');
      setStreamError('');
    }
  }, [detailTab]);

  // Manage log streaming
  useEffect(() => {
    if (!selectedVmName || !streamEnabled || detailTab !== 3) {
      return undefined;
    }

    let stream;
    // Initialize state before starting stream
    setStreamConnected(false);
    setStreamError('');
    setStreamLog('');
    
    try {
      const lines = parseLineCount(streamLines, 100);

      stream = new EventSource(buildVmLogStreamUrl(apiBase, selectedVmName, lines));
      stream.onopen = () => {
        setStreamConnected(true);
      };
      stream.addEventListener('log', (event) => {
        try {
          const payload = JSON.parse(event.data);
          setStreamLog((current) => `${current}${payload.chunk || ''}`);
        } catch {
          setStreamLog((current) => `${current}${event.data}\n`);
        }
      });
      stream.addEventListener('error', (event) => {
        if (typeof event.data === 'string' && event.data) {
          try {
            const payload = JSON.parse(event.data);
            setStreamError(payload.message || 'Log stream reported an error.');
          } catch {
            setStreamError(event.data);
          }
        } else {
          setStreamError('Log stream disconnected.');
        }
        setStreamConnected(false);
      });
    } catch (error) {
      setStreamEnabled(false);
      setStreamError(error.message);
      showMessage(error.message, 'warning');
      return undefined;
    }

    return () => {
      stream?.close();
      setStreamConnected(false);
    };
  }, [apiBase, selectedVmName, streamEnabled, streamLines, detailTab, showMessage]);

  if (detailTab === 0) {
    return (
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
        }}
      >
        <Paper sx={{ p: 2.5 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6">Runtime overview</Typography>
            <Typography variant="body2" color="text.secondary">
              Trust: {vmDetail?.trust || 'not set'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Admin key: {vmDetail?.admin_private_key || 'Unavailable'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              VM data dir: {vmDetail?.vm_data_dir || 'Unavailable'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Stored config path: {vmDetail?.storedConfigPath || 'None'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Log path: {vmDetail?.log_path || 'Unavailable'}
            </Typography>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2.5 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6">Network + ports</Typography>
            <Typography variant="body2" color="text.secondary">
              Network group:{' '}
              {selectedVmNetworkGroup?.name ||
                vmDetail?.network?.group_name ||
                vmDetail?.network_group_id ||
                'Unavailable'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Subnet: {vmDetail?.network?.subnet_cidr || vmDetail?.network?.cidr || 'Unavailable'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Network: {vmDetail?.network?.name || 'Unavailable'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              CIDR: {vmDetail?.network?.cidr || 'Unavailable'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              VM IP: {vmDetail?.network?.vm_ip || vmDetail?.ip_address || 'Unavailable'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              MAC: {vmDetail?.network?.mac || 'Unavailable'}
            </Typography>
            <Box
              component="pre"
              sx={{
                p: 1.75,
                borderRadius: 2,
                backgroundColor: (theme) => alpha(theme.palette.common.black, 0.24),
              }}
            >
              {vmDetail?.ports?.length
                ? formatJson(vmDetail.ports)
                : 'No forwarded ports configured.'}
            </Box>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2.5 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6">Group Isolation</Typography>
            <Typography variant="body2" color="text.secondary">
              Owner: {selectedVmOwner?.username || vmDetail?.owner_user_id || 'unknown'}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={vmDetail?.allow_same_group_traffic !== false}
                  disabled={vmActionState !== 'idle'}
                  onChange={(event) =>
                    void onUpdateVmPolicy({
                      allow_same_group_traffic: event.target.checked,
                    })
                  }
                />
              }
              label="Allow same network-group traffic"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={vmDetail?.internet_access !== false}
                  disabled={vmActionState !== 'idle'}
                  onChange={(event) =>
                    void onUpdateVmPolicy({
                      internet_access: event.target.checked,
                    })
                  }
                />
              }
              label="Allow internet access"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={vmDetail?.allow_host_access !== false}
                  disabled={vmActionState !== 'idle'}
                  onChange={(event) =>
                    void onUpdateVmPolicy({
                      allow_host_access: event.target.checked,
                    })
                  }
                />
              }
              label="Allow hypervisor host access"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(vmDetail?.allow_private_lan_access)}
                  disabled={vmActionState !== 'idle' || (selectedVmOwner?.role || '') !== 'admin'}
                  onChange={(event) =>
                    void onUpdateVmPolicy({
                      allow_private_lan_access: event.target.checked,
                    })
                  }
                />
              }
              label="Allow private LAN access"
            />
          </Stack>
        </Paper>
        <JsonPanel
          title="Libvirt domain info"
          subtitle="Raw dominfo fields as returned by the Python bridge."
          value={formatJson(vmDetail?.dominfo || {})}
        />
        <JsonPanel
          title="Discovered network object"
          subtitle="The merged network payload returned for this VM."
          value={formatJson(vmDetail?.network || {})}
        />
      </Box>
    );
  }

  if (detailTab === 1) {
    return (
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
        }}
      >
        <JsonPanel
          title="API-stored config"
          subtitle={vmDetail?.storedConfigPath || 'No stored config path recorded.'}
          value={formatJson(vmDetail?.storedConfig || {})}
        />
        <JsonPanel
          title="Provisioner config snapshot"
          subtitle={vmDetail?.config_path || 'No provisioner config path recorded.'}
          value={formatJson(vmDetail?.config || {})}
        />
      </Box>
    );
  }

  if (detailTab === 2) {
    return (
      <Stack spacing={2}>
        <Paper sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', md: 'center' }}
              spacing={2}
            >
              <Box>
                <Typography variant="h6">Snapshots</Typography>
                <Typography variant="body2" color="text.secondary">
                  Snapshots capture the VM disk plus saved config-side assets so you can restore the
                  machine to a known host state.
                </Typography>
              </Box>
              <Tooltip
                title={
                  canCreateSnapshot
                    ? 'Capture a reusable VM snapshot.'
                    : 'Snapshots require a provisioned VM disk.'
                }
              >
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<BackupRoundedIcon />}
                    disabled={vmActionState !== 'idle' || !canCreateSnapshot}
                    onClick={() => void onCreateRestorePoint()}
                  >
                    {vmActionState === 'snapshot-create' ? 'Saving…' : 'Create Snapshot'}
                  </Button>
                </span>
              </Tooltip>
            </Stack>
            {!vmDetail?.exists ? (
              <Alert severity="info">
                Provision this VM before taking a snapshot. Any existing snapshots for this VM will
                still appear here.
              </Alert>
            ) : null}
            {snapshots.length === 0 ? (
              <Alert severity="info">No snapshots have been created for this VM yet.</Alert>
            ) : (
              <List sx={{ p: 0 }}>
                {snapshots.map((snapshot) => (
                  <ListItemButton
                    key={snapshot.snapshot_id}
                    disableRipple
                    sx={{
                      mb: 1,
                      borderRadius: 2,
                      border: (theme) => `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                      alignItems: 'stretch',
                    }}
                  >
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      justifyContent="space-between"
                      spacing={2}
                      sx={{ width: '100%' }}
                    >
                      <ListItemText
                        primary={snapshot.snapshot_id}
                        secondary={snapshot.created_at || 'Creation time unavailable'}
                      />
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<RestoreRoundedIcon />}
                          disabled={vmActionState !== 'idle'}
                          onClick={() => void handleRestoreSnapshot(snapshot.snapshot_id)}
                        >
                          Restore
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          startIcon={<DeleteOutlineRoundedIcon />}
                          disabled={vmActionState !== 'idle'}
                          onClick={() => void handleDeleteRestorePoint(snapshot.snapshot_id)}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </Stack>
                  </ListItemButton>
                ))}
              </List>
            )}
          </Stack>
        </Paper>
      </Stack>
    );
  }

  if (detailTab === 3) {
    return (
      <Stack spacing={2}>
        <Paper sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', md: 'center' }}
              spacing={2}
            >
              <Box>
                <Typography variant="h6">Log snapshot</Typography>
                <Typography variant="body2" color="text.secondary">
                  Pull the latest lines from `/var/log/libvirt/qemu/{selectedVmName}.log`.
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <TextField
                  size="small"
                  label="Lines"
                  value={snapshotLines}
                  onChange={(event) => onSnapshotLinesChange(event.target.value)}
                  sx={{ minWidth: 120 }}
                />
                <Button
                  variant="outlined"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={() => void onLoadSnapshot()}
                >
                  Reload snapshot
                </Button>
              </Stack>
            </Stack>
            <Box
              component="pre"
              sx={{
                minHeight: 220,
                maxHeight: 360,
                overflow: 'auto',
                borderRadius: 2,
                p: 2,
                backgroundColor: (theme) => alpha(theme.palette.common.black, 0.28),
              }}
            >
              {snapshotLoading ? 'Loading snapshot…' : snapshotLog || 'No log output loaded yet.'}
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', md: 'center' }}
              spacing={2}
            >
              <Box>
                <Typography variant="h6">Live stream</Typography>
                <Typography variant="body2" color="text.secondary">
                  Stream log chunks continuously over Server-Sent Events while the connection stays
                  open.
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems="center">
                <TextField
                  size="small"
                  label="Initial lines"
                  value={streamLines}
                  onChange={(event) => setStreamLines(event.target.value)}
                  sx={{ minWidth: 140 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={streamEnabled}
                      onChange={(event) => setStreamEnabled(event.target.checked)}
                    />
                  }
                  label={streamEnabled ? 'Streaming' : 'Stopped'}
                />
                <Chip
                  label={streamConnected ? 'Connected' : 'Disconnected'}
                  color={streamConnected ? 'success' : 'default'}
                />
              </Stack>
            </Stack>
            {streamError ? <Alert severity="warning">{streamError}</Alert> : null}
            <Box
              component="pre"
              sx={{
                minHeight: 220,
                maxHeight: 420,
                overflow: 'auto',
                borderRadius: 2,
                p: 2,
                backgroundColor: (theme) => alpha(theme.palette.common.black, 0.28),
              }}
            >
              {streamLog || 'Enable streaming to follow new log output in real time.'}
            </Box>
          </Stack>
        </Paper>
      </Stack>
    );
  }

  if (detailTab === 4) {
    return <VMStateDetail apiBase={apiBase} vmName={selectedVmName} />;
  }

  return null;
}
