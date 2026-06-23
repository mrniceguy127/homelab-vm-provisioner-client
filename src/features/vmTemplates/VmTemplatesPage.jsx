import { useState } from 'react';
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
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';

import { validateStoredConfig } from '../../utils/validationUtils.js';
import { buildUniqueCloneName } from '../../utils/configUtils.js';
import { provisionSavedVm, deleteVmConfig } from '../../api.js';

/**
 * VM Templates tab - displays config-only VM definitions.
 *
 * @param {object} props - Component props.
 * @param {Array} props.configs - VM template configurations.
 * @param {Array} props.users - Available users.
 * @param {Array} props.networkGroups - Available network groups.
 * @param {Array} props.deployedVmNames - Set of deployed VM names for uniqueness checking.
 * @param {object} props.resourceLimits - Resource limit configuration.
 * @param {boolean} props.inventoryLoading - Whether inventory is loading.
 * @param {string} props.searchText - Current search filter.
 * @param {Function} props.onSearchChange - Search text change handler.
 * @param {Function} props.onRefresh - Refresh inventory handler.
 * @param {Function} props.onOpenForm - Open form dialog handler.
 * @param {Function} props.onSwitchToVm - Switch to Runtime VMs tab and select VM.
 * @param {Function} props.showMessage - Show snackbar message.
 * @returns {import('react').JSX.Element} VM Templates page.
 */
export default function VmTemplatesPage({
  configs,
  users: _users,
  networkGroups: _networkGroups,
  deployedVmNames,
  resourceLimits,
  inventoryLoading,
  searchText,
  onSearchChange,
  onRefresh,
  onOpenForm,
  onSwitchToVm,
  showMessage,
}) {
  const [selectedConfigDetail, setSelectedConfigDetail] = useState(null);
  const [configActionState, setConfigActionState] = useState('idle');

  const filteredConfigs = configs.filter((cfg) => {
    const vmName = cfg.vm_name || cfg.config?.vm?.name || '';
    return vmName.toLowerCase().includes(searchText.toLowerCase());
  });

  /**
   * Delete a VM template/config.
   *
   * @param {string} configName - Config name to delete.
   * @returns {Promise<void>} Resolves after deletion.
   */
  async function handleDeleteConfig(configName) {
    const confirmed = window.confirm(
      `Delete template "${configName}"? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setConfigActionState('deleting');
    try {
      await deleteVmConfig(onRefresh.apiBase, configName);
      showMessage(`Deleted template: ${configName}`, 'success');
      setSelectedConfigDetail(null);
      await onRefresh();
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setConfigActionState('idle');
    }
  }

  /**
   * Open edit dialog for a VM template/config.
   *
   * @param {object} config - Config to edit.
   */
  function handleEditConfig(config) {
    onOpenForm({
      mode: 'edit',
      config,
    });
  }

  /**
   * Deploy a VM template.
   *
   * @param {string} vmName - VM name to deploy.
   * @returns {Promise<void>} Resolves after deployment.
   */
  async function handleDeploy(vmName) {
    setConfigActionState('provisioning');
    try {
      const response = await provisionSavedVm(onRefresh.apiBase, vmName);

      showMessage(`Provisioned ${vmName} from its saved template.`, 'success');
      await onRefresh();
      onSwitchToVm(vmName, response.job_id);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setConfigActionState('idle');
    }
  }

  /**
   * Clone a VM template.
   *
   * @param {object} config - Config to clone.
   */
  function handleClone(config) {
    const vmName = config.vm_name || config.config?.vm?.name;
    const suggestedCloneName = buildUniqueCloneName(vmName, deployedVmNames);
    
    onOpenForm({
      mode: 'clone',
      config,
      suggestedName: suggestedCloneName,
    });
  }

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
              <Typography variant="h6">VM Templates</Typography>
              <Typography variant="body2" color="text.secondary">
                VM definitions that follow your user account across all hosts.
              </Typography>
            </Box>
            {inventoryLoading ? <CircularProgress size={20} /> : null}
          </Stack>

          <TextField
            size="small"
            placeholder="Search templates"
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
            {filteredConfigs.map((cfg) => {
              const vmName = cfg.vm_name || cfg.config?.vm?.name || 'unnamed';
              const configToValidate = cfg.config || cfg;
              const validation = validateStoredConfig(configToValidate, resourceLimits);
              return (
                <ListItemButton
                  key={cfg.id || vmName}
                  onClick={() => {
                    setSelectedConfigDetail(cfg);
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>{vmName}</span>
                        <Chip
                          label={validation.valid ? 'Valid' : 'Invalid'}
                          color={validation.valid ? 'success' : 'error'}
                          size="small"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Stack>
                    }
                    secondary={
                      validation.valid
                        ? `Template • ${cfg.config?.vm?.trust || 'unknown trust'}`
                        : `Template • ${validation.errors[0]}`
                    }
                  />
                </ListItemButton>
              );
            })}
            {filteredConfigs.length === 0 && configs.length > 0 && (
              <Alert severity="info">
                No templates match your search.
              </Alert>
            )}
            {configs.length === 0 && (
              <Alert severity="info">
                No VM templates found. Create a new VM to save a template.
              </Alert>
            )}
          </List>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        {!selectedConfigDetail ? (
          <Alert severity="info">
            Select a VM template from the list to view its configuration details.
          </Alert>
        ) : (
          <Stack spacing={2.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h6">
                  {selectedConfigDetail.vm_name || selectedConfigDetail.config?.vm?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  VM Template Configuration
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  size="small"
                  disabled={
                    configActionState !== 'idle' ||
                    !validateStoredConfig(
                      selectedConfigDetail.config || selectedConfigDetail,
                      resourceLimits
                    ).valid
                  }
                  onClick={() => {
                    const vmName =
                      selectedConfigDetail.vm_name || selectedConfigDetail.config?.vm?.name;
                    void handleDeploy(vmName);
                  }}
                >
                  Deploy
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={configActionState !== 'idle'}
                  onClick={() => {
                    const config = selectedConfigDetail.config || selectedConfigDetail;
                    handleClone(config);
                  }}
                >
                  Clone
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditRoundedIcon />}
                  disabled={configActionState !== 'idle'}
                  onClick={() =>
                    handleEditConfig(selectedConfigDetail.config || selectedConfigDetail)
                  }
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<DeleteRoundedIcon />}
                  disabled={configActionState !== 'idle'}
                  onClick={() =>
                    void handleDeleteConfig(
                      selectedConfigDetail.vm_name || selectedConfigDetail.config?.vm?.name
                    )
                  }
                >
                  Delete
                </Button>
              </Stack>
            </Stack>

            {(() => {
              const validation = validateStoredConfig(
                selectedConfigDetail.config || selectedConfigDetail,
                resourceLimits
              );
              if (!validation.valid) {
                return (
                  <Alert severity="error">
                    <Typography variant="subtitle2" gutterBottom>
                      Invalid Configuration
                    </Typography>
                    <Typography variant="body2" component="div">
                      <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
                        {validation.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </Typography>
                  </Alert>
                );
              }
              return <Alert severity="success">Configuration is valid</Alert>;
            })()}

            <Box>
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  backgroundColor: (theme) => alpha(theme.palette.common.black, 0.2),
                  p: 2,
                  borderRadius: 1,
                }}
              >
                {JSON.stringify(selectedConfigDetail, null, 2)}
              </Typography>
            </Box>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
