import { defineConfig, devices } from "@playwright/test";

process.env.REVIEW_TOKEN_SECRET ??= "playwright-review-token-secret";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["e2e/**/*.spec.ts", "performance/**/*.spec.ts"],
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "npm run dev -- --port 3100",
    env: {
      ...process.env,
      REVIEW_TOKEN_SECRET: process.env.REVIEW_TOKEN_SECRET
    },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000
  }
});
