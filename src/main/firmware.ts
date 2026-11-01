import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants, promises as fs } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import log from 'loglevel';
import kiraDefault from '../../layouts/Kira-Standard.default.json';
import type { FirmwareResult } from '../common/firmware';
import type { CompileResponse } from '../common/host';
import { generateKll, type Layout } from '../common/kll';

const BIN_FILE = 'kiibohd.dfu.bin';
const LOG_FILE = 'build.log';
const projectRoot = () => process.env.KIRA_ROOT ?? app.getAppPath();
const cacheDir = () => join(app.getPath('userData'), 'firmware-cache');

async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Copies layouts built by the original Kiibohd app. Never changes the originals. */
export async function importLegacyFirmwareCache(): Promise<void> {
  const legacy = join(app.getPath('appData'), 'kiibohd-configurator', 'firmware-cache');
  if (!(await exists(legacy))) return;

  await fs.mkdir(cacheDir(), { recursive: true });
  for (const entry of await fs.readdir(legacy)) {
    const target = join(cacheDir(), entry);
    if (!(await exists(target))) {
      await fs.cp(join(legacy, entry), target, { recursive: true, preserveTimestamps: true });
    }
  }
}

export async function listCachedFirmware(): Promise<FirmwareResult[]> {
  if (!(await exists(cacheDir()))) return [];

  const results: FirmwareResult[] = [];
  for (const entry of await fs.readdir(cacheDir())) {
    const match = /^([^_]+)_(.+)_([0-9a-f]+)$/i.exec(entry);
    if (!match) continue;
    const [, board, layout, hash] = match;
    const dir = join(cacheDir(), entry);
    const bin = join(dir, BIN_FILE);
    const json = join(dir, `${board}-${layout}.json`);
    if (!(await exists(bin)) || !(await exists(json))) continue;

    results.push({
      type: 'single',
      board,
      variant: 'Standard',
      layout,
      hash,
      isError: false,
      bin,
      json,
      log: join(dir, LOG_FILE),
      time: (await fs.stat(bin)).mtimeMs,
    });
  }
  return results.sort((a, b) => a.time - b.time);
}

function runBuild(script: string, args: string[], logPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    fs.open(logPath, 'w').then((handle) => {
      const child = spawn(script, args, { stdio: ['ignore', handle.fd, handle.fd] });
      child.once('error', (error) => handle.close().finally(() => reject(error)));
      child.once('close', (code) => handle.close().finally(() => resolve(code ?? 1)));
    }, reject);
  });
}

export async function compile(rawConfig: unknown, variant: string): Promise<CompileResponse> {
  const config = rawConfig as Layout;
  const { Name: board, Layout: layout } = config?.header ?? {};
  if (board !== 'Kira') {
    return { success: false, error: `Only the Kira can be compiled, not "${board}"` };
  }

  // A fixed path, because the firmware embeds its build paths. The UI runs one compile at a time.
  const buildDir = join(app.getPath('temp'), 'kira-build');
  await fs.rm(buildDir, { recursive: true, force: true });
  await fs.mkdir(buildDir, { recursive: true });

  try {
    const files = generateKll(config, (kiraDefault as unknown as Layout).matrix);
    const hasher = createHash('md5');
    for (const [name, content] of files) {
      await fs.writeFile(join(buildDir, name), content);
      hasher.update(content);
    }
    const hash = hasher.digest('hex').slice(0, 16);

    const logPath = join(buildDir, LOG_FILE);
    const script = join(projectRoot(), 'tools', 'compile-firmware.sh');
    const layers = [...files.keys()].map((name) => name.replace(/\.kll$/, ''));
    const code = await runBuild(script, [buildDir, ...layers], logPath);
    const buildLog = await fs.readFile(logPath, 'utf8');

    if (code !== 0) {
      return { success: false, error: 'Compilation Failed', log: buildLog };
    }

    const outDir = join(cacheDir(), `${board}_${layout}_${hash}`);
    await fs.mkdir(outDir, { recursive: true });
    const bin = join(outDir, BIN_FILE);
    const json = join(outDir, `${board}-${layout}.json`);
    const logCopy = join(outDir, LOG_FILE);
    await fs.copyFile(join(buildDir, BIN_FILE), bin);
    await fs.copyFile(logPath, logCopy);
    await fs.writeFile(json, JSON.stringify(config, null, 2));

    return {
      success: true,
      firmware: {
        type: 'single',
        board,
        variant,
        layout,
        hash,
        isError: false,
        bin,
        json,
        log: logCopy,
        time: Date.now(),
      },
    };
  } catch (error) {
    log.error('Compile failed', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    await fs.rm(buildDir, { recursive: true, force: true });
  }
}

export async function findDfuPath(): Promise<string> {
  const bundled = join(projectRoot(), '.toolchain', 'bin', 'dfu-util');
  return (await exists(bundled)) ? bundled : '';
}
