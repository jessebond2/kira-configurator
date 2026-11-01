type BaseFirmwareResult = {
  board: string;
  variant: string;
  layout: string;
  hash: string;
  isError: boolean;
  json: string;
  log: string;
  time: number;
};

export type SingleFirmwareResult = {
  bin: string;
  type: 'single';
} & BaseFirmwareResult;

export type SplitFirmwareResult = {
  bin: { left: string; right: string };
  type: 'split';
} & BaseFirmwareResult;

export type FirmwareResult = SingleFirmwareResult | SplitFirmwareResult;
