import { defineConfig } from 'vitest/config';

// 纯逻辑引擎测试 — node 环境，无需 DOM/React
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.{js,jsx}', 'src/**/*.test.{js,jsx}'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/utils/**/*.js'],
      exclude: ['src/utils/**/__tests__/**']
    }
  }
});
