import type { FirmwareResult } from './firmware';

export type CompileResponse =
  | { success: true; firmware: FirmwareResult }
  | { success: false; error: string; log?: string };

export type FlashResponse = { code: number; notFound: boolean };

export type FileFilter = { name: string; extensions: string[] };

/** Everything the UI may ask of the system. Implemented in src/main/host.ts. */
export interface HostApi {
  openExternal(url: string): Promise<void>;
  openFileDialog(title: string, filters: FileFilter[]): Promise<string[]>;
  fileExists(path: string): Promise<boolean>;
  readTextFile(path: string): Promise<string>;
  findDfuPath(): Promise<string>;
  listCachedFirmware(): Promise<FirmwareResult[]>;
  compile(config: unknown, variant: string): Promise<CompileResponse>;
  flash(dfuPath: string, binPath: string): Promise<FlashResponse>;
  onFlashOutput(listener: (text: string) => void): () => void;
  watchUsb(listeners: {
    attached(devices: unknown[]): void;
    attach(device: unknown): void;
    detach(device: unknown): void;
  }): () => void;
}
