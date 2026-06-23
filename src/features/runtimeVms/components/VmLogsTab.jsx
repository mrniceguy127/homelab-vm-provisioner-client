import { Alert, Box, Button, Chip, FormControlLabel, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

/**
 * VM Logs Tab showing log snapshot and live stream.
 *
 * @param {object} props - Component props.
 * @param {string} props.snapshotLines - Snapshot line count.
 * @param {string} props.snapshotLog - Snapshot log content.
 * @param {boolean} props.snapshotLoading - Whether snapshot is loading.
 * @param {string} props.streamLines - Stream line count.
 * @param {boolean} props.streamEnabled - Whether stream is enabled.
 * @param {boolean} props.streamConnected - Whether stream is connected.
 * @param {string} props.streamLog - Stream log content.
 * @param {string} props.streamError - Stream error message.
 * @param {string} props.selectedVmName - Selected VM name.
 * @param {Function} props.onSnapshotLinesChange - Snapshot lines change handler.
 * @param {Function} props.onLoadSnapshot - Load snapshot handler.
 * @param {Function} props.onStreamLinesChange - Stream lines change handler.
 * @param {Function} props.onStreamEnabledChange - Stream enabled change handler.
 * @returns {import('react').JSX.Element} VM Logs Tab.
 */
export default function VmLogsTab({
  snapshotLines,
  snapshotLog,
  snapshotLoading,
  streamLines,
  streamEnabled,
  streamConnected,
  streamLog,
  streamError,
  selectedVmName,
  onSnapshotLinesChange,
  onLoadSnapshot,
  onStreamLinesChange,
  onStreamEnabledChange,
}) {
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
              <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={onLoadSnapshot}>
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
                onChange={(event) => onStreamLinesChange(event.target.value)}
                sx={{ minWidth: 140 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={streamEnabled}
                    onChange={(event) => onStreamEnabledChange(event.target.checked)}
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
