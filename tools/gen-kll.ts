#!/usr/bin/env node
// Usage: node tools/gen-kll.ts <user-config.json> <default-layout.json> <outdir>
// Prints the generated filenames, in layer order, one per line.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateKll, type Layout } from '../src/common/kll.ts';

const [configPath, defaultPath, outdir] = process.argv.slice(2);
if (!configPath || !defaultPath || !outdir) {
  console.error('usage: gen-kll.ts <user-config.json> <default-layout.json> <outdir>');
  process.exit(2);
}
const config: Layout = JSON.parse(readFileSync(configPath, 'utf8'));
const defaults: Layout = JSON.parse(readFileSync(defaultPath, 'utf8'));
mkdirSync(outdir, { recursive: true });
for (const [name, content] of generateKll(config, defaults.matrix)) {
  writeFileSync(join(outdir, name), content);
  console.log(name);
}
