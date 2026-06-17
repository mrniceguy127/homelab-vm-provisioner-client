# Homelab VM Provisioner Client

React + Vite frontend for VM management with Material-UI.

## Quick Start

```bash
npm test && npm run test:e2e  # Lint + unit + E2E tests
npm run lint                   # ESLint only  
npm run dev                   # Start dev server
npm run coverage              # Lint + generate coverage report
npm run docs:build            # Build JSDoc docs
```

## Project Structure

```
src/
├── App.jsx         # Main application component
├── main.jsx        # App entry point
├── api.js          # API client
├── theme.js        # Material-UI theme
└── styles.css      # Global styles

test/
├── App.test.jsx    # Component tests
├── api.test.js     # API client tests
└── setup.js        # Test configuration

tests/e2e/
└── app.spec.js     # Playwright E2E tests
```

## Code Style

**Framework**: React 18 + Vite  
**UI Library**: Material-UI (MUI)  
**Testing**: vitest + @testing-library/react + Playwright  
**Styling**: Emotion (via MUI)  
**Linting**: ESLint with React plugins (required before tests run)  
**Docs**: JSDoc

**Key Patterns**:
- Wrap components in ThemeProvider for testing
- Use `screen.getByRole()` for queries
- Mock `api.js` calls with `vi.mock`
- Playwright for complete user workflows

## AI Agents

Project-specific OpenCode agents live in `.opencode/agents/`.

### Usage

```bash
# Direct invocation (recommended)
@.opencode/agents/test-writer.md Write tests for App.jsx
@.opencode/agents/coverage-runner.md Check coverage
```

### Available Agents

- **test-writer.md** - React + Playwright patterns
- **coverage-runner.md** - vitest coverage
- **feature-developer.md** - React + MUI patterns
- **defect-fixer.md** - React debugging
- **doc-writer.md** - Component docs

## Testing Essentials

**Unit Tests**: vitest + @testing-library/react  
**E2E Tests**: Playwright  
**Theme**: Always wrap in ThemeProvider  
**Queries**: Use accessibility queries (getByRole, getByLabelText)

**Pattern Discovery**: Before writing tests, inspect nearby existing tests and follow their style.

## Documentation Sources

Generated client docs and source component comments are the source of truth for detailed component and API-client behavior.

Before editing client docs or user-facing behavior:
- Inspect the client project's docs configuration and existing comments.
- Follow the repo's existing documentation layout.
- Update source docs/comments rather than only generated output.
- Run `npm run docs:build` to build JSDoc documentation.
- Do not duplicate full generated documentation in `AGENTS.md`.

## Common Issues

- State mutation (use setState correctly)
- Missing useEffect dependencies
- Event handler scope issues
- Missing ThemeProvider in tests
- API mock configuration
