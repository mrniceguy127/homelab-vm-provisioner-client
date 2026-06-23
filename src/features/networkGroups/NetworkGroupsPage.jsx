import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import CreateNetworkGroupDialog from './components/CreateNetworkGroupDialog.jsx';
import { deleteNetworkGroup } from '../../api.js';

/**
 * Network Groups page for managing network groups.
 *
 * @param {object} props - Component props.
 * @param {Array} props.networkGroups - List of network groups.
 * @param {Array} props.users - List of users.
 * @param {Array} props.vms - List of VMs to check usage.
 * @param {boolean} props.inventoryLoading - Whether inventory is loading.
 * @param {string} props.searchText - Search text.
 * @param {string} props.apiBase - API base URL.
 * @param {Function} props.onSearchChange - Search text change handler.
 * @param {Function} props.onRefresh - Refresh handler.
 * @param {Function} props.showMessage - Show snackbar message.
 * @returns {import('react').JSX.Element} Network Groups Page.
 */
export default function NetworkGroupsPage({
  networkGroups,
  users,
  vms = [],
  inventoryLoading,
  searchText,
  apiBase,
  onSearchChange,
  onRefresh,
  showMessage,
}) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filteredGroups = networkGroups.filter((group) => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      group.name.toLowerCase().includes(search) ||
      group.subnet_cidr?.toLowerCase().includes(search) ||
      group.profile?.toLowerCase().includes(search) ||
      group.owner_user_id?.toLowerCase().includes(search)
    );
  })

  const handleDeleteClick = (group) => {
    setGroupToDelete(group);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return;

    setDeleting(true);
    try {
      await deleteNetworkGroup(apiBase, groupToDelete.id);
      showMessage(`Network group "${groupToDelete.name}" deleted successfully`, 'success');
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
      onRefresh();
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setGroupToDelete(null);
  };

  // Check how many VMs use each network group
  const getVmCountForGroup = (groupId) => {
    return vms.filter((vm) => vm.network_group_id === groupId).length;
  };;

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    onRefresh();
  };

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search network groups..."
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Network Group
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          disabled={inventoryLoading}
        >
          Refresh
        </Button>
      </Box>

      {inventoryLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredGroups.length === 0 ? (
        <Alert severity="info">
          {searchText
            ? 'No network groups match your search.'
            : 'No network groups yet. Create a network group before creating VMs.'}
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {filteredGroups.map((group) => {
            const owner = users.find((user) => user.id === group.owner_user_id);
            const vmCount = getVmCountForGroup(group.id);
            const canDelete = vmCount === 0;
            
            return (
              <Grid item xs={12} sm={6} md={4} key={group.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Typography variant="h6">
                        {group.name}
                      </Typography>
                      <Tooltip title={canDelete ? 'Delete network group' : `Cannot delete: ${vmCount} VM(s) using this network group`}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(group)}
                            disabled={!canDelete}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Subnet CIDR
                        </Typography>
                        <Typography variant="body2">{group.subnet_cidr || 'N/A'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Profile
                        </Typography>
                        <Typography variant="body2">{group.profile || 'N/A'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Owner
                        </Typography>
                        <Typography variant="body2">
                          {owner ? `${owner.username} (${owner.role})` : group.owner_user_id}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          VMs Using
                        </Typography>
                        <Typography variant="body2">{vmCount}</Typography>
                      </Box>
                      {group.gateway_ip && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Gateway
                          </Typography>
                          <Typography variant="body2">{group.gateway_ip}</Typography>
                        </Box>
                      )}
                      {group.created_at && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Created
                          </Typography>
                          <Typography variant="body2">
                            {new Date(group.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <CreateNetworkGroupDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        users={users}
        apiBase={apiBase}
        onSuccess={handleCreateSuccess}
        showMessage={showMessage}
      />

      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Network Group</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the network group &quot;{groupToDelete?.name}&quot;?
            <br />
            <br />
            This will immediately remove the associated virsh network from the system.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
