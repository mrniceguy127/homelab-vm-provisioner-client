import { Box } from '@mui/material';
import { formatJson } from '../../../utils/displayUtils.js';
import JsonPanel from '../../../components/common/JsonPanel.jsx';

/**
 * VM Config Tab showing stored and provisioner configs.
 *
 * @param {object} props - Component props.
 * @param {object} props.vmDetail - VM detail object.
 * @returns {import('react').JSX.Element} VM Config Tab.
 */
export default function VmConfigTab({ vmDetail }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
      }}
    >
      <JsonPanel
        title="API-stored config"
        subtitle={vmDetail?.storedConfigPath || 'No stored config path recorded.'}
        value={formatJson(vmDetail?.storedConfig || {})}
      />
      <JsonPanel
        title="Provisioner config snapshot"
        subtitle={vmDetail?.config_path || 'No provisioner config path recorded.'}
        value={formatJson(vmDetail?.config || {})}
      />
    </Box>
  );
}
