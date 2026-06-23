import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
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
import NetworkGroupFormSection from './components/NetworkGroupFormSection.jsx';
import BasicVmFormSection from './components/BasicVmFormSection.jsx';
import VmPolicyToggles from './components/VmPolicyToggles.jsx';
import AdvancedVmFormSection from './components/AdvancedVmFormSection.jsx';
import VmFormActions from './components/VmFormActions.jsx';

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
 * @param {Function} props.onTrackJob - Track job handler.
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
  onTrackJob,
}) {
  const [formState, setFormState] = useState(createDefaultFormState());
  const [submitState, setSubmitState] = useState('idle');
  const [subnetValidation, setSubnetValidation] = useState({ valid: null, error: '' });
  const [subnetValidating, setSubnetValidating] = useState(false);

  const formMode = formRequest?.mode || 'create';
  const cloneSourceVmName = formRequest?.sourceVmName || '';
  
  // Extract original VM name for edit mode from config
  const originalVmName = formMode === 'edit' && formRequest?.config
    ? formRequest.config.vm_name || formRequest.config.config?.vm?.name || ''
    : cloneSourceVmName;

  const normalizedDraftVmName = normalizeVmName(formState.name);
  const normalizedOriginalName = (formMode === 'edit' || formMode === 'clone') ? normalizeVmName(originalVmName) : null;

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
      let operationType = 'create'; // Track what operation we're actually doing
      
      // Only call cloneVm if we have a source VM (from runtime VMs tab)
      // Template "cloning" is just creating a new config with pre-filled data
      if (formMode === 'clone' && cloneSourceVmName) {
        response = await cloneVm(apiBase, cloneSourceVmName, preparedPayload);
        operationType = 'clone';
      } else if (formMode === 'edit') {
        response = await updateVmConfig(apiBase, originalVmName, preparedPayload);
        operationType = 'edit';
      } else {
        // For template duplication (clone mode without sourceVmName) or regular create
        response = mode === 'create' ? await createVm(apiBase, preparedPayload) : await saveVmConfig(apiBase, preparedPayload);
        operationType = mode === 'create' ? 'create' : 'save';
      }

      const nextVmName = response.vmName || preparedPayload.config.vm.name;

      if (response.job_id) {
        onTrackJob(nextVmName, {
          job_id: response.job_id,
          status: response.status || 'queued',
          type: operationType === 'clone' ? 'clone_vm' : 'provision_vm',
        });
      }

      showMessage(
        operationType === 'clone'
          ? `Cloned ${cloneSourceVmName} to ${nextVmName}.`
          : operationType === 'edit'
            ? `Updated template for ${nextVmName}.`
            : operationType === 'create'
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

  // Determine if this is a real VM clone or just a template duplicate
  const isVmClone = formMode === 'clone' && cloneSourceVmName;
  const isTemplateDuplicate = formMode === 'clone' && !cloneSourceVmName;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <DialogTitle>
        {isVmClone
          ? 'Create a Full VM Clone'
          : isTemplateDuplicate
            ? 'Duplicate Template'
            : formMode === 'edit'
              ? 'Edit VM Template'
              : 'Create VM or Save Template'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {isVmClone ? (
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
          {isTemplateDuplicate ? (
            <Alert severity="info">
              Duplicating template <strong>{originalVmName}</strong>. This creates a new template with the same settings.
              A unique name is prefilled. You can provision or save this as a new template.
            </Alert>
          ) : null}
          {ownerScopedNetworkGroups.length === 0 && formState.networkGroupId !== '__new__' ? (
            <Alert severity="warning">
              No network groups available for the selected owner. Create a network group below to continue, or switch to the Networks tab to create one first.
            </Alert>
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
            <NetworkGroupFormSection
              networkGroupId={formState.networkGroupId}
              newNetworkGroupName={formState.newNetworkGroupName}
              newNetworkGroupProfile={formState.newNetworkGroupProfile}
              newNetworkGroupSubnet={formState.newNetworkGroupSubnet}
              ownerScopedNetworkGroups={ownerScopedNetworkGroups}
              subnetValidation={subnetValidation}
              subnetValidating={subnetValidating}
              onNetworkGroupChange={(value) =>
                setFormState((current) => ({ ...current, networkGroupId: value }))
              }
              onNewNetworkGroupNameChange={(value) =>
                setFormState((current) => ({ ...current, newNetworkGroupName: value }))
              }
              onNewNetworkGroupProfileChange={(value) =>
                setFormState((current) => ({ ...current, newNetworkGroupProfile: value }))
              }
              onNewNetworkGroupSubnetChange={(value) =>
                setFormState((current) => ({ ...current, newNetworkGroupSubnet: value }))
              }
              onSuggestSubnet={() => void handleSuggestSubnet()}
            />
            <BasicVmFormSection
              name={formState.name}
              user={formState.user}
              trust={formState.trust}
              ramMb={formState.ramMb}
              vcpus={formState.vcpus}
              diskGb={formState.diskGb}
              nameAutoFocus={isVmClone || isTemplateDuplicate}
              nameLabel={isVmClone ? 'Target VM name' : isTemplateDuplicate ? 'New template name' : 'VM name'}
              nameError={Boolean(
                normalizedDraftVmName &&
                  deployedVmNames.has(normalizedDraftVmName) &&
                  normalizedDraftVmName !== normalizedOriginalName
              )}
              nameHelperText={
                normalizedDraftVmName &&
                deployedVmNames.has(normalizedDraftVmName) &&
                normalizedDraftVmName !== normalizedOriginalName
                  ? 'VM name must be unique among deployed VMs.'
                  : isVmClone
                    ? `Choose a unique name for the cloned VM. ${MAX_VM_NAME_LENGTH} characters max.`
                    : isTemplateDuplicate
                      ? `Choose a unique name for the duplicated template. ${MAX_VM_NAME_LENGTH} characters max.`
                      : `${MAX_VM_NAME_LENGTH} characters max.`
              }
              onNameChange={(value) => setFormState((current) => ({ ...current, name: value }))}
              onUserChange={(value) => setFormState((current) => ({ ...current, user: value }))}
              onTrustChange={(value) => setFormState((current) => ({ ...current, trust: value }))}
              onRamChange={(value) => setFormState((current) => ({ ...current, ramMb: value }))}
              onVcpusChange={(value) => setFormState((current) => ({ ...current, vcpus: value }))}
              onDiskChange={(value) => setFormState((current) => ({ ...current, diskGb: value }))}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            }}
          >
            <VmPolicyToggles
              allowSudo={formState.allowSudo}
              allowSameGroupTraffic={formState.allowSameGroupTraffic}
              internetAccess={formState.internetAccess}
              allowHostAccess={formState.allowHostAccess}
              allowPrivateLanAccess={formState.allowPrivateLanAccess}
              isAdmin={(users.find((user) => user.id === formState.ownerUserId)?.role || '') === 'admin'}
              onAllowSudoChange={(value) =>
                setFormState((current) => ({ ...current, allowSudo: value }))
              }
              onAllowSameGroupTrafficChange={(value) =>
                setFormState((current) => ({ ...current, allowSameGroupTraffic: value }))
              }
              onInternetAccessChange={(value) =>
                setFormState((current) => ({ ...current, internetAccess: value }))
              }
              onAllowHostAccessChange={(value) =>
                setFormState((current) => ({ ...current, allowHostAccess: value }))
              }
              onAllowPrivateLanAccessChange={(value) =>
                setFormState((current) => ({ ...current, allowPrivateLanAccess: value }))
              }
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
            <AdvancedVmFormSection
              packagesText={formState.packagesText}
              dnsResolversText={formState.dnsResolversText}
              portsText={formState.portsText}
              sshPublicKey={formState.sshPublicKey}
              sshKeyFile={formState.sshKeyFile}
              setupScript={formState.setupScript}
              setupScriptFile={formState.setupScriptFile}
              formMode={formMode}
              onPackagesChange={(value) =>
                setFormState((current) => ({ ...current, packagesText: value }))
              }
              onDnsResolversChange={(value) =>
                setFormState((current) => ({ ...current, dnsResolversText: value }))
              }
              onPortsChange={(value) =>
                setFormState((current) => ({ ...current, portsText: value }))
              }
              onSshPublicKeyChange={(value) =>
                setFormState((current) => ({ ...current, sshPublicKey: value }))
              }
              onSshKeyFileChange={(value) =>
                setFormState((current) => ({ ...current, sshKeyFile: value }))
              }
              onSetupScriptChange={(value) =>
                setFormState((current) => ({ ...current, setupScript: value }))
              }
              onSetupScriptFileChange={(value) =>
                setFormState((current) => ({ ...current, setupScriptFile: value }))
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
      <VmFormActions
        formMode={formMode}
        submitState={submitState}
        draftPayload={draftPayload}
        onCancel={handleClose}
        onSubmit={handleFormSubmit}
      />
    </Dialog>
  );
}
