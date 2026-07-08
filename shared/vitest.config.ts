import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      reportOnFailure: true,
      // Business-logic units only. UI/glue, data definitions, and type-only
      // modules are excluded so the % reflects logic actually worth unit-testing.
      include: [
        'actions/**/*.ts',
        'services/**/*.ts',
        'characters/**/*.ts',
        'game-helper.ts',
        'common-methods.ts',
        'i18n/**/*.ts',
      ],
      exclude: [
        '**/*.d.ts',
        'actions/index.ts',        // barrel re-export, no logic
        'actions/input-types.ts',  // type-only declarations
        'i18n/messages.ts',        // pure translation dictionary (data, not logic)
        'tutorial/**',
      ],
      // Reported only — no CI gate. Target is 80% lines/functions/statements;
      // the number is surfaced in the report, the build never fails on it.
    },
  },
});
