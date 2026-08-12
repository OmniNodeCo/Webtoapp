export const CONFIG_SCHEMA = "https://webtoapp.dev/schema/v1";

export interface WindowOptions {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
}

export interface BehaviorOptions {
  /** Hosts the app is allowed to navigate inside its window. */
  allowNavigation: string[];
  /** Open links outside the navigation allow-list in the system browser. */
  openExternalLinks: boolean;
  showMenuBar: boolean;
}

export interface AppConfig {
  $schema: string;
  appName: string;
  appId: string;
  website: string;
  themeColor: string;
  window: WindowOptions;
  behavior: BehaviorOptions;
}

export type ValidationLevel = "error" | "warning";

export interface ValidationIssue {
  level: ValidationLevel;
  path: string;
  message: string;
}

export interface BuildResult {
  outputDirectory: string;
  files: string[];
}
