import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { HostApi } from '../common/host';

function subscribe<T>(channel: string, listener: (value: T) => void): () => void {
  const wrapped = (_: IpcRendererEvent, value: T) => listener(value);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

const host: HostApi = {
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openFileDialog: (title, filters) => ipcRenderer.invoke('open-file-dialog', title, filters),
  fileExists: (path) => ipcRenderer.invoke('file-exists', path),
  readTextFile: (path) => ipcRenderer.invoke('read-text-file', path),
  findDfuPath: () => ipcRenderer.invoke('find-dfu-path'),
  listCachedFirmware: () => ipcRenderer.invoke('list-cached-firmware'),
  compile: (config, variant) => ipcRenderer.invoke('compile', config, variant),
  flash: (dfuPath, binPath) => ipcRenderer.invoke('flash', dfuPath, binPath),
  onFlashOutput: (listener) => subscribe('flash-output', listener),
  watchUsb: ({ attached, attach, detach }) => {
    const unsubscribers = [
      subscribe('usb-currently-attached', attached),
      subscribe('usb-attach', attach),
      subscribe('usb-detach', detach),
    ];
    ipcRenderer.send('usb-watch');
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  },
};

contextBridge.exposeInMainWorld('host', host);
