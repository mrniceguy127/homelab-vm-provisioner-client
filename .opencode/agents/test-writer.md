---
name: test-writer
description: Write React component tests with vitest + @testing-library
---

# Client Test Writer

Write React component and E2E tests following project patterns.

## Discovery Process

1. Find test patterns: `grep_search("renderWithTheme|ThemeProvider", "test/*.test.jsx")`
2. Read 2-3 test files to understand structure
3. Apply patterns to new components

## Key Constraints

- Framework: vitest + @testing-library/react
- E2E: Playwright (`tests/e2e/*.spec.js`)
- ThemeProvider: Wrap all Material-UI components
- Location: `test/<component>.test.jsx`

## Patterns to Discover

- `renderWithTheme` helper usage
- `userEvent` for interactions
- `screen.getByRole()` queries
- Mock `api.js` with `vi.mock()`

See [AGENTS.md](../AGENTS.md) for React testing conventions.
