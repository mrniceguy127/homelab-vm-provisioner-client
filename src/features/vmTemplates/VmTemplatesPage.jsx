import { useState } from 'react';
import { Box } from '@mui/material';

import { buildUniqueCloneName } from '../../utils/configUtils.js';
import { provisionSavedVm, deleteVmConfig } from '../../api.js';
import TemplateListPanel from './components/TemplateListPanel.jsx';
import TemplateDetailPanel from './components/TemplateDetailPanel.jsx';

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
      await deleteVmConfig(import.meta.env.VITE_API_BASE_URL || '', configName);
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
      const response = await provisionSavedVm(import.meta.env.VITE_API_BASE_URL || '', vmName);

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
      <TemplateListPanel
        configs={configs}
        filteredConfigs={filteredConfigs}
        resourceLimits={resourceLimits}
        inventoryLoading={inventoryLoading}
        searchText={searchText}
        deployedVmNames={deployedVmNames}
        onSearchChange={onSearchChange}
        onSelectConfig={setSelectedConfigDetail}
      />
      <TemplateDetailPanel
        selectedConfig={selectedConfigDetail}
        resourceLimits={resourceLimits}
        actionState={configActionState}
        onDeploy={handleDeploy}
        onClone={handleClone}
        onEdit={handleEditConfig}
        onDelete={handleDeleteConfig}
      />
    </Box>
  );
}
