import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const rendererSource = path.resolve("src/gui/renderer");
const rendererDestination = path.resolve("dist/gui/renderer");
const preloadSource = path.resolve("src/gui/preload.cjs");
const preloadDestination = path.resolve("dist/gui/preload.cjs");

await rm(rendererDestination, { recursive: true, force: true });
await mkdir(path.dirname(rendererDestination), { recursive: true });
await cp(rendererSource, rendererDestination, { recursive: true });
await cp(preloadSource, preloadDestination);
