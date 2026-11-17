import { defineConfig } from 'vitest/config';

// Tests run in Node by default. A test file that needs a DOM opts in with a `// @vitest-environment happy-dom` comment.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
