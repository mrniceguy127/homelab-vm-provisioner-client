# Homelab VM Provisioner Client

React SPA for managing homelab VMs with Material-UI components and Vite build tooling.

## Architecture

### Core Components
- **App.jsx**: Main application layout, routing, API communication
- **api.js**: Fetch-based API client for backend communication
- **theme.js**: Material-UI theme customization
- **main.jsx**: React app initialization and mounting

### UI Structure
- VM creation form with network configuration
- VM list view with status indicators
- Configuration management interface
- Error handling and loading states

## Build and Test

### Commands
```bash
npm run dev       # Start Vite dev server (port 5173)
npm run build     # Production build (includes coverage + docs)
npm run build:app # Build app only (no coverage/docs)
npm run preview   # Preview production build
npm test          # Run unit tests (vitest + @testing-library/react)
npm run test:e2e  # Run Playwright end-to-end tests
npm run coverage  # Generate coverage report
npm run docs:build # Build JSDoc documentation
```

### Test Files
- `test/App.test.jsx`: Component integration tests
- `test/api.test.js`: API client tests
- `test/app-helpers.test.jsx`: Utility function tests
- `tests/e2e/app.spec.js`: Playwright end-to-end tests

### Development Server
```bash
npm run dev
# Access at http://localhost:5173
# Hot module replacement enabled
```

## Code Style

### React
- Functional components with hooks
- PropTypes or JSDoc for component props
- Destructure props in function signature
- Use Material-UI components, avoid custom CSS when possible

### JavaScript
- ES modules (`import`/`export`)
- Async/await for API calls
- Named exports (no default exports)

### Styling
- Material-UI `sx` prop for inline styles
- Emotion for complex styling needs
- Theme variables from `theme.js`

## Testing Conventions

### Unit Tests (Vitest + @testing-library/react)

#### Setup
```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../src/theme.js';

// Wrap components in theme provider
const renderWithTheme = (component) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};
```

#### What to Test
- **User interactions**: Button clicks, form inputs, navigation
- **API integration**: Fetch calls, loading states, error handling
- **Component rendering**: Conditional display, prop changes
- **Form validation**: Input validation, error messages

#### Test Structure
```javascript
describe('VMCreationForm', () => {
  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    renderWithTheme(<VMCreationForm />);
    
    await user.type(screen.getByLabelText('VM Name'), 'test-vm');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    
    await waitFor(() => {
      expect(screen.getByText('VM created successfully')).toBeInTheDocument();
    });
  });
});
```

### E2E Tests (Playwright)

#### What to Test
- **Complete user workflows**: VM creation from start to finish
- **Navigation**: Multi-step processes, page transitions
- **Error scenarios**: API failures, validation errors
- **Real backend interaction**: Test against running API

#### Test Structure
```javascript
import { test, expect } from '@playwright/test';

test('create VM workflow', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  await page.fill('[data-testid="vm-name"]', 'test-vm');
  await page.click('button:has-text("Create VM")');
  
  await expect(page.locator('.success-message')).toBeVisible();
});
```

### Coverage
- Target branch and line coverage
- Mock API calls in unit tests
- Use Playwright for integration coverage

## Documentation

### Component Documentation
```javascript
/**
 * Form for creating new VMs with network configuration.
 * @param {Object} props
 * @param {Function} props.onSubmit - Callback when form is submitted
 * @param {boolean} props.loading - Whether submission is in progress
 * @returns {JSX.Element}
 */
export function VMCreationForm({ onSubmit, loading }) {
  // ...
}
```

### Build Documentation
```bash
npm run docs:build
# Output: docs/_build/html/index.html
```

### What to Document
- Component props and callbacks
- Complex state management logic
- API client functions
- Utility helpers

## Common Patterns

### API Calls
```javascript
import { provisionVM, getConfig } from './api.js';

// Always handle loading and error states
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const handleSubmit = async (data) => {
  setLoading(true);
  setError(null);
  try {
    const result = await provisionVM(data);
    // Handle success
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Form Handling
```javascript
// Use controlled components
const [formData, setFormData] = useState({ name: '', template: '' });

const handleChange = (field) => (event) => {
  setFormData(prev => ({ ...prev, [field]: event.target.value }));
};

<TextField
  label="VM Name"
  value={formData.name}
  onChange={handleChange('name')}
/>
```

### Error Display
```javascript
import { Alert, Snackbar } from '@mui/material';

<Snackbar open={!!error} onClose={() => setError(null)}>
  <Alert severity="error" onClose={() => setError(null)}>
    {error}
  </Alert>
</Snackbar>
```

## Key Gotchas

### Material-UI
- All components must be wrapped in ThemeProvider
- Use theme variables for colors, not hardcoded values
- `sx` prop uses theme spacing: `sx={{ mt: 2 }}` = 16px

### Testing
- Vitest needs jsdom environment (configured in vitest.config.js)
- Always wrap components in ThemeProvider for tests
- Use `waitFor` for async assertions
- Mock API calls with `vi.mock('./api.js')`

### Vite
- Import paths must include file extensions for local modules
- Public assets go in `public/` directory
- Environment variables must start with `VITE_`

### React Testing Library
- Query by accessible roles, not test IDs when possible
- Use `screen` instead of destructuring `render` result
- Prefer `userEvent` over `fireEvent` for interactions

### Playwright
- Tests run against built app, not dev server (configure baseURL)
- Use data-testid attributes for stable selectors
- Always wait for navigation/API responses

## Dependencies

### Production
- **react**: UI library
- **react-dom**: React rendering
- **@mui/material**: Material-UI components
- **@mui/icons-material**: Material-UI icons
- **@emotion/react**: Styling library
- **@emotion/styled**: Styled components

### Development
- **vite**: Build tool and dev server
- **@vitejs/plugin-react**: React support for Vite
- **vitest**: Test runner
- **@testing-library/react**: React component testing
- **@testing-library/user-event**: User interaction simulation
- **jsdom**: DOM implementation for tests
- **@playwright/test**: End-to-end testing
- **@vitest/coverage-v8**: Code coverage
- **documentation**: JSDoc HTML generator

## Development Workflow

1. **Create component**: Start with JSX structure, Material-UI components
2. **Write tests**: Test user interactions and rendering
3. **Implement logic**: Add state management, API calls, validation
4. **Style**: Use theme.js variables, `sx` prop for spacing
5. **Run unit tests**: `npm test` with coverage check
6. **E2E test**: `npm run test:e2e` for full workflow
7. **Update docs**: Add JSDoc comments, run `npm run docs:build`
8. **Integration**: Test with running API server

## Specialized Agents

For common tasks, use the specialized agents in `../agents/`:
- **test-writer**: Generate React component tests
- **coverage-runner**: Analyze test coverage
- **feature-developer**: Implement UI features
- **defect-fixer**: Debug React issues
- **doc-writer**: Document components

See `../agents/README.md` for usage across different platforms.

## Related Documentation

- Parent: `../AGENTS.md` (monorepo overview)
- API: `../homelab-vm-provisioner-api/AGENTS.md`
- Python CLI: `../homelab-vm-provisioner-api/homelab-vm-provisioner/AGENTS.md`
