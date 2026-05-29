#!/usr/bin/env node
/**
 * Copy the canonical static data files (the byte-exact, machine-maintained
 * source of truth at the repo root) into public/legacy/, where the React
 * DataProvider loads them at runtime. Runs automatically before `dev` and
 * `build` (predev/prebuild) so the served data never drifts from root —
 * including after the nightly ESPN record refresh rewrites data.js.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = join(ROOT, "public", "legacy");
const FILES = ["data.js", "photos.js", "schedule.js", "bracket.js"];

mkdirSync(DEST, { recursive: true });
for (const f of FILES) copyFileSync(join(ROOT, f), join(DEST, f));
console.log(`✓ synced ${FILES.length} data files → public/legacy/`);
