import { spawn } from 'node:child_process';
import { constants, promises as fs } from 'node:fs';
import { BrowserWindow, dialog, ipcMain as ipc, shell } from 'electron';
import type { FileFilter, FlashResponse } from '../common/host';
import { compile, findDfuPath, listCachedFirmware } from './firmware';

function flash(sender: Electron.WebContents, dfuPath: string, binPath: string): Promise<FlashResponse> {
  return new Promise((resolve) => {
    const child = spawn(dfuPath, ['-D', binPath]);
    const forward = (data: Buffer) => sender.send('flash-output', data.toString());
    let notFound = false;
    child.stdout.on('data', forward);
    child.stderr.on('data', forward);
    child.once('error', (error: NodeJS.ErrnoException) => {
      notFound = error.code === 'ENOENT';
    });
    child.once('close', (code) => resolve({ code: code ?? 1, notFound }));
  });
}

export function registerHostHandlers(): void {
  ipc.handle('open-external', (_, url: string) => {
    if (!/^https?:\/\//.test(url)) throw new Error('Only web links can be opened');
    return shell.openExternal(url);
  });
  ipc.handle('open-file-dialog', async (event, title: string, filters: FileFilter[]) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return [];
    const result = await dialog.showOpenDialog(window, { title, filters, properties: ['openFile'] });
    return result.canceled ? [] : result.filePaths;
  });
  ipc.handle('file-exists', (_, path: string) =>
    fs.access(path, constants.F_OK).then(
      () => true,
      () => false
    )
  );
  ipc.handle('read-text-file', (_, path: string) => fs.readFile(path, 'utf8'));
  ipc.handle('find-dfu-path', () => findDfuPath());
  ipc.handle('list-cached-firmware', () => listCachedFirmware());
  ipc.handle('compile', (_, config: unknown, variant: string) => compile(config, variant));
  ipc.handle('flash', (event, dfuPath: string, binPath: string) => flash(event.sender, dfuPath, binPath));
}
