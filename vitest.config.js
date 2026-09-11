import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for the Dawn theme carousel tests.
 *
 * The default environment is `node` because the pure decision logic
 * (`resolveSlideRender`) has no DOM dependency. DOM-dependent tests
 * (e.g. the `getMedia` property test in task 7.x and the integration
 * tests in task 9.x) opt into JSDOM per-file with the docblock:
 *
 *   // @vitest-environment jsdom
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js', 'assets/**/*.test.js'],
  },
});
