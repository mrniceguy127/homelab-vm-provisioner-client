import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
} from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';

import {
  createVm,
  saveVmConfig,
  cloneVm,
  updateVmConfig,
  createNetworkGroup,
  suggestNetworkGroupCidr,
  validateNetworkGroupCidr,
} from '../../api.js';
import { buildVmPayload, buildFormStateFromConfig, buildCloneFormState } from '../../utils/configUtils.js';
import { createDefaultFormState, normalizeVmName, MAX_VM_NAME_LENGTH } from '../../utils/formUtils.js';
import JsonPanel from '../../components/common/JsonPanel.jsx';
import { formatJson } from '../../utils/displayUtils.js';

/**
 * VM Form Dialog for create/edit/clone operations.
 *
 * @param {object} props - Component props.
 * @param {boolean} props.open - Whether dialog is open.
 * @param {Function} props.onClose - Close handler.
 * @param {object} props.formRequest - Form request with mode, config, etc.
 * @param {Array} props.users - Available users.
 * @param {Array} props.networkGroups - Available network groups.
 * @param {Set} props.deployedVmNames - Set of deployed VM names.
 * @param {object} props.resourceLimits - Resource limits.
 * @param {string} props.apiBase - API base URL.
 * @param {Function} props.onSuccess - Success callback.
 * @param {Function} props.showMessage - Show snackbar message.
 * @param {Function} props.setVmJobs - Update vmJobs state.
 * @returns {import('react').JSX.Element} VM Form Dialog.
 */
