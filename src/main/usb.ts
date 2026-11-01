import EventEmitter from 'node:events';
import { usb } from 'usb';
import type { Device } from '../common/device/types';

type UsbDevice = Awaited<ReturnType<typeof usb.getDevices>>[number];
type UsbConnectionEvent = Event & { device: UsbDevice };

const emitter = new EventEmitter();

function toDevice(raw: UsbDevice, connected: boolean): Device {
  const { bus, ports } = raw as unknown as { bus?: number; ports?: number[] };
  const location = ports?.length ? `${bus}-${ports.join('.')}` : `${bus}`;
  return {
    connected,
    openable: true,
    busNo: bus ?? 0,
    path: `${raw.vendorId}:${raw.productId}@${location}`,
    vendorId: raw.vendorId,
    productId: raw.productId,
    manufacturer: raw.manufacturerName ?? undefined,
    product: raw.productName ?? undefined,
    serialNo: raw.serialNumber ?? undefined,
    version: (raw.deviceVersionMajor << 8) | (raw.deviceVersionMinor << 4) | raw.deviceVersionSubminor,
  };
}

usb.addEventListener('connect', (event) => {
  emitter.emit('attach', toDevice((event as UsbConnectionEvent).device, true));
});
usb.addEventListener('disconnect', (event) => {
  emitter.emit('detach', toDevice((event as UsbConnectionEvent).device, false));
});

export async function getAttachedDevices(): Promise<Device[]> {
  return (await usb.getDevices()).map((d) => toDevice(d, true));
}

export function on(event: 'attach' | 'detach', callback: (device: Device) => void): void {
  emitter.on(event, callback);
}
