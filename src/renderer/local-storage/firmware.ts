export type { FirmwareResult, SingleFirmwareResult, SplitFirmwareResult } from '../../common/firmware';
import type { FirmwareResult, SingleFirmwareResult } from '../../common/firmware';

// Older stored results have no `type`. Kira firmware is always a single image.
export function normalizeFirmwareResult(
  result: Optional<FirmwareResult | Omit<FirmwareResult, 'type'>>
): Optional<FirmwareResult> {
  if (result && !(result as FirmwareResult).type) {
    return { ...(result as Omit<SingleFirmwareResult, 'type'>), type: 'single' };
  }
  return result as Optional<FirmwareResult>;
}
