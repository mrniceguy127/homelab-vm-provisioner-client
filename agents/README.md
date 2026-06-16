# Client Specialist Agents

Specialized agents for the React frontend project (`homelab-vm-provisioner-client`).

## Available Agents

| Agent | Purpose | Testing Framework |
|-------|---------|-------------------|
| test-writer | Write React component tests | vitest, @testing-library/react, Playwright |
| coverage-runner | Analyze client coverage | vitest coverage |
| feature-developer | Implement UI components | React, Material-UI |
| defect-fixer | Debug React issues | React DevTools |
| doc-writer | Document components | JSDoc |

## Project Context

- **Framework**: React + Vite
- **UI Library**: Material-UI (MUI)
- **Testing**: vitest + @testing-library/react + Playwright
- **Styling**: Emotion (via MUI)
- **Documentation**: JSDoc + documentation.js

## Usage

> **Platform Support**: OpenCode • GitHub Copilot • Cursor • Windsurf • Aider • Continue.dev

**OpenCode**:
```
@homelab-vm-provisioner-client/agents/test-writer.agent.md Write tests for VMForm
```

**GitHub Copilot**:
```
@test-writer Write tests for VMForm component
# (when in client directory)
```

**Aider**:
```bash
cd homelab-vm-provisioner-client
aider --read agents/test-writer.agent.md src/App.jsx
```

## When to Use

Use these specialist agents when working specifically on the React client. For cross-project work, use the orchestrator agents in the root `agents/` directory.
