import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const source = path.resolve("src/gui/renderer");
const destination = path.resolve("dist/gui/renderer");
await rm(destination, { recursive: true, force: true });
await mkdir(path.dirname(destination), { recursive: true });
await cp(source, destination, { recursive: true });
