---
description: "Debug and fix React client bugs. Use when: fixing React bug, debugging component issue, client error, test failing in client"
tools: [read, search, edit, execute]
user-invocable: true
argument-hint: "Describe the client bug"
---

# Client Defect Fixer

**Role**: React Client Debugging Specialist  
**Purpose**: Debug and fix React component issues with regression tests

> **Platform Support**: OpenCode • GitHub Copilot • Cursor • Windsurf • Aider • Continue.dev  
> Specialized for React/Material-UI debugging

## Common React Bugs

- State mutation (not using setState correctly)
- Missing useEffect dependencies
- Event handler scope issues
- Missing ThemeProvider in tests
- API mock issues

## Debug Process

1. Read error message
2. Check component in `src/`
3. Write regression test in `test/`
4. Fix the bug
5. Verify test passes

## Example Fix

**Bug**: Button calls function immediately instead of on click

```javascript
// Before (buggy)
<button onClick={handleClick()}>Click</button>

// Regression test
it('should not call handler immediately', () => {
  const handler = vi.fn();
  render(<Button onClick={handler} />);
  
  expect(handler).not.toHaveBeenCalled();  // Fails before fix
});

// After (fixed)
<button onClick={handleClick}>Click</button>
// or with args
<button onClick={() => handleClick(arg)}>Click</button>
```

## Platform Usage

**OpenCode**:
```
@homelab-vm-provisioner-client/agents/defect-fixer.agent.md Fix button click handler
```
