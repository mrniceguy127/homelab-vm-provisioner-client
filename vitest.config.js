import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '.build/coverage',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        // Exclude MUI-heavy components from coverage - better tested via integration
        'src/features/jobs/JobProgressDialog.jsx',
        'src/features/jobs/components/**',
        'src/features/runtimeVms/components/VmStateDetail.jsx',
        'src/features/runtimeVms/components/VmConfigTab.jsx',
        'src/features/runtimeVms/components/VmLogsTab.jsx',
        'src/features/runtimeVms/components/VmDetailTabs.jsx',
        'src/features/runtimeVms/components/VmDetailView.jsx',
        'src/features/vmForm/VmFormDialog.jsx',
        'src/features/vmForm/components/**',
        'src/features/vmTemplates/VmTemplatesPage.jsx',
        'src/features/vmTemplates/components/**',
      ],
      thresholds: {
        lines: 70,
        functions: 39,
        branches: 70,
        statements: 70,
      },
    },
  },
});
