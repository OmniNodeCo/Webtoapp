import { readFile } from "node:fs/promises";
import { CONFIG_SCHEMA, type AppConfig, type BehaviorOptions, type ValidationIssue, type WindowOptions } from "./types.js";

const DEFAULT_WINDOW: WindowOptions = {
  width: 1280,
  height: 820,
  minWidth: 960,
  minHeight: 640,
};

const DEFAULT_BEHAVIOR: BehaviorOptions = {
  allowNavigation: [],
  openExternalLinks: true,
  showMenuBar: false,
};

export function deriveAppId(appName: string): string {
  const segment = appName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "website";
  return `com.webtoapp.${segment}`;
}

export function configFrom(input: Partial<AppConfig> = {}): AppConfig {
  const appName = typeof input.appName === "string" && input.appName.trim() ? input.appName.trim() : "My Website";
  const website = typeof input.website === "string" && input.website.trim() ? input.website.trim() : "https://example.com";
  const parsedWindow = input.window ?? {} as Partial<WindowOptions>;
  const parsedBehavior = input.behavior ?? {} as Partial<BehaviorOptions>;

  return {
    $schema: CONFIG_SCHEMA,
    appName,
    appId: typeof input.appId === "string" && input.appId.trim() ? input.appId.trim() : deriveAppId(appName),
    website,
    themeColor: typeof input.themeColor === "string" && input.themeColor.trim() ? input.themeColor.trim() : "#6D5DFB",
    window: {
      width: numberOr(parsedWindow.width, DEFAULT_WINDOW.width),
      height: numberOr(parsedWindow.height, DEFAULT_WINDOW.height),
      minWidth: numberOr(parsedWindow.minWidth, DEFAULT_WINDOW.minWidth),
      minHeight: numberOr(parsedWindow.minHeight, DEFAULT_WINDOW.minHeight),
    },
    behavior: {
      allowNavigation: Array.isArray(parsedBehavior.allowNavigation)
        ? parsedBehavior.allowNavigation.filter((host): host is string => typeof host === "string").map(normalizeHost).filter(Boolean)
        : [],
      openExternalLinks: typeof parsedBehavior.openExternalLinks === "boolean"
        ? parsedBehavior.openExternalLinks
        : DEFAULT_BEHAVIOR.openExternalLinks,
      showMenuBar: typeof parsedBehavior.showMenuBar === "boolean"
        ? parsedBehavior.showMenuBar
        : DEFAULT_BEHAVIOR.showMenuBar,
    },
  };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Convert a hostname or URL into a stable lowercase hostname. */
export function normalizeHost(value: string): string {
  const candidate = value.trim();
  if (!candidate) return "";
  try {
    return new URL(candidate.includes("://") ? candidate : `https://${candidate}`).hostname.toLowerCase();
  } catch {
    return candidate.toLowerCase().replace(/^\.+|\.+$/g, "");
  }
}

export function primaryHost(config: AppConfig): string {
  try {
    return new URL(config.website).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function navigationHosts(config: AppConfig): string[] {
  return [...new Set([primaryHost(config), ...config.behavior.allowNavigation.map(normalizeHost)].filter(Boolean))];
}

export function validateConfig(rawConfig: Partial<AppConfig>): ValidationIssue[] {
  const config = configFrom(rawConfig);
  const issues: ValidationIssue[] = [];

  if (!config.appName || config.appName.length > 80) {
    issues.push({ level: "error", path: "appName", message: "Use an app name between 1 and 80 characters." });
  }
  if (!/^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/i.test(config.appId)) {
    issues.push({ level: "error", path: "appId", message: "Use a reverse-domain app ID, such as com.example.portal." });
  }

  let target: URL | undefined;
  try {
    target = new URL(config.website);
  } catch {
    issues.push({ level: "error", path: "website", message: "Enter a complete website URL, including https://." });
  }
  if (target) {
    const local = target.hostname === "localhost" || target.hostname === "127.0.0.1" || target.hostname === "::1";
    if (target.protocol !== "https:" && !(local && target.protocol === "http:")) {
      issues.push({ level: "error", path: "website", message: "Use HTTPS. HTTP is only accepted for a local development server." });
    }
    if (target.username || target.password) {
      issues.push({ level: "error", path: "website", message: "Do not embed credentials in the website URL." });
    }
    if (target.protocol === "http:") {
      issues.push({ level: "warning", path: "website", message: "This local app uses HTTP. Do not ship it to users." });
    }
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(config.themeColor)) {
    issues.push({ level: "error", path: "themeColor", message: "Use a six-digit hex color, such as #6D5DFB." });
  }

  const { width, height, minWidth, minHeight } = config.window;
  for (const [key, value] of Object.entries({ width, height, minWidth, minHeight })) {
    if (!Number.isInteger(value) || value < 320 || value > 7680) {
      issues.push({ level: "error", path: `window.${key}`, message: "Window sizes must be whole numbers between 320 and 7680." });
    }
  }
  if (minWidth > width || minHeight > height) {
    issues.push({ level: "error", path: "window", message: "Minimum window size cannot be larger than the initial window size." });
  }

  for (const host of config.behavior.allowNavigation) {
    if (!isHost(host)) {
      issues.push({ level: "error", path: "behavior.allowNavigation", message: `“${host}” is not a valid hostname.` });
    }
  }
  if (target && !config.behavior.allowNavigation.includes(target.hostname)) {
    issues.push({ level: "warning", path: "behavior.allowNavigation", message: "The website host will be added to the navigation allow-list automatically." });
  }
  return issues;
}

function isHost(value: string): boolean {
  return value === "localhost" || /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value) || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value);
}

export function assertValidConfig(rawConfig: Partial<AppConfig>): AppConfig {
  const config = configFrom(rawConfig);
  const errors = validateConfig(config).filter((issue) => issue.level === "error");
  if (errors.length) {
    throw new Error(errors.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
  }
  return config;
}

export async function loadConfig(filePath: string): Promise<AppConfig> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read configuration at ${filePath}: ${message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Configuration must be a JSON object.");
  }
  return assertValidConfig(parsed as Partial<AppConfig>);
}
