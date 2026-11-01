import { getDevice, keyboards } from '../common/device/keyboard';
import type { Device, Keyboard } from '../common/device/types';

export function identifyKeyboard(usb: Device): Keyboard | null {
  const device = getDevice(usb);
  if (!device) return null;

  if (device.isUnique) {
    return keyboards.find((x) => x.display === device.names[0]) ?? null;
  }

  const { product } = usb;
  return keyboards.find((x) => x.names.some((name) => product?.includes(name))) ?? null;
}
