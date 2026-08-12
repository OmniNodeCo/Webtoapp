#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { assertValidConfig, configFrom, deriveAppId, loadConfig, navigationHosts, validateConfig, writeGeneratedProject } from "../core/index.js";
import type { AppConfig, ValidationIssue } from "../core/index.js";

export interface CliIO {
  log(message: string): void;
  error(message: string): void;
}

const stdoutIO: CliIO = {
  log: (message) => console.log(message),
  error: (message) => console.error(message),
};

const HELP = `
Webtoapp Studio — turn a trusted website into a desktop app

Usage:
  webtoapp init [directory] [--name NAME] [--url URL] [--id APP_ID]
  webtoapp validate [config]
  webtoapp inspect [config]
  webtoapp build [config] [--output directory] [--force]
  webtoapp doctor [config]

Examples:
  webtoapp init ./acme --name "Acme Portal" --url https://portal.acme.test
  webtoapp build ./acme/webtoapp.config.json --output ./acme/desktop

Run without a command to launch the visual Studio: npm run gui
`.trim();

interface ParsedArgs {
  positionals: string[];
  options: Record<string, string | boolean>;
}

function parseArgs(args: string[]): ParsedArgs {
  const positionals: string[] = [];
  const options: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const [key, inline] = token.slice(2).split("=", 2);
    if (inline !== undefined) {
      options[key] = inline;
      continue;
    }
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      i += 1;
    } else {
      options[key] = true;
    }
  }
  return { positionals, options };
}

function optionString(options: Record<string, string | boolean>, key: string): string | undefined {
  const value = options[key];
  return typeof value === "string" ? value : undefined;
}

function configPath(value: string | undefined): string {
  return path.resolve(value ?? "webtoapp.config.json");
}

function formatIssues(issues: ValidationIssue[]): string {
  return issues.map((issue) => `${issue.level === "error" ? "✗" : "!"} ${issue.path}: ${issue.message}`).join("\n");
}

export async function runCli(argv: string[], io: CliIO = stdoutIO): Promise<number> {
  const [command = "help", ...rest] = argv;
  const { positionals, options } = parseArgs(rest);

  try {
    switch (command) {
      case "help":
      case "--help":
      case "-h":
        io.log(HELP);
        return 0;
      case "init":
        return await init(positionals[0], options, io);
      case "validate":
        return await validate(positionals[0], io);
      case "inspect":
        return await inspect(positionals[0], io);
      case "build":
        return await build(positionals[0], options, io);
      case "doctor":
        return await doctor(positionals[0], io);
      default:
        io.error(`Unknown command: ${command}\n\n${HELP}`);
        return 2;
    }
  } catch (error) {
    io.error(`Webtoapp failed: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

async function init(directoryArg: string | undefined, options: Record<string, string | boolean>, io: CliIO): Promise<number> {
  const directory = path.resolve(directoryArg ?? ".");
  const name = (optionString(options, "name") ?? path.basename(directory).replace(/[-_]+/g, " ")) || "My Website";
  const website = optionString(options, "url") ?? "https://example.com";
  const config = assertValidConfig(configFrom({
    appName: name,
    appId: optionString(options, "id") ?? deriveAppId(name),
    website,
  }));
  await mkdir(directory, { recursive: true });
  const destination = path.join(directory, "webtoapp.config.json");
  await writeFile(destination, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  io.log(`Created ${destination}`);
  io.log("Next: webtoapp validate webtoapp.config.json && webtoapp build webtoapp.config.json");
  return 0;
}

async function validate(configArg: string | undefined, io: CliIO): Promise<number> {
  const target = configPath(configArg);
  const config = await loadConfig(target);
  const issues = validateConfig(config);
  const errors = issues.filter((issue) => issue.level === "error");
  if (issues.length) io.log(formatIssues(issues));
  if (errors.length) return 1;
  io.log(`✓ ${target} is valid`);
  return 0;
}

async function inspect(configArg: string | undefined, io: CliIO): Promise<number> {
  const target = configPath(configArg);
  const config = await loadConfig(target);
  io.log(JSON.stringify({
    config: target,
    app: config.appName,
    appId: config.appId,
    website: config.website,
    navigationHosts: navigationHosts(config),
    security: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      externalLinks: config.behavior.openExternalLinks,
    },
  }, null, 2));
  return 0;
}

async function build(configArg: string | undefined, options: Record<string, string | boolean>, io: CliIO): Promise<number> {
  const configFile = configPath(configArg);
  const config = await loadConfig(configFile);
  const output = path.resolve(optionString(options, "output") ?? "webtoapp-output");
  const result = await writeGeneratedProject(config, output, { force: options.force === true });
  io.log(`✓ Created ${result.files.length} files in ${result.outputDirectory}`);
  io.log(`  cd ${result.outputDirectory} && npm install && npm start`);
  return 0;
}

async function doctor(configArg: string | undefined, io: CliIO): Promise<number> {
  const target = configPath(configArg);
  const config = await loadConfig(target);
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  const lines = [
    `${major >= 20 ? "✓" : "✗"} Node.js ${process.versions.node}${major >= 20 ? " (supported)" : " (Node 20+ is required)"}`,
    `✓ Target: ${config.website}`,
    `✓ Navigation allow-list: ${navigationHosts(config).join(", ")}`,
    "✓ Generated apps use context isolation, sandboxing, and disabled Node integration.",
  ];
  io.log(lines.join("\n"));
  return major >= 20 ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