export default function VmFormDialog({
  open,
  onClose,
  formRequest,
  users,
  networkGroups,
  deployedVmNames,
  resourceLimits,
  apiBase,
  onSuccess,
  showMessage,
  setVmJobs,
}) {
  const [formState, setFormState] = useState(createDefaultFormState());
  const [submitState, setSubmitState] = useState('idle');
  const [subnetValidation, setSubnetValidation] = useState({ valid: null, error: '' });
  const [subnetValidating, setSubnetValidating] = useState(false);

  const formMode = formRequest?.mode || 'create';
  const cloneSourceVmName = formRequest?.sourceVmName || '';

  const normalizedDraftVmName = normalizeVmName(formState.name);
  const normalizedOriginalName = formMode === 'edit' ? normalizeVmName(cloneSourceVmName) : null;

  const ownerScopedNetworkGroups = networkGroups.filter(
    (group) => !formState.ownerUserId || group.owner_user_id === formState.ownerUserId
  );

  let draftPayload = null;
  let draftPayloadError = null;
  try {
    draftPayload = buildVmPayload(formState, resourceLimits);
  } catch (error) {
    draftPayloadError = error.message;
  }

  // Check uniqueness only against deployed VMs, excluding the original name in edit mode
  if (
    !draftPayloadError &&
    normalizedDraftVmName &&
    deployedVmNames.has(normalizedDraftVmName) &&
    normalizedDraftVmName !== normalizedOriginalName
  ) {
    draftPayload = null;
    draftPayloadError = 'VM name must be unique among deployed VMs. Choose a different name.';
  }

  /**
   * Auto-suggest an available subnet CIDR.
   */
  async function handleSuggestSubnet() {
    try {
      const result = await suggestNetworkGroupCidr(apiBase);
      setFormState((current) => ({
        ...current,
        newNetworkGroupSubnet: result.cidr,
      }));
      showMessage(`Suggested CIDR: ${result.cidr}`, 'success');
    } catch (error) {
      showMessage(`Failed to suggest CIDR: ${error.message}`, 'error');
    }
  }

  /**
   * Submit the form.
   *
   * @param {'config'|'create'|'clone'} mode - Submission mode.
   */
  async function handleFormSubmit(mode) {
    setSubmitState(mode);
    try {
      let effectiveFormState = formState;
      if (formState.networkGroupId === '__new__') {
        const nextNetworkGroupName = formState.newNetworkGroupName.trim();
        if (!formState.ownerUserId || !nextNetworkGroupName) {
          throw new Error('Select an owner and provide a new network group name first.');
        }

        const payload = {
          ownerUserId: formState.ownerUserId,
          name: nextNetworkGroupName,
          profile: formState.newNetworkGroupProfile,
        };

        if (formState.newNetworkGroupSubnet.trim()) {
          payload.subnetCidr = formState.newNetworkGroupSubnet.trim();
        }

        const createdGroup = await createNetworkGroup(apiBase, payload);
        const nextNetworkGroup = createdGroup.networkGroup;
        effectiveFormState = {
          ...formState,
          networkGroupId: nextNetworkGroup.id,
        };
      }

      const preparedPayload = buildVmPayload(effectiveFormState);

      let response;
      if (formMode === 'clone') {
        response = await cloneVm(apiBase, cloneSourceVmName, preparedPayload);
      } else if (formMode === 'edit') {
        response = await updateVmConfig(apiBase, cloneSourceVmName, preparedPayload);
      } else {
        response = mode === 'create' ? await createVm(apiBase, preparedPayload) : await saveVmConfig(apiBase, preparedPayload);
      }

      const nextVmName = response.vmName || preparedPayload.config.vm.name;

      if (response.job_id) {
        setVmJobs((prev) => ({
          ...prev,
          [nextVmName]: {
            job_id: response.job_id,
            status: response.status || 'queued',
            type: formMode === 'clone' ? 'clone_vm' : 'provision_vm',
            timestamp: new Date().toISOString(),
          },
        }));
      }

      showMessage(
        formMode === 'clone'
          ? `Cloned ${cloneSourceVmName} to ${nextVmName}.`
          : mode === 'create'
            ? `Provisioned ${nextVmName}.`
            : `Saved template for ${nextVmName}.`,
        'success'
      );

      onSuccess(nextVmName);
      handleClose();
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setSubmitState('idle');
    }
  }

  function handleClose() {
    if (submitState === 'idle') {
      onClose();
    }
  }

  // Initialize form state from request
  useEffect(() => {
    if (!open) return;

    function createMetadataAwareFormState() {
      const nextOwnerUserId = users[0]?.id || '';
      const nextNetworkGroupId =
        networkGroups.find((group) => group.owner_user_id === nextOwnerUserId)?.id || '';
      return {
        ...createDefaultFormState(),
        ownerUserId: nextOwnerUserId,
        networkGroupId: nextNetworkGroupId,
      };
    }

    let nextState;
    if (formMode === 'edit' && formRequest?.config) {
      const config = formRequest.config;
      nextState = buildFormStateFromConfig(config);
    } else if (formMode === 'clone' && formRequest?.config) {
      const config = formRequest.config;
      const metadataState = createMetadataAwareFormState();
      nextState = {
        ...metadataState,
        ...buildCloneFormState(config, formRequest.suggestedName || ''),
        ownerUserId: config?.vm?.owner_user_id || metadataState.ownerUserId || users[0]?.id || '',
        networkGroupId: config?.vm?.network_group_id || '',
      };
    } else {
      nextState = createMetadataAwareFormState();
    }
    setFormState(nextState);
  }, [open, formMode, formRequest, users, networkGroups]);

  // Auto-adjust owner/network group
  useEffect(() => {
    if (!open) return;

    let needsUpdate = false;
    let updates = {};

    if (!formState.ownerUserId && users.length > 0) {
      const nextOwnerUserId = users[0].id;
      const nextNetworkGroupId =
        networkGroups.find((group) => group.owner_user_id === nextOwnerUserId)?.id || '';
      needsUpdate = true;
      updates = {
        ownerUserId: nextOwnerUserId,
        networkGroupId: formState.networkGroupId || nextNetworkGroupId,
      };
    } else if (
      formState.ownerUserId &&
      formState.networkGroupId !== '__new__' &&
      !ownerScopedNetworkGroups.some((group) => group.id === formState.networkGroupId)
    ) {
      needsUpdate = true;
      updates = {
        networkGroupId: ownerScopedNetworkGroups[0]?.id || '',
      };
    }

    if (needsUpdate) {
      setFormState((current) => ({ ...current, ...updates }));
    }
  }, [open, formState.ownerUserId, formState.networkGroupId, users, networkGroups, ownerScopedNetworkGroups]);

  // Debounced CIDR validation
  useEffect(() => {
    if (!formState.newNetworkGroupSubnet.trim() || formState.networkGroupId !== '__new__') {
      // Reset validation state when subnet is empty or not creating new group
      setSubnetValidation((prev) => prev.valid === null ? prev : { valid: null, error: '' });
      setSubnetValidating((prev) => prev ? false : prev);
      return undefined;
    }

    const timeoutId = setTimeout(async () => {
      setSubnetValidating(true);
      try {
        const result = await validateNetworkGroupCidr(apiBase, formState.newNetworkGroupSubnet.trim());
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
  }, [apiBase, formState.newNetworkGroupSubnet, formState.networkGroupId]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <DialogTitle>
        {formMode === 'clone'
          ? 'Create a Full VM Clone'
          : formMode === 'edit'
            ? 'Edit VM Template'
            : 'Create VM or Save Template'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {formMode === 'clone' ? (
            <>
              <Alert severity="info">
                This creates a full VM clone from <strong>{cloneSourceVmName}</strong>. A unique target
                name is prefilled, and the forwarded-port plus tenant SSH key inputs were cleared so the
                clone does not silently reuse the source runtime identity.
              </Alert>
              <Alert severity="warning">
                Review the target name, networking, host port forwards, and tenant access settings before
                submitting the clone.
              </Alert>
              <TextField label="Source VM" value={cloneSourceVmName} InputProps={{ readOnly: true }} />
            </>
          ) : null}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            }}
          >
            <TextField
              select
              label="Owner"
              value={formState.ownerUserId}
              onChange={(event) => {
                const nextOwnerUserId = event.target.value;
                const nextNetworkGroupId =
                  networkGroups.find((group) => group.owner_user_id === nextOwnerUserId)?.id || '';
                setFormState((current) => ({
                  ...current,
                  ownerUserId: nextOwnerUserId,
                  networkGroupId: nextNetworkGroupId,
                  newNetworkGroupName: '',
                  newNetworkGroupSubnet: '',
                }));
              }}
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.username} ({user.role})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Network group"
              value={formState.networkGroupId}
              onChange={(event) =>
                setFormState((current) => ({ ...current, networkGroupId: event.target.value }))
              }
              helperText="One libvirt network is shared by all VMs in the same group."
            >
              {ownerScopedNetworkGroups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name} ({group.profile})
                </MenuItem>
              ))}
              <MenuItem value="__new__">Create a new network group</MenuItem>
            </TextField>
            {formState.networkGroupId === '__new__' ? (
              <TextField
                label="New network group name"
                value={formState.newNetworkGroupName}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    newNetworkGroupName: event.target.value,
                  }))
                }
              />
            ) : (
              <TextField
                label="Assigned group subnet"
                value={
                  ownerScopedNetworkGroups.find((group) => group.id === formState.networkGroupId)
                    ?.subnet_cidr || 'Assigned by API'
                }
                InputProps={{ readOnly: true }}
              />
            )}
            {formState.networkGroupId === '__new__' ? (
              <>
                <TextField
                  select
                  label="New group profile"
                  value={formState.newNetworkGroupProfile}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      newNetworkGroupProfile: event.target.value,
                    }))
                  }
                  helperText="`isolated_nat` is the recommended default for tenant isolation."
                >
                  <MenuItem value="private">private</MenuItem>
                  <MenuItem value="nat">nat</MenuItem>
                  <MenuItem value="isolated_nat">isolated_nat</MenuItem>
                  <MenuItem value="bridged">bridged</MenuItem>
                </TextField>
                {formState.newNetworkGroupProfile !== 'bridged' ? (
                  <Box>
                    <TextField
                      label="Subnet CIDR (optional)"
                      value={formState.newNetworkGroupSubnet}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          newNetworkGroupSubnet: event.target.value,
                        }))
                      }
                      placeholder="e.g., 192.168.100.0/29"
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
                    <Button variant="outlined" size="small" onClick={() => void handleSuggestSubnet()} sx={{ mt: 1 }}>
                      Auto-Select Available Subnet
                    </Button>
                  </Box>
                ) : null}
              </>
            ) : null}
            <TextField
              autoFocus={formMode === 'clone'}
              label={formMode === 'clone' ? 'Target VM name' : 'VM name'}
              value={formState.name}
              onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              inputProps={{ maxLength: MAX_VM_NAME_LENGTH }}
              error={Boolean(
                normalizedDraftVmName &&
                  deployedVmNames.has(normalizedDraftVmName) &&
                  normalizedDraftVmName !== normalizedOriginalName
              )}
              helperText={
                normalizedDraftVmName &&
                deployedVmNames.has(normalizedDraftVmName) &&
                normalizedDraftVmName !== normalizedOriginalName
                  ? 'VM name must be unique among deployed VMs.'
                  : formMode === 'clone'
                    ? `Choose a unique name for the cloned VM. ${MAX_VM_NAME_LENGTH} characters max.`
                    : `${MAX_VM_NAME_LENGTH} characters max.`
              }
            />
            <TextField
              label="Tenant user"
              value={formState.user}
              onChange={(event) => setFormState((current) => ({ ...current, user: event.target.value }))}
            />
            <TextField
              select
              label="Trust"
              value={formState.trust}
              onChange={(event) => setFormState((current) => ({ ...current, trust: event.target.value }))}
            >
              <MenuItem value="untrusted">untrusted</MenuItem>
              <MenuItem value="trusted">trusted</MenuItem>
            </TextField>
            <TextField
              type="number"
              label="RAM (MB)"
              value={formState.ramMb}
              onChange={(event) => setFormState((current) => ({ ...current, ramMb: event.target.value }))}
            />
            <TextField
              type="number"
              label="vCPUs"
              value={formState.vcpus}
              onChange={(event) => setFormState((current) => ({ ...current, vcpus: event.target.value }))}
            />
            <TextField
              type="number"
              label="Disk (GB)"
              value={formState.diskGb}
              onChange={(event) => setFormState((current) => ({ ...current, diskGb: event.target.value }))}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={formState.allowSudo}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, allowSudo: event.target.checked }))
                  }
                />
              }
              label="Grant passwordless sudo to the tenant user"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formState.allowSameGroupTraffic}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, allowSameGroupTraffic: event.target.checked }))
                  }
                />
              }
              label="Allow same-group VM traffic"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formState.internetAccess}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, internetAccess: event.target.checked }))
                  }
                />
              }
              label="Allow internet access"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formState.allowHostAccess}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, allowHostAccess: event.target.checked }))
                  }
                />
              }
              label="Allow host access"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formState.allowPrivateLanAccess}
                  disabled={(users.find((user) => user.id === formState.ownerUserId)?.role || '') !== 'admin'}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      allowPrivateLanAccess: event.target.checked,
                    }))
                  }
                />
              }
              label="Allow private LAN access (admin only)"
            />
          </Box>

          <Divider />

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
            }}
          >
            <TextField
              multiline
              minRows={3}
              label="Packages"
              value={formState.packagesText}
              onChange={(event) =>
                setFormState((current) => ({ ...current, packagesText: event.target.value }))
              }
              helperText="Comma-separated, for example: git, tmux, htop"
            />
            <TextField
              multiline
              minRows={3}
              label="DNS resolvers"
              value={formState.dnsResolversText}
              onChange={(event) =>
                setFormState((current) => ({ ...current, dnsResolversText: event.target.value }))
              }
              helperText="Comma-separated IP addresses. Leave blank to use provisioner defaults."
            />
            <TextField
              multiline
              minRows={4}
              label="Forwarded ports"
              value={formState.portsText}
              onChange={(event) => setFormState((current) => ({ ...current, portsText: event.target.value }))}
              helperText={
                formMode === 'clone'
                  ? 'One per line. Review host ports before cloning to avoid collisions. Example: 2222:22/tcp'
                  : 'One per line. Example: 2222:22/tcp'
              }
            />
            <TextField
              multiline
              minRows={6}
              label="Tenant SSH public key"
              value={formState.sshPublicKey}
              onChange={(event) =>
                setFormState((current) => ({ ...current, sshPublicKey: event.target.value }))
              }
              helperText={
                formMode === 'clone'
                  ? 'Optional. Provide a new tenant SSH key for the clone. When provided, the API stores the key under the provisioner user-keys directory and rewrites vm.ssh_key_file automatically.'
                  : 'When provided, the API stores the key under the provisioner user-keys directory and rewrites vm.ssh_key_file automatically.'
              }
            />
            <TextField
              multiline
              minRows={2}
              label="Existing absolute SSH key path"
              value={formState.sshKeyFile}
              onChange={(event) => setFormState((current) => ({ ...current, sshKeyFile: event.target.value }))}
              helperText={
                formMode === 'clone'
                  ? 'Optional. Point the clone at a different tenant key path when you are not submitting sshPublicKey.'
                  : 'Use this only when you are not submitting sshPublicKey.'
              }
            />
            <TextField
              multiline
              minRows={6}
              label="Post-cloud-init setup script"
              value={formState.setupScript}
              onChange={(event) =>
                setFormState((current) => ({ ...current, setupScript: event.target.value }))
              }
              helperText={
                formMode === 'clone'
                  ? 'Optional. Review whether the source setup script still applies to the clone.'
                  : 'Optional shell script content to run after the built-in cloud-init commands finish.'
              }
            />
            <TextField
              multiline
              minRows={2}
              label="Existing absolute setup script path"
              value={formState.setupScriptFile}
              onChange={(event) =>
                setFormState((current) => ({ ...current, setupScriptFile: event.target.value }))
              }
              helperText={
                formMode === 'clone'
                  ? 'Optional. Review whether the source setup script path should be reused for the clone.'
                  : 'Use this only when you are not submitting setupScript content.'
              }
            />
          </Box>

          {draftPayloadError ? <Alert severity="warning">{draftPayloadError}</Alert> : null}

          <JsonPanel
            title="Request preview"
            subtitle="This is the JSON payload that will be sent to the API."
            value={draftPayload ? formatJson(draftPayload) : draftPayloadError || '{}'}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        {formMode === 'clone' ? (
          <Tooltip title="Save the cloned config and create a full VM clone from the source disk.">
            <span>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<ContentCopyRoundedIcon />}
                disabled={submitState !== 'idle' || !draftPayload}
                onClick={() => void handleFormSubmit('clone')}
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
                  onClick={() => void handleFormSubmit('config')}
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
                  onClick={() => void handleFormSubmit('create')}
                >
                  {submitState === 'create' ? 'Provisioning…' : 'Create VM'}
                </Button>
              </span>
            </Tooltip>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
