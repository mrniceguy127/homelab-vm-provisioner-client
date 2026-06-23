import { Button, Stack, Tooltip } from '@mui/material';
import BackupRoundedIcon from '@mui/icons-material/BackupRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';

/**
 * VM Action Buttons for clone, snapshot, provision, destroy, etc.
 *
 * @param {object} props - Component props.
 * @param {boolean} props.hasClonableConfig - Whether VM has cloneable config.
 * @param {boolean} props.canClone - Whether VM can be cloned.
 * @param {boolean} props.canCreateSnapshot - Whether snapshot can be created.
 * @param {boolean} props.canProvisionStoredConfig - Whether stored config can be provisioned.
 * @param {boolean} props.vmExists - Whether VM exists.
 * @param {boolean} props.hasJobProgress - Whether VM has job progress to view.
 * @param {string} props.actionState - Current action state.
 * @param {Function} props.onClone - Clone handler.
 * @param {Function} props.onCreateSnapshot - Create snapshot handler.
 * @param {Function} props.onProvisionStoredConfig - Provision stored config handler.
 * @param {Function} props.onRefresh - Refresh handler.
 * @param {Function} props.onViewJobProgress - View job progress handler.
 * @param {Function} props.onDestroy - Destroy handler.
 * @returns {import('react').JSX.Element} VM Action Buttons.
 */
export default function VmActionButtons({
  hasClonableConfig,
  canClone,
  canCreateSnapshot,
  canProvisionStoredConfig,
  vmExists,
  hasJobProgress,
  actionState,
  onClone,
  onCreateSnapshot,
  onProvisionStoredConfig,
  onRefresh,
  onViewJobProgress,
  onDestroy,
}) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {hasClonableConfig ? (
        <Tooltip
          title={
            canClone
              ? 'Create a full VM clone from the source disk.'
              : 'Full VM clones require a live source VM disk.'
          }
        >
          <span>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<ContentCopyRoundedIcon />}
              disabled={actionState !== 'idle' || !canClone}
              onClick={onClone}
            >
              Full Clone
            </Button>
          </span>
        </Tooltip>
      ) : null}
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
            disabled={actionState !== 'idle' || !canCreateSnapshot}
            onClick={onCreateSnapshot}
          >
            {actionState === 'snapshot-create' ? 'Saving…' : 'Create Snapshot'}
          </Button>
        </span>
      </Tooltip>
      {canProvisionStoredConfig ? (
        <Button
          variant="contained"
          color="secondary"
          startIcon={<RocketLaunchRoundedIcon />}
          disabled={actionState !== 'idle'}
          onClick={onProvisionStoredConfig}
        >
          {actionState === 'provision' ? 'Provisioning…' : 'Provision from template'}
        </Button>
      ) : null}
      <Button
        variant="outlined"
        startIcon={<RefreshRoundedIcon />}
        disabled={actionState !== 'idle'}
        onClick={onRefresh}
      >
        Refresh
      </Button>
      {hasJobProgress ? (
        <Button
          variant="outlined"
          color="info"
          startIcon={<TimelineRoundedIcon />}
          onClick={onViewJobProgress}
        >
          View Progress
        </Button>
      ) : null}
      <Button
        variant="outlined"
        color="error"
        startIcon={<DeleteOutlineRoundedIcon />}
        disabled={actionState !== 'idle' || !vmExists}
        onClick={onDestroy}
      >
        {actionState === 'destroy' ? 'Destroying…' : 'Destroy VM'}
      </Button>
    </Stack>
  );
}
