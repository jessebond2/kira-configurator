import { useState, useEffect } from 'react';
import { AttachedKeyboard } from '../common/device/types';

export function useConnectedKeyboards(): AttachedKeyboard[] {
  const [connected, setConnected] = useState<AttachedKeyboard[]>([]);

  useEffect(
    () => {
      return window.host.watchUsb({
        attached: (devices) => setConnected((devices as AttachedKeyboard[]).filter((x) => !!x)),
        attach: (device) => setConnected((prev) => [...prev, device as AttachedKeyboard]),
        detach: (device) =>
          setConnected((prev) => prev.filter((x) => x.path !== (device as AttachedKeyboard).path)),
      });
    },
    [] // our effect relies on no props
  );

  return connected;
}
