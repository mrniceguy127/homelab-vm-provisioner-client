# UI Refactor Implementation Status

## ✅ Completed

### Backend & API Infrastructure
1. ✅ 1MB log cap in database + worker
2. ✅ GET /api/configs endpoint
3. ✅ GET /api/vms/:name/state endpoint with labeled original config
4. ✅ Client API functions: fetchConfigs(), fetchVmState()
5. ✅ Tests for log capping

### Client Components
1. ✅ Created VMStateDetail.jsx component
   - Shows original creation config vs runtime state side-by-side
   - Clear labels and explanatory text
   - Helper section explaining config drift

2. ✅ Updated App.jsx state management
   - Added mainTab state for navigation
   - Added configs state (separate from vms)
   - Updated refreshInventory to fetch configs

### In Progress
- Adding tab navigation UI to App.jsx
- Wiring up tabs to show different content
- Updating terminology throughout

## Next Steps

1. Add main Tabs component to App.jsx (Configs | VMs | Users | Networks)
2. Create separate views for each tab:
   - Configs Tab: List VM definitions/templates
   - VMs Tab: List runtime VMs (current implementation)
   - Users Tab: User management (placeholder or existing)
   - Networks Tab: Network group management (placeholder or existing)

3. Update terminology:
   - "Save config" → "Save VM Template"
   - "Config file" → "VM Definition" (remove file references)
   - "Saved definition" → "VM Template"

4. Integrate VMStateDetail component
5. Add tests for new components
6. Update dialog labels for clarity

## Architecture

```
Configs Tab (Templates)         VMs Tab (Runtime)
├─ VM Definitions from DB    ├─ VMs with runtime state
├─ Actions: View, Edit        ├─ Actions: Start, Stop, View State
├─ Create new from template   ├─ Clone, Snapshot, Logs
└─ No running state           └─ Host-specific

VM State Detail Page
├─ Original Creation Config (read-only, labeled)
├─ Current Runtime State (may drift)
└─ Explanation of differences
```

## Key Changes

- **Separation**: Configs (templates) are distinct from VMs (runtime instances)
- **Clarity**: UI makes it obvious what's a template vs running VM
- **No Files**: All references to "config files" removed (service mode uses DB)
- **State Drift**: UI explains that runtime state can drift from original config
- **User-Friendly**: Clear labels, helper text, and better navigation
