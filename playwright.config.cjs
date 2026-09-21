const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 45000,
  workers: 2,
  use: { baseURL: "http://localhost:4173/planetarium_op/", trace: "retain-on-failure" },
  webServer: {
    command: "node scripts/serve.cjs",
    url: "http://localhost:4173/planetarium_op/",
    reuseExistingServer: false
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "android", use: { ...devices["Pixel 7"] } },
    { name: "iphone", use: { ...devices["iPhone 13"] } },
    { name: "ipad", use: { ...devices["iPad Mini"] } }
  ]
});
