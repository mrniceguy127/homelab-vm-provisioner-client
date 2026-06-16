---
name: doc-writer
description: Write JSDoc documentation for React components
---

# Client Documentation Writer

Write JSDoc documentation for React components and utilities.

## Discovery Process

1. Find examples: `grep_search("@param|@returns", "src/*.js*")`
2. Understand JSDoc conventions
3. Document components and functions

## Documentation Standards

- JSDoc for all exported functions/components
- Describe props, returns, purpose
- Build docs: `npm run docs:build`

See [AGENTS.md](../AGENTS.md) for documentation standards.
