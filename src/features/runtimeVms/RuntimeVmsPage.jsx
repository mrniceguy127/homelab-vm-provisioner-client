import { useState, useEffect, useDeferredValue, startTransition } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

import { buildStatusDescriptor, formatNetworkSummary } from '../../utils/displayUtils.js';
import VmDetailView from './components/VmDetailView.jsx';

/**
 * Runtime VMs tab - displays live provisioned VMs.
 *
 * @param {object} props - Component props.
 * @param {Array} props.vms - All VMs (runtime + config-only).
 * @param {Array} props.users - Available users.
 * @param {Array} props.networkGroups - Available network groups.
 * @param {object} props.resourceLimits - Resource limit configuration.
 * @param {Set} props.deployedVmNames - Set of deployed VM names.
 * @param {boolean} props.inventoryLoading - Whether inventory is loading.
 * @param {string} props.searchText - Current search filter.
 * @param {string} props.apiBase - API base URL.
 * @param {Function} props.onSearchChange - Search text change handler.
 * @param {Function} props.onRefresh - Refresh inventory handler.
 * @param {Function} props.onOpenForm - Open form dialog handler.
 * @param {Function} props.showMessage - Show snackbar message.
 * @param {object} props.vmJobs - Map of vmName -> job info.
 * @param {Function} props.setVmJobs - Update vmJobs state.
 * @param {Function} props.onOpenJobProgress - Open job progress dialog.
 * @returns {import('react').JSX.Element} Runtime VMs page.
 */
export default function RuntimeVmsPage({
  vms,
  users,
  networkGroups,
  resourceLimits: _resourceLimits,
  deployedVmNames,
  inventoryLoading,
  searchText,
  apiBase,
  onSearchChange,
  onRefresh,
  onOpenForm,
  showMessage,
  vmJobs,
  setVmJobs,
  onOpenJobProgress,
}) {
  const [selectedVmName, setSelectedVmName] = useState('');

  const deferredSearchText = useDeferredValue(searchText);

  // Filter VMs for Runtime VMs tab - only show VMs that actually exist (not config-only entries)
  const runtimeVms = vms.filter(
    (vm) => vm.exists === true && vm.status !== 'destroyed' && vm.status !== 'unknown'
  );

  const filteredVms = runtimeVms.filter((vm) => {
    const searchNeedle = deferredSearchText.trim().toLowerCase();
    if (!searchNeedle) {
      return true;
    }

    return [
      vm.name,
      vm.status,
      vm.ip_address,
      vm.network?.mode,
      vm.network?.profile,
      vm.network?.group_name,
      vm.network_group_id,
      vm.trust,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(searchNeedle));
  });

  // Compute valid selection: use current selection if valid, otherwise first VM
  const validSelectedVmName = (() => {
    if (selectedVmName) {
      const selectedVmData = vms.find((vm) => vm.name === selectedVmName);
      if (selectedVmData && selectedVmData.exists) {
        return selectedVmName;
      }
    }
    return filteredVms.length > 0 ? filteredVms[0].name : '';
  })();

  // Update state if computed value differs (runs once per change)
  useEffect(() => {
    if (validSelectedVmName !== selectedVmName) {
      setSelectedVmName(validSelectedVmName);
    }
  }, [validSelectedVmName, selectedVmName]);

  const selectedVm = vms.find((vm) => vm.name === selectedVmName) || null;

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        alignItems: 'start',
        gridTemplateColumns: { xs: '1fr', xl: '360px minmax(0, 1fr)' },
      }}
    >
      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6">Runtime VMs</Typography>
              <Typography variant="body2" color="text.secondary">
                Live VM instances currently provisioned on hosts.
              </Typography>
            </Box>
            {inventoryLoading ? <CircularProgress size={20} /> : null}
          </Stack>

          <TextField
            size="small"
            placeholder="Search runtime VMs"
            value={searchText}
            onChange={(event) => onSearchChange(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <List sx={{ p: 0 }}>
            {filteredVms.map((vm) => {
              const status = buildStatusDescriptor(vm);
              return (
                <ListItemButton
                  key={vm.name}
                  selected={vm.name === selectedVmName}
                  onClick={() => {
                    startTransition(() => {
                      setSelectedVmName(vm.name);
                    });
                  }}
                  sx={{
                    mb: 1.25,
                    borderRadius: 2.5,
                    alignItems: 'flex-start',
                    border: (theme) => `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                  }}
                >
                  <ListItemText
                    disableTypography
                    primary={
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {vm.name}
                        </Typography>
                        <Chip size="small" label={status.label} color={status.color} />
                      </Stack>
                    }
                    secondary={
                      <Stack spacing={0.75} sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {formatNetworkSummary(vm)}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {vm.trust ? <Chip size="small" variant="outlined" label={vm.trust} /> : null}
                          {vm.configured ? (
                            <Chip size="small" variant="outlined" color="secondary" label="Template saved" />
                          ) : null}
                        </Stack>
                      </Stack>
                    }
                  />
                </ListItemButton>
              );
            })}
          </List>

          {!inventoryLoading && filteredVms.length === 0 && runtimeVms.length === 0 ? (
            <Alert severity="info">No runtime VMs yet. Create and provision a VM to see it here.</Alert>
          ) : !inventoryLoading && filteredVms.length === 0 && runtimeVms.length > 0 ? (
            <Alert severity="info">No VMs match your search. Try a different search term.</Alert>
          ) : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
        {!selectedVmName || !selectedVm?.exists ? (
          <Stack spacing={2} alignItems="flex-start">
            <Typography variant="h5">No VM selected</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560 }}>
              {selectedVmName && !selectedVm?.exists
                ? 'This VM is not currently deployed. Switch to VM Templates tab to view its configuration.'
                : 'Create a new VM or select an existing item from the inventory to inspect its live status, config, and logs.'}
            </Typography>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => onOpenForm({ mode: 'create' })}>
              Create VM
            </Button>
          </Stack>
        ) : (
          <VmDetailView
            selectedVm={selectedVm}
            selectedVmName={selectedVmName}
            users={users}
            networkGroups={networkGroups}
            deployedVmNames={deployedVmNames}
            apiBase={apiBase}
            onRefresh={onRefresh}
            onOpenForm={onOpenForm}
            showMessage={showMessage}
            vmJobs={vmJobs}
            setVmJobs={setVmJobs}
            onOpenJobProgress={onOpenJobProgress}
          />
        )}
      </Paper>
    </Box>
  );
}
