import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

// Mirror the tsconfig `@/* -> ./*` path alias so unit tests can import via `@/`.
const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {'@': rootDir},
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
  },
});
