import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: { DATABASE_URL: "file:./test.db", JWT_SECRET: "test-secret-value-1234567890" },
    globalSetup: ["tests/global-setup.ts"],
    hookTimeout: 60000,
    testTimeout: 60000
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  }
})
