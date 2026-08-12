import assert from "node:assert/strict";
import test from "node:test";
import { assertValidConfig, configFrom, navigationHosts, validateConfig } from "../core/index.js";

test("normalizes navigation hosts and automatically includes the target", () => {
  const config = configFrom({
    appName: "Acme Portal",
    appId: "com.acme.portal",
    website: "https://Portal.Acme.test/dashboard",
    behavior: { allowNavigation: ["auth.acme.test", "https://PORTAL.acme.test"], openExternalLinks: true, showMenuBar: false },
  });

  assert.deepEqual(navigationHosts(config), ["portal.acme.test", "auth.acme.test"]);
  assert.equal(validateConfig(config).filter((issue) => issue.level === "error").length, 0);
});

test("rejects remote HTTP targets and insecure configuration", () => {
  const issues = validateConfig({
    appName: "Insecure",
    appId: "com.example.insecure",
    website: "http://example.com",
    themeColor: "blue",
  });

  assert.deepEqual(issues.filter((issue) => issue.level === "error").map((issue) => issue.path), ["website", "themeColor"]);
  assert.throws(() => assertValidConfig({
    appName: "Insecure",
    appId: "com.example.insecure",
    website: "http://example.com",
  }), /Use HTTPS/);
});

test("allows an HTTP localhost target for development", () => {
  const config = assertValidConfig({
    appName: "Local Preview",
    appId: "com.example.local-preview",
    website: "http://localhost:5173",
  });
  const issues = validateConfig(config);

  assert.equal(issues.some((issue) => issue.level === "error"), false);
  assert.equal(issues.some((issue) => issue.level === "warning" && issue.path === "website"), true);
});
