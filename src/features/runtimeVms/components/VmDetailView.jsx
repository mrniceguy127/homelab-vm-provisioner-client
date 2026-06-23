import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';

import {
  destroyVm,
  fetchVm,
  fetchVmLogs,
  provisionSavedVm,
  startVm,
  stopVm,
  updateVmPolicy,
  createVmSnapshot,
} from '../../../api.js';
import {
  buildStatusDescriptor,
  isVmRunning,
} from '../../../utils/displayUtils.js';
import { parseLineCount } from '../../../utils/formUtils.js';
import { validateDnsResolvers, validatePortRules } from '../../../utils/validationUtils.js';
import { buildUniqueCloneName } from '../../../utils/configUtils.js';
import MetricCard from '../../../components/common/MetricCard.jsx';
import VmDetailTabs from './VmDetailTabs.jsx';
import VmDetailHeader from './VmDetailHeader.jsx';
import VmPowerControls from './VmPowerControls.jsx';
import VmActionButtons from './VmActionButtons.jsx';

/**
 * VM detail view with actions and tabs.
 *
 * @param {object} props - Component props.
 * @param {object} props.selectedVm - Selected VM object.
 * @param {string} props.selectedVmName - Selected VM name.
 * @param {Array} props.users - Available users.
 * @param {Array} props.networkGroups - Available network groups.
 * @param {Set} props.deployedVmNames - Set of deployed VM names.
 * @param {string} props.apiBase - API base URL.
 * @param {Function} props.onRefresh - Refresh inventory handler.
 * @param {Function} props.onOpenForm - Open form dialog handler.
 * @param {Function} props.showMessage - Show snackbar message.
 * @param {object} props.vmJobs - Map of vmName -> job info.
 * @param {Function} props.setVmJobs - Update vmJobs state.
 * @param {Function} props.onOpenJobProgress - Open job progress dialog.
 * @returns {import('react').JSX.Element} VM detail view.
 */
