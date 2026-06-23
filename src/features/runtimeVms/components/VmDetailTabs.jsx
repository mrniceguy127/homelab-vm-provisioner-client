import { useState, useEffect } from 'react';

import { restoreVmSnapshot, deleteVmSnapshot, buildVmLogStreamUrl } from '../../../api.js';
import { parseLineCount } from '../../../utils/formUtils.js';
import VMStateDetail from './VMStateDetail.jsx';
import VmOverviewTab from './VmOverviewTab.jsx';
import VmConfigTab from './VmConfigTab.jsx';
import VmSnapshotsTab from './VmSnapshotsTab.jsx';
import VmLogsTab from './VmLogsTab.jsx';

/**
 * VM detail tabs content.
 *
 * @param {object} props - Component props.
 * @returns {import('react').JSX.Element} VM detail tabs.
 */
export default function VmDetailTabs({
  detailTab,
  vmDetail,
  selectedVmName,
  selectedVmOwner,
  selectedVmNetworkGroup,
  snapshots,
  snapshotLines,
  snapshotLog,
  snapshotLoading,
  vmActionState,
  apiBase,
  canCreateSnapshot,
  onSnapshotLinesChange,
  onLoadSnapshot,
  onUpdateVmPolicy,
  onCreateRestorePoint,
  onRefresh,
  onLoadVmDetails,
  showMessage,
}) {
  const [streamLines, setStreamLines] = useState('100');
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamLog, setStreamLog] = useState('');
  const [streamError, setStreamError] = useState('');

  /**
   * Restore VM from snapshot.
   *
   * @param {string} snapshotId - Snapshot identifier.
   */
  async function handleRestoreSnapshot(snapshotId) {
    const confirmed = window.confirm(
      `Restore ${selectedVmName} from snapshot ${snapshotId}? The VM will be stopped and left powered off after the restore.`
    );
    if (!confirmed) {
      return;
    }

    try {
      await restoreVmSnapshot(apiBase, selectedVmName, snapshotId);
      showMessage(`Restored ${selectedVmName} from snapshot ${snapshotId}.`, 'success');
      await onRefresh();
      await onLoadVmDetails();
      await onLoadSnapshot();
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  /**
   * Delete a snapshot.
   *
   * @param {string} snapshotId - Snapshot identifier.
   */
  async function handleDeleteRestorePoint(snapshotId) {
    const confirmed = window.confirm(`Delete snapshot ${snapshotId} for ${selectedVmName}?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteVmSnapshot(apiBase, selectedVmName, snapshotId);
      showMessage(`Deleted snapshot ${snapshotId}.`, 'success');
      await onRefresh();
      await onLoadVmDetails();
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  // Reset stream state when tab changes
  useEffect(() => {
    if (detailTab !== 3) {
      setStreamEnabled(false);
      setStreamConnected(false);
      setStreamLog('');
      setStreamError('');
    }
  }, [detailTab]);

  // Manage log streaming
  useEffect(() => {
    if (!selectedVmName || !streamEnabled || detailTab !== 3) {
      return undefined;
    }

    let stream;
    // Initialize state before starting stream
    setStreamConnected(false);
    setStreamError('');
    setStreamLog('');
    
    try {
      const lines = parseLineCount(streamLines, 100);

      stream = new EventSource(buildVmLogStreamUrl(apiBase, selectedVmName, lines));
      stream.onopen = () => {
        setStreamConnected(true);
      };
      stream.addEventListener('log', (event) => {
        try {
          const payload = JSON.parse(event.data);
          setStreamLog((current) => `${current}${payload.chunk || ''}`);
        } catch {
          setStreamLog((current) => `${current}${event.data}\n`);
        }
      });
      stream.addEventListener('error', (event) => {
        if (typeof event.data === 'string' && event.data) {
          try {
            const payload = JSON.parse(event.data);
            setStreamError(payload.message || 'Log stream reported an error.');
          } catch {
            setStreamError(event.data);
          }
        } else {
          setStreamError('Log stream disconnected.');
        }
        setStreamConnected(false);
      });
    } catch (error) {
      setStreamEnabled(false);
      setStreamError(error.message);
      showMessage(error.message, 'warning');
      return undefined;
    }

    return () => {
      stream?.close();
      setStreamConnected(false);
    };
  }, [apiBase, selectedVmName, streamEnabled, streamLines, detailTab, showMessage]);

  if (detailTab === 0) {
    return (
      <VmOverviewTab
        vmDetail={vmDetail}
        selectedVmOwner={selectedVmOwner}
        selectedVmNetworkGroup={selectedVmNetworkGroup}
        vmActionState={vmActionState}
        onUpdateVmPolicy={onUpdateVmPolicy}
      />
    );
  }

  if (detailTab === 1) {
    return <VmConfigTab vmDetail={vmDetail} />;
  }

  if (detailTab === 2) {
    return (
      <VmSnapshotsTab
        snapshots={snapshots}
        vmExists={Boolean(vmDetail?.exists)}
        canCreateSnapshot={canCreateSnapshot}
        vmActionState={vmActionState}
        onCreateSnapshot={onCreateRestorePoint}
        onRestoreSnapshot={handleRestoreSnapshot}
        onDeleteSnapshot={handleDeleteRestorePoint}
      />
    );
  }

  if (detailTab === 3) {
    return (
      <VmLogsTab
        snapshotLines={snapshotLines}
        snapshotLog={snapshotLog}
        snapshotLoading={snapshotLoading}
        streamLines={streamLines}
        streamEnabled={streamEnabled}
        streamConnected={streamConnected}
        streamLog={streamLog}
        streamError={streamError}
        selectedVmName={selectedVmName}
        onSnapshotLinesChange={onSnapshotLinesChange}
        onLoadSnapshot={onLoadSnapshot}
        onStreamLinesChange={setStreamLines}
        onStreamEnabledChange={setStreamEnabled}
      />
    );
  }

  if (detailTab === 4) {
    return <VMStateDetail apiBase={apiBase} vmName={selectedVmName} />;
  }

  return null;
}
