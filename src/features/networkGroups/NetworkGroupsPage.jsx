import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import CreateNetworkGroupDialog from './components/CreateNetworkGroupDialog.jsx';

/**
 * Network Groups page for managing network groups.
 *
 * @param {object} props - Component props.
 * @param {Array} props.networkGroups - List of network groups.
 * @param {Array} props.users - List of users.
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
  inventoryLoading,
  searchText,
  apiBase,
  onSearchChange,
  onRefresh,
  showMessage,
}) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredGroups = networkGroups.filter((group) => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      group.name.toLowerCase().includes(search) ||
      group.subnet_cidr?.toLowerCase().includes(search) ||
      group.profile?.toLowerCase().includes(search) ||
      group.owner_user_id?.toLowerCase().includes(search)
    );
  });

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
            return (
              <Grid item xs={12} sm={6} md={4} key={group.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {group.name}
                    </Typography>
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
    </Stack>
  );
}
