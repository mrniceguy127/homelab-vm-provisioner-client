import { Box, Checkbox, FormControlLabel, TextField } from '@mui/material';

/**
 * Config Save Section - Toggle and display name for saving VM as reusable config/template.
 *
 * @param {object} props - Component props.
 * @param {boolean} props.saveAsConfig - Whether to save as config.
 * @param {Function} props.onSaveAsConfigChange - Handler for save-as-config toggle.
 * @param {string} props.configDisplayName - Config display name.
 * @param {Function} props.onConfigDisplayNameChange - Handler for config display name change.
 * @param {boolean} [props.disabled=false] - Whether the section is disabled.
 * @returns {import('react').JSX.Element} Config Save Section.
 */
export default function ConfigSaveSection({
  saveAsConfig,
  onSaveAsConfigChange,
  configDisplayName,
  onConfigDisplayNameChange,
  disabled = false,
}) {
  return (
    <Box>
      <FormControlLabel
        control={
          <Checkbox
            checked={saveAsConfig}
            onChange={(e) => onSaveAsConfigChange(e.target.checked)}
            disabled={disabled}
          />
        }
        label="Save as reusable config/template"
      />
      {saveAsConfig && (
        <TextField
          fullWidth
          required
          label="Config Display Name"
          value={configDisplayName}
          onChange={(e) => onConfigDisplayNameChange(e.target.value)}
          disabled={disabled}
          placeholder="e.g., Ubuntu Dev Box, Web Server Template"
          helperText="A descriptive name for this reusable config/template (separate from VM runtime name)"
          sx={{ mt: 1.5 }}
        />
      )}
    </Box>
  );
}
