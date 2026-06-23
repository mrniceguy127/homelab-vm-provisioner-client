import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Container,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
} from '@mui/material';

import {
  fetchConfig,
  fetchConfigs,
  fetchHealth,
  fetchNetworkGroups,
  fetchUsers,
  fetchVms,
} from './api.js';
import { normalizeVmName } from './utils/formUtils.js';
import { useVmPolling } from './hooks/useVmPolling.js';
import AppHeader from './components/layout/AppHeader.jsx';
import VmTemplatesPage from './features/vmTemplates/VmTemplatesPage.jsx';
import RuntimeVmsPage from './features/runtimeVms/RuntimeVmsPage.jsx';
import VmFormDialog from './features/vmForm/VmFormDialog.jsx';
import JobProgressDialog from './features/jobs/JobProgressDialog.jsx';

/**
 * Render the homelab VM control surface.
 *
 * @returns {import('react').JSX.Element} Root client application.
 */
export default function App() {
  const defaultApiBase = import.meta.env.VITE_API_BASE_URL || '';

  // Navigation and UI state
  const [mainTab, setMainTab] = useState(0); // 0=Templates, 1=VMs, 2=Users, 3=Networks
  const [searchText, setSearchText] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, severity: 'info', message: '' });

  // API connection state
  const [apiBaseInput, setApiBaseInput] = useState(defaultApiBase);
  const [apiBase, setApiBase] = useState(defaultApiBase);
  const [health, setHealth] = useState({ state: 'checking', message: 'Checking API' });

  // Inventory data
  const [users, setUsers] = useState([]);
  const [networkGroups, setNetworkGroups] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [vms, setVms] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [resourceLimits, setResourceLimits] = useState({
    maxRamMb: 8192,
    maxVcpus: 4,
    maxDiskGb: 20,
  });

  // Dialog state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formRequest, setFormRequest] = useState(null);
  const [jobProgressOpen, setJobProgressOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);

  /**
   * Show a snackbar message.
   */
  const showMessage = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, severity, message });
  }, []);

  // VM polling hook for async-aware state management
  const vmPolling = useVmPolling(
    apiBase,
    (updatedVms) => setVms(updatedVms),
    showMessage,
    mainTab === 1 // Only poll when on Runtime VMs tab
  );

  // Derived state
  const deployedVmNames = new Set(
    vms.filter((vm) => vm.exists === true).map((vm) => normalizeVmName(vm.name))
  );

  const runtimeVms = vms.filter(
    (vm) => vm.exists === true && vm.status !== 'destroyed' && vm.status !== 'unknown'
  );

  const metrics = {
    total: vms.length,
    running: runtimeVms.filter((vm) => String(vm.status).toLowerCase() === 'running').length,
    configured: configs.length,
    issues: vms.filter((vm) => vm.provisionerError || (!vm.exists && !vm.configured)).length,
  };

  /**
   * Refresh the inventory and API health state.
   */
  const refreshInventory = useCallback(async () => {
    setInventoryLoading(true);
    setHealth({ state: 'checking', message: 'Checking API' });

    const [healthResult, userResult, groupResult, configsResult, inventoryResult] =
      await Promise.allSettled([
        fetchHealth(apiBase),
        fetchUsers(apiBase),
        fetchNetworkGroups(apiBase),
        fetchConfigs(apiBase),
        fetchVms(apiBase),
      ]);

    if (healthResult.status === 'fulfilled') {
      setHealth({ state: 'ok', message: 'API reachable' });
    } else {
      setHealth({ state: 'error', message: healthResult.reason.message });
    }

    if (userResult.status === 'fulfilled') {
      setUsers(userResult.value.users || []);
    } else {
      showMessage(userResult.reason.message, 'error');
    }

    if (groupResult.status === 'fulfilled') {
      setNetworkGroups(groupResult.value.networkGroups || []);
    } else {
      showMessage(groupResult.reason.message, 'error');
    }

    if (configsResult.status === 'fulfilled') {
      setConfigs(configsResult.value.configs || []);
    } else {
      showMessage(configsResult.reason.message, 'error');
    }

    if (inventoryResult.status === 'fulfilled') {
      setVms(inventoryResult.value.vms || []);
    } else {
      showMessage(inventoryResult.reason.message, 'error');
    }

    setInventoryLoading(false);
  }, [apiBase, showMessage]);

  /**
   * Handle API connect button.
   */
  function handleConnect() {
    const nextBase = apiBaseInput.trim();
    if (nextBase === apiBase) {
      void refreshInventory();
      return;
    }
    setApiBase(nextBase);
  }

  /**
   * Open form dialog.
   */
  function handleOpenForm(request) {
    setFormRequest(request);
    setFormDialogOpen(true);
  }

  /**
   * Handle form success.
   */
  async function handleFormSuccess(_vmName) {
    await refreshInventory();
    // If provisioned, switch to Runtime VMs tab
    if (formRequest?.mode === 'create' || formRequest?.mode === 'clone') {
      setMainTab(1);
    }
  }
  /**
   * Open job progress dialog.
   */
  function handleOpenJobProgress(vmName) {
    const jobInfo = vmPolling.activeJobs.get(vmName);
    if (!jobInfo?.job_id) {
      showMessage('No job found for this VM.', 'warning');
      return;
    }
    setSelectedJobId(jobInfo.job_id);
    setJobProgressOpen(true);
  }

  /**
   * Switch to Runtime VMs tab and select a VM.
   */
  function handleSwitchToVm(vmName, jobId) {
    setMainTab(1);
    if (jobId) {
      vmPolling.trackJob(vmName, {
        job_id: jobId,
        status: 'queued',
        type: 'provision_vm',
      });
    }
  }

  /**
   * Track a job for a VM.
   */
  function handleTrackJob(vmName, jobInfo) {
    vmPolling.trackJob(vmName, jobInfo);
  }

  // Load resource limits on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const result = await fetchConfig(apiBase);
        if (result.limits) {
          setResourceLimits(result.limits);
        }
      } catch (error) {
        console.error('Failed to fetch config:', error);
      }
    }
    void loadConfig();
  }, [apiBase]);

  // Refresh inventory when apiBase changes
  useEffect(() => {
    void refreshInventory();
  }, [apiBase, refreshInventory]);

  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <AppHeader
            apiBaseInput={apiBaseInput}
            apiBase={apiBase}
            health={health}
            metrics={metrics}
            onApiBaseInputChange={setApiBaseInput}
            onConnect={handleConnect}
            onRefresh={refreshInventory}
            onNewVm={() => handleOpenForm({ mode: 'create' })}
          />

          <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={mainTab}
              onChange={(_event, nextValue) => setMainTab(nextValue)}
              aria-label="Main navigation tabs"
            >
              <Tab label="VM Templates" />
              <Tab label="Runtime VMs" />
              <Tab label="Users" />
              <Tab label="Networks" />
            </Tabs>
          </Paper>

          {mainTab === 0 && (
            <VmTemplatesPage
              configs={configs}
              users={users}
              networkGroups={networkGroups}
              deployedVmNames={deployedVmNames}
              resourceLimits={resourceLimits}
              inventoryLoading={inventoryLoading}
              searchText={searchText}
              onSearchChange={setSearchText}
              onRefresh={refreshInventory}
              onOpenForm={handleOpenForm}
              onSwitchToVm={handleSwitchToVm}
              showMessage={showMessage}
            />
          )}

          {mainTab === 1 && (
            <RuntimeVmsPage
              vms={vms}
              users={users}
              networkGroups={networkGroups}
              resourceLimits={resourceLimits}
              deployedVmNames={deployedVmNames}
              inventoryLoading={inventoryLoading}
              searchText={searchText}
              apiBase={apiBase}
              onSearchChange={setSearchText}
              onRefresh={vmPolling.refreshVms}
              onOpenForm={handleOpenForm}
              showMessage={showMessage}
              vmPolling={vmPolling}
              onTrackJob={handleTrackJob}
              onOpenJobProgress={handleOpenJobProgress}
            />
          )}

          {mainTab === 2 && (
            <Alert severity="info">User management interface coming soon.</Alert>
          )}

          {mainTab === 3 && (
            <Alert severity="info">Network management interface coming soon.</Alert>
          )}
        </Stack>
      </Container>

      <VmFormDialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        formRequest={formRequest}
        users={users}
        networkGroups={networkGroups}
        deployedVmNames={deployedVmNames}
        resourceLimits={resourceLimits}
        apiBase={apiBase}
        onSuccess={handleFormSuccess}
        showMessage={showMessage}
        onTrackJob={handleTrackJob}
      />

      <JobProgressDialog
        open={jobProgressOpen}
        onClose={() => setJobProgressOpen(false)}
        jobId={selectedJobId}
        apiBase={apiBase}
        showMessage={showMessage}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
