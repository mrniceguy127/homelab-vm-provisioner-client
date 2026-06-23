import { Button, DialogActions, Tooltip } from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';

/**
 * VM Form Actions for dialog buttons.
 *
 * @param {object} props - Component props.
 * @param {string} props.formMode - Form mode (create/edit/clone).
 * @param {string} props.submitState - Submit state (idle/config/create/clone).
 * @param {object|null} props.draftPayload - Draft payload or null if invalid.
 * @param {Function} props.onCancel - Cancel handler.
 * @param {Function} props.onSubmit - Submit handler with mode parameter.
 * @returns {import('react').JSX.Element} VM Form Actions.
 */
export default function VmFormActions({
  formMode,
  submitState,
  draftPayload,
  onCancel,
  onSubmit,
}) {
  return (
    <DialogActions sx={{ px: 3, py: 2 }}>
      <Button onClick={onCancel}>Cancel</Button>
      {formMode === 'clone' ? (
        <Tooltip title="Save the cloned config and create a full VM clone from the source disk.">
          <span>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<ContentCopyRoundedIcon />}
              disabled={submitState !== 'idle' || !draftPayload}
              onClick={() => onSubmit('clone')}
            >
              {submitState === 'clone' ? 'Cloning…' : 'Create Full Clone'}
            </Button>
          </span>
        </Tooltip>
      ) : (
        <>
          <Tooltip title="Persist the config without provisioning a VM.">
            <span>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<SaveRoundedIcon />}
                disabled={submitState !== 'idle' || !draftPayload}
                onClick={() => onSubmit('config')}
              >
                {submitState === 'config' ? 'Saving…' : 'Save config'}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Save the config and call the provisioner immediately.">
            <span>
              <Button
                variant="contained"
                startIcon={<RocketLaunchRoundedIcon />}
                disabled={submitState !== 'idle' || !draftPayload}
                onClick={() => onSubmit('create')}
              >
                {submitState === 'create' ? 'Provisioning…' : 'Create VM'}
              </Button>
            </span>
          </Tooltip>
        </>
      )}
    </DialogActions>
  );
}
