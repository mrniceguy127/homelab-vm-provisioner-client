import {
  Alert,
  Box,
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
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { validateStoredConfig } from '../../../utils/validationUtils.js';

/**
 * Template List Panel showing VM templates.
 *
 * @param {object} props - Component props.
 * @param {Array} props.configs - VM template configurations.
 * @param {Array} props.filteredConfigs - Filtered VM template configurations.
 * @param {object} props.resourceLimits - Resource limit configuration.
 * @param {boolean} props.inventoryLoading - Whether inventory is loading.
 * @param {string} props.searchText - Current search filter.
 * @param {Function} props.onSearchChange - Search text change handler.
 * @param {Function} props.onSelectConfig - Select config handler.
 * @returns {import('react').JSX.Element} Template List Panel.
 */
export default function TemplateListPanel({
  configs,
  filteredConfigs,
  resourceLimits,
  inventoryLoading,
  searchText,
  onSearchChange,
  onSelectConfig,
}) {
  return (
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
                onClick={() => onSelectConfig(cfg)}
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
  );
}