export default function VmDetailView({
  selectedVm,
  selectedVmName,
  users,
  networkGroups,
  deployedVmNames,
  apiBase,
  onRefresh,
  onOpenForm,
  showMessage,
  vmJobs,
  setVmJobs,
  onOpenJobProgress,
}) {
  const [detailLoading, setDetailLoading] = useState(false);
  const [vmDetail, setVmDetail] = useState(selectedVm);
  const [vmActionState, setVmActionState] = useState('idle');
  const [detailTab, setDetailTab] = useState(0);
  const [snapshotLines, setSnapshotLines] = useState('200');
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotLog, setSnapshotLog] = useState('');

  const selectedVmOwner = users.find((user) => user.id === vmDetail?.owner_user_id) || null;
  const selectedVmNetworkGroup =
    networkGroups.find((group) => group.id === vmDetail?.network_group_id) || null;

  const clonableConfig = vmDetail?.storedConfig || vmDetail?.config || null;
  const provisionableConfig = vmDetail?.storedConfig || vmDetail?.config || null;
  const hasClonableConfig = Boolean(clonableConfig);
  const selectedVmIsRunning = isVmRunning(vmDetail);
  const canCloneVm = Boolean(vmDetail?.exists && clonableConfig);
  const canProvisionStoredConfig = Boolean(
    vmDetail?.configured && !vmDetail?.exists && provisionableConfig
  );
  const canCreateSnapshot = Boolean(vmDetail?.exists);
  const canStartSelectedVm = Boolean(vmDetail?.exists) && !selectedVmIsRunning;
  const canStopSelectedVm = selectedVmIsRunning;
  const powerStateLabel = !vmDetail?.exists
    ? 'Not provisioned'
    : selectedVmIsRunning
      ? 'Running'
      : 'Stopped';
  const powerStateColor = !vmDetail?.exists
    ? 'default'
    : selectedVmIsRunning
      ? 'success'
      : 'warning';
  const snapshots = vmDetail?.snapshots || [];
  const selectedStatus = buildStatusDescriptor(vmDetail);

  /**
   * Load VM detail data.
   *
   * @returns {Promise<void>} Resolves after detail state is updated.
   */
  const loadVmDetails = useCallback(async () => {
    setDetailLoading(true);
    try {
      const response = await fetchVm(apiBase, selectedVmName);
      setVmDetail(response.vm);
    } catch (error) {
      setVmDetail(null);
      showMessage(error.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [apiBase, selectedVmName, showMessage]);

  /**
   * Load a log snapshot.
   *
   * @param {string} [lineCountText=snapshotLines] - Requested line count.
   * @returns {Promise<void>} Resolves after the snapshot text is updated.
   */
  const loadSnapshot = useCallback(async (lineCountText = snapshotLines) => {
    try {
      const lines = parseLineCount(lineCountText, 200);
      setSnapshotLoading(true);
      const response = await fetchVmLogs(apiBase, selectedVmName, lines);
      setSnapshotLog(response.log || '');
    } catch (error) {
      setSnapshotLog(`Log snapshot unavailable.\n\n${error.message}`);
      showMessage(error.message, 'warning');
    } finally {
      setSnapshotLoading(false);
    }
  }, [apiBase, selectedVmName, snapshotLines, showMessage]);

  /**
   * Start the selected VM.
   */
  async function handleStartVm() {
    setVmActionState('start');
    try {
      await startVm(apiBase, selectedVmName);
      showMessage(`Started ${selectedVmName}.`, 'success');
      await onRefresh();
      await loadVmDetails();
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setVmActionState('idle');
    }
  }

  /**
   * Stop the selected VM.
   */
  async function handleStopVm() {
    setVmActionState('stop');
    try {
      await stopVm(apiBase, selectedVmName);
      showMessage(`Stopped ${selectedVmName}.`, 'success');
      await onRefresh();
      await loadVmDetails();
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setVmActionState('idle');
    }
  }

  /**
   * Destroy the selected VM.
   */
  async function handleDestroyVm() {
    const confirmed = window.confirm(
      `Destroy ${selectedVmName}? The saved template will be kept.`
    );
    if (!confirmed) {
      return;
    }

    setVmActionState('destroy');
    try {
      await destroyVm(apiBase, selectedVmName);
      showMessage(`Destroyed ${selectedVmName}.`, 'success');
      await onRefresh();
      await loadVmDetails();
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setVmActionState('idle');
    }
  }

  /**
   * Provision the selected saved template.
   */
  async function handleProvisionStoredConfig() {
    if (!vmDetail?.configured) {
      showMessage('No saved template is available to provision.', 'warning');
      return;
    }

    // Validate the stored config before provisioning
    try {
      const config = vmDetail.config;
      if (config) {
        if (config.dns?.resolvers) {
          const resolversText = config.dns.resolvers.join(', ');
          validateDnsResolvers(resolversText);
        }

        if (config.ports && config.ports.length > 0) {
          const portsText = config.ports
            .map(
              (p) =>
                `${p.host || p.external_port}:${p.guest || p.internal_port}${
                  p.proto || p.protocol ? '/' + (p.proto || p.protocol) : ''
                }`
            )
            .join('\n');
          validatePortRules(portsText);
        }
      }
    } catch (validationError) {
      showMessage(
        `Cannot provision: Invalid configuration in template. ${validationError.message}`,
        'error'
      );
      return;
    }

    setVmActionState('provision');
    try {
      const response = await provisionSavedVm(apiBase, selectedVmName);

      if (response.job_id) {
        setVmJobs((prev) => ({
          ...prev,
          [selectedVmName]: {
            job_id: response.job_id,
            status: response.status || 'queued',
            type: 'provision_vm',
            timestamp: new Date().toISOString(),
          },
        }));
      }

      showMessage(`Provisioned ${selectedVmName} from its saved template.`, 'success');
      await onRefresh();
      await loadVmDetails();
      await loadSnapshot();
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setVmActionState('idle');
    }
  }

  /**
   * Update VM network policy.
   *
   * @param {object} patch - Partial policy update.
   */
  async function handleUpdateVmPolicy(patch) {
    setVmActionState('policy');
    try {
      await updateVmPolicy(apiBase, selectedVmName, patch);
      showMessage(`Updated network policy for ${selectedVmName}.`, 'success');
      await onRefresh();
      await loadVmDetails();
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setVmActionState('idle');
    }
  }

  /**
   * Create a snapshot.
   */
  async function handleCreateRestorePoint() {
    setVmActionState('snapshot-create');
    try {
      await createVmSnapshot(apiBase, selectedVmName);
      showMessage(`Created a snapshot for ${selectedVmName}.`, 'success');
      await onRefresh();
      await loadVmDetails();
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setVmActionState('idle');
    }
  }

  /**
   * Open clone dialog.
   */
  function openCloneDialog() {
    if (!clonableConfig) {
      showMessage('No config is available to clone for this entry.', 'warning');
      return;
    }

    if (!vmDetail?.exists) {
      showMessage('Full VM clones require a live source VM disk.', 'warning');
      return;
    }

    const suggestedCloneName = buildUniqueCloneName(selectedVmName, deployedVmNames);

    onOpenForm({
      mode: 'clone',
      config: clonableConfig,
      sourceVmName: selectedVmName,
      suggestedName: suggestedCloneName,
    });
  }

  useEffect(() => {
    if (selectedVmName) {
      setDetailTab(0);
      setSnapshotLog('');
      void loadVmDetails();
      void loadSnapshot();
    }
  }, [selectedVmName, apiBase, loadVmDetails, loadSnapshot]);

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
        <VmDetailHeader
          vmName={selectedVmName}
          statusDescriptor={selectedStatus}
          hasTemplate={Boolean(vmDetail?.configured)}
          networkGroupName={selectedVmNetworkGroup?.name || null}
          ipAddress={vmDetail?.ip_address}
          networkProfile={vmDetail?.network?.profile || vmDetail?.network?.mode}
          ownerUsername={selectedVmOwner?.username || vmDetail?.owner_user_id}
          macAddress={vmDetail?.mac_address || vmDetail?.network?.mac}
        />
        <Stack spacing={1.25} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
          <VmPowerControls
            powerStateLabel={powerStateLabel}
            powerStateColor={powerStateColor}
            canStart={canStartSelectedVm}
            canStop={canStopSelectedVm}
            actionState={vmActionState}
            onStart={() => void handleStartVm()}
            onStop={() => void handleStopVm()}
          />
          <VmActionButtons
            hasClonableConfig={hasClonableConfig}
            canClone={canCloneVm}
            canCreateSnapshot={canCreateSnapshot}
            canProvisionStoredConfig={canProvisionStoredConfig}
            vmExists={Boolean(vmDetail?.exists)}
            hasJobProgress={Boolean(vmJobs[selectedVmName]?.job_id)}
            actionState={vmActionState}
            onClone={openCloneDialog}
            onCreateSnapshot={() => void handleCreateRestorePoint()}
            onProvisionStoredConfig={() => void handleProvisionStoredConfig()}
            onRefresh={async () => {
              await onRefresh();
              await loadVmDetails();
              await loadSnapshot();
            }}
            onViewJobProgress={() => onOpenJobProgress(selectedVmName)}
            onDestroy={() => void handleDestroyVm()}
          />
        </Stack>
      </Stack>

      {detailLoading ? (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography color="text.secondary">Refreshing VM details…</Typography>
        </Stack>
      ) : null}

      {vmDetail?.provisionerError ? <Alert severity="warning">{vmDetail.provisionerError}</Alert> : null}

      {canProvisionStoredConfig ? (
        <Alert
          severity="info"
          action={
            <Button
              color="inherit"
              size="small"
              disabled={vmActionState !== 'idle'}
              onClick={() => void handleProvisionStoredConfig()}
            >
              {vmActionState === 'provision' ? 'Provisioning…' : 'Create VM'}
            </Button>
          }
        >
          This entry has a saved template but no live VM. Use it to provision now.
        </Alert>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
        }}
      >
        <MetricCard
          title="Provisioner status"
          value={vmDetail?.status || 'unknown'}
          caption={vmDetail?.state_path || 'No persisted state file detected.'}
          icon={<HubRoundedIcon />}
        />
        <MetricCard
          title="Primary address"
          value={vmDetail?.ip_address || 'Unavailable'}
          caption={
            vmDetail?.ip_source ? `Resolved via ${vmDetail.ip_source}.` : 'No IP source reported.'
          }
          icon={<DnsRoundedIcon />}
        />
      </Box>

      <Tabs value={detailTab} onChange={(_event, nextValue) => setDetailTab(nextValue)}>
        <Tab label="Overview" />
        <Tab label="Config" />
        <Tab label={snapshots.length > 0 ? `Snapshots (${snapshots.length})` : 'Snapshots'} />
        <Tab label="Logs" />
        <Tab label="VM State" />
      </Tabs>

      <VmDetailTabs
        detailTab={detailTab}
        vmDetail={vmDetail}
        selectedVmName={selectedVmName}
        selectedVmOwner={selectedVmOwner}
        selectedVmNetworkGroup={selectedVmNetworkGroup}
        snapshots={snapshots}
        snapshotLines={snapshotLines}
        snapshotLog={snapshotLog}
        snapshotLoading={snapshotLoading}
        vmActionState={vmActionState}
        apiBase={apiBase}
        canCreateSnapshot={canCreateSnapshot}
        onSnapshotLinesChange={setSnapshotLines}
        onLoadSnapshot={loadSnapshot}
        onUpdateVmPolicy={handleUpdateVmPolicy}
        onCreateRestorePoint={handleCreateRestorePoint}
        onRefresh={onRefresh}
        onLoadVmDetails={loadVmDetails}
        showMessage={showMessage}
      />
    </Stack>
  );
}
