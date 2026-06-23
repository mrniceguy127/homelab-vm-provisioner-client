import { Alert, Box, Button, List, ListItemButton, ListItemText, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import BackupRoundedIcon from '@mui/icons-material/BackupRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';

/**
 * VM Snapshots Tab showing snapshot list and actions.
 *
 * @param {object} props - Component props.
 * @param {Array} props.snapshots - Snapshot list.
 * @param {boolean} props.vmExists - Whether VM exists.
 * @param {boolean} props.canCreateSnapshot - Whether snapshot can be created.
 * @param {string} props.vmActionState - Current action state.
 * @param {Function} props.onCreateSnapshot - Create snapshot handler.
 * @param {Function} props.onRestoreSnapshot - Restore snapshot handler.
 * @param {Function} props.onDeleteSnapshot - Delete snapshot handler.
 * @returns {import('react').JSX.Element} VM Snapshots Tab.
 */
export default function VmSnapshotsTab({
  snapshots,
  vmExists,
  canCreateSnapshot,
  vmActionState,
  onCreateSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
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
                  onClick={onCreateSnapshot}
                >
                  {vmActionState === 'snapshot-create' ? 'Saving…' : 'Create Snapshot'}
                </Button>
              </span>
            </Tooltip>
          </Stack>
          {!vmExists ? (
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
                        onClick={() => onRestoreSnapshot(snapshot.snapshot_id)}
                      >
                        Restore
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        startIcon={<DeleteOutlineRoundedIcon />}
                        disabled={vmActionState !== 'idle'}
                        onClick={() => onDeleteSnapshot(snapshot.snapshot_id)}
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
