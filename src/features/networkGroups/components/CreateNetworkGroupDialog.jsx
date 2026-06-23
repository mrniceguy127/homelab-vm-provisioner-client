import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import {
  createNetworkGroup,
  suggestNetworkGroupCidr,
  validateNetworkGroupCidr,
} from '../../../api.js';

/**
 * Dialog for creating a new network group.
 *
 * @param {object} props - Component props.
 * @param {boolean} props.open - Whether dialog is open.
 * @param {Function} props.onClose - Close handler.
 * @param {Array} props.users - Available users.
 * @param {string} props.apiBase - API base URL.
 * @param {Function} props.onSuccess - Success callback.
 * @param {Function} props.showMessage - Show snackbar message.
 * @returns {import('react').JSX.Element} Create Network Group Dialog.
 */
export default function CreateNetworkGroupDialog({
  open,
  onClose,
  users,
  apiBase,
  onSuccess,
  showMessage,
}) {
  const [formState, setFormState] = useState({
    name: '',
    ownerUserId: '',
    profile: 'isolated_nat',
    subnetCidr: '',
  });
  const [submitState, setSubmitState] = useState('idle');
  const [subnetValidation, setSubnetValidation] = useState({ valid: null, error: '' });
  const [subnetValidating, setSubnetValidating] = useState(false);

  // Initialize owner when dialog opens
  useEffect(() => {
    if (open && users.length > 0 && !formState.ownerUserId) {
      setFormState((current) => ({
        ...current,
        ownerUserId: users[0].id,
      }));
    }
  }, [open, users, formState.ownerUserId]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormState({
        name: '',
        ownerUserId: users[0]?.id || '',
        profile: 'isolated_nat',
        subnetCidr: '',
      });
      setSubnetValidation({ valid: null, error: '' });
      setSubmitState('idle');
    }
  }, [open, users]);

  // Debounced CIDR validation
  useEffect(() => {
    if (!formState.subnetCidr.trim()) {
      setSubnetValidation((prev) => (prev.valid === null ? prev : { valid: null, error: '' }));
      setSubnetValidating((prev) => (prev ? false : prev));
      return undefined;
    }

    const timeoutId = setTimeout(async () => {
      setSubnetValidating(true);
      try {
        const result = await validateNetworkGroupCidr(apiBase, formState.subnetCidr.trim());
        setSubnetValidation({
          valid: result.valid,
          error: result.error || '',
        });
      } catch (error) {
        setSubnetValidation({
          valid: false,
          error: error.message || 'Validation failed',
        });
      } finally {
        setSubnetValidating(false);
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [apiBase, formState.subnetCidr]);

  async function handleSuggestSubnet() {
    try {
      const result = await suggestNetworkGroupCidr(apiBase);
      setFormState((current) => ({
        ...current,
        subnetCidr: result.cidr,
      }));
      showMessage(`Suggested CIDR: ${result.cidr}`, 'success');
    } catch (error) {
      showMessage(`Failed to suggest CIDR: ${error.message}`, 'error');
    }
  }

  async function handleSubmit() {
    setSubmitState('submitting');
    try {
      const payload = {
        ownerUserId: formState.ownerUserId,
        name: formState.name.trim(),
        profile: formState.profile,
      };

      if (formState.subnetCidr.trim()) {
        payload.subnetCidr = formState.subnetCidr.trim();
      }

      await createNetworkGroup(apiBase, payload);
      showMessage(`Network group "${formState.name}" created successfully`, 'success');
      onSuccess();
    } catch (error) {
      showMessage(error.message, 'error');
      setSubmitState('idle');
    }
  }

  function handleClose() {
    if (submitState === 'idle') {
      onClose();
    }
  }

  const canSubmit =
    submitState === 'idle' &&
    formState.name.trim() &&
    formState.ownerUserId &&
    formState.profile &&
    (formState.profile === 'bridged' || !formState.subnetCidr.trim() || subnetValidation.valid === true);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Network Group</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Alert severity="info">
            Network groups own CIDR ranges and provide network isolation for VMs. Create a network
            group before creating VMs.
          </Alert>

          <TextField
            label="Network Group Name"
            value={formState.name}
            onChange={(event) =>
              setFormState((current) => ({ ...current, name: event.target.value }))
            }
            autoFocus
            required
            helperText="Descriptive name for this network group"
          />

          <TextField
            select
            label="Owner"
            value={formState.ownerUserId}
            onChange={(event) =>
              setFormState((current) => ({ ...current, ownerUserId: event.target.value }))
            }
            required
          >
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.username} ({user.role})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Profile"
            value={formState.profile}
            onChange={(event) =>
              setFormState((current) => ({ ...current, profile: event.target.value }))
            }
            required
            helperText="`isolated_nat` is recommended for tenant isolation"
          >
            <MenuItem value="private">private</MenuItem>
            <MenuItem value="nat">nat</MenuItem>
            <MenuItem value="isolated_nat">isolated_nat (recommended)</MenuItem>
            <MenuItem value="bridged">bridged</MenuItem>
          </TextField>

          {formState.profile !== 'bridged' && (
            <Box>
              <TextField
                label="Subnet CIDR (optional)"
                value={formState.subnetCidr}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, subnetCidr: event.target.value }))
                }
                placeholder="e.g., 10.80.1.0/29"
                error={subnetValidation.valid === false}
                helperText={
                  subnetValidating
                    ? 'Validating...'
                    : subnetValidation.valid === false
                      ? subnetValidation.error
                      : subnetValidation.valid === true
                        ? '✓ Valid subnet'
                        : 'Leave blank to auto-allocate. Max 8 IPs (/29 or smaller), must be within global pool (10.80.0.0/16), and not overlap existing groups.'
                }
                color={subnetValidation.valid === true ? 'success' : undefined}
                fullWidth
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleSuggestSubnet}
                sx={{ mt: 1 }}
                disabled={submitState !== 'idle'}
              >
                Generate Recommended CIDR
              </Button>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitState !== 'idle'}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
