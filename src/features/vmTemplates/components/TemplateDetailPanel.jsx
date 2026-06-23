import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { validateStoredConfig } from '../../../utils/validationUtils.js';

/**
 * Template Detail Panel showing selected template details and actions.
 *
 * @param {object} props - Component props.
 * @param {object|null} props.selectedConfig - Selected config object.
 * @param {object} props.resourceLimits - Resource limit configuration.
 * @param {string} props.actionState - Current action state.
 * @param {Function} props.onDeploy - Deploy handler.
 * @param {Function} props.onClone - Clone handler.
 * @param {Function} props.onEdit - Edit handler.
 * @param {Function} props.onDelete - Delete handler.
 * @returns {import('react').JSX.Element} Template Detail Panel.
 */
export default function TemplateDetailPanel({
  selectedConfig,
  resourceLimits,
  actionState,
  onDeploy,
  onClone,
  onEdit,
  onDelete,
}) {
  if (!selectedConfig) {
    return (
      <Paper sx={{ p: 2.5 }}>
        <Alert severity="info">
          Select a VM template from the list to view its configuration details.
        </Alert>
      </Paper>
    );
  }

  const vmName = selectedConfig.vm_name || selectedConfig.config?.vm?.name;
  const config = selectedConfig.config || selectedConfig;
  const validation = validateStoredConfig(config, resourceLimits);

  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack spacing={2.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6">{vmName}</Typography>
            <Typography variant="body2" color="text.secondary">
              VM Template Configuration
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              size="small"
              disabled={actionState !== 'idle' || !validation.valid}
              onClick={() => onDeploy(vmName)}
            >
              Deploy
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={actionState !== 'idle'}
              onClick={() => onClone(config)}
            >
              Clone
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditRoundedIcon />}
              disabled={actionState !== 'idle'}
              onClick={() => onEdit(config)}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<DeleteRoundedIcon />}
              disabled={actionState !== 'idle'}
              onClick={() => onDelete(vmName)}
            >
              Delete
            </Button>
          </Stack>
        </Stack>

        {!validation.valid ? (
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
        ) : (
          <Alert severity="success">Configuration is valid</Alert>
        )}

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
            {JSON.stringify(selectedConfig, null, 2)}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
