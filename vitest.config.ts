import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.{test,spec}.{ts,tsx}", "shared/**/*.{test,spec}.{ts,tsx}"],
    globals: true,
    env: {
      DATABASE_URL: "mysql://dentcare:dentcare123@localhost:3306/dentcare",
      JWT_SECRET: "test-jwt-secret-for-vitest-at-least-32-chars",
      NODE_ENV: "development",
      ENCRYPTION_KEY: "test-encryption-key-for-vitest-32chars",
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
      "@drizzle": path.resolve(__dirname, "drizzle"),
    },
  },
});
