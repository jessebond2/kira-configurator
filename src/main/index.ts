import { app, BrowserWindow, ipcMain as ipc } from 'electron';
import * as path from 'path';
import { registerHostHandlers } from './host';
import { importLegacyFirmwareCache } from './firmware';
import * as usb from './usb';
import { isKnownDevice, getDevice } from '../common/device/keyboard';
import { identifyKeyboard } from './keyboard';
import { buildMenu } from './menu';
import Bluebird from 'bluebird';
import log from 'loglevel';
import { Device, AttachedKeyboard } from '../common/device/types';

const isDevelopment = process.env.NODE_ENV === 'development';
log.setDefaultLevel(isDevelopment ? log.levels.INFO : log.levels.ERROR);

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow: BrowserWindow | null;

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: isDevelopment ? 2300 : 1800,
    height: 1100,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    window.webContents.openDevTools();
    window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  window.on('closed', () => {
    mainWindow = null;
  });

  window.webContents.on('devtools-opened', () => {
    window.focus();
    setImmediate(() => {
      window.focus();
    });
  });

  buildMenu();

  return window;
}

// quit application when all windows are closed
app.on('window-all-closed', () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  // if (process.platform !== 'darwin') {
  app.quit();
  // }
});

app.on('activate', () => {
  // on macOS it is common to re-create a window even after all windows have been closed
  if (mainWindow === null) {
    mainWindow = createMainWindow();
  }
});

// create main BrowserWindow when electron is ready
app.on('ready', async () => {
  registerHostHandlers();
  await importLegacyFirmwareCache().catch((e) => log.error('Could not import old layouts', e));
  mainWindow = createMainWindow();
});

async function getKeyboardDetails(device: Device): Promise<Optional<AttachedKeyboard>> {
  try {
    // TODO: Remove when we weed out all the nulls
    const keyboard = identifyKeyboard(device) ?? undefined;
    const known = getDevice(device);

    if (!keyboard) {
      return;
    }

    return { ...device, keyboard, known };
  } catch (e) {
    log.error(`Error while retrieving keyboard details: ${e}`);
    return;
  }
}

const watches = new Map();
ipc.on('usb-watch', async (event) => {
  const id = event.sender.id;

  const attached = await Bluebird.mapSeries((await usb.getAttachedDevices()).filter(isKnownDevice), getKeyboardDetails);
  event.sender.send('usb-currently-attached', attached);

  if (watches.has(id)) return;

  const attach = async (d: Device): Promise<void> => {
    const keyboard = await getKeyboardDetails(d);
    keyboard && event.sender.send('usb-attach', keyboard);
  };

  const detach = (d: import('../common/device/types').Device): void => {
    if (!isKnownDevice(d)) return;
    event.sender.send('usb-detach', d);
  };

  usb.on('attach', attach);
  usb.on('detach', detach);

  watches.set(id, [attach, detach]);
});
