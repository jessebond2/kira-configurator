import { updateConfig } from './configure';

import { _currentState, updateNewerVersionAvail } from './settings';
import { updatePanel, Panels, reset as resetCoreState, popupSimpleToast, toggleLoading } from './core';
import { reset as resetConfigureState } from './configure';
import _ from 'lodash';
import kiraStandard from '../../../layouts/Kira-Standard.default.json';
import { PersistedConfig } from '../../common/config';
import { AvailableLocales } from '../../common/keys';
import { Keyboard } from '../../common/device/types';

function resetConfig() {
  updatePanel(Panels.KeyboardSelect);
  resetCoreState();
  resetConfigureState();
}

export async function loadRemoteConfig(
  keyboard: Keyboard,
  variant: string,
  layout?: string,
  locale?: AvailableLocales
) {
  try {
    toggleLoading();
    const config = kiraStandard as unknown as PersistedConfig;
    updateConfig(config, locale || _currentState('locale'));
    toggleLoading();
  } catch (e) {
    resetConfig();
    popupSimpleToast('error', 'Failed to load layout');
  }
}

export async function loadLocalConfig(filepath: string, locale?: AvailableLocales) {
  try {
    toggleLoading();
    const config = JSON.parse(await window.host.readTextFile(filepath));
    updateConfig(config, locale || _currentState('locale'));
    toggleLoading();
  } catch (e) {
    resetConfig();
    popupSimpleToast('error', 'Failed to load layout');
  }
}

export async function loadDefaultConfig(keyboard: Keyboard, variant: string) {
  const recentDls = _currentState('recentDls');
  const recent = _.head(recentDls[`${keyboard.display}__${variant}`] || []);

  // Stay in the loading state across the async checks. The editor can't draw without a layout.
  toggleLoading();
  try {
    const config =
      recent && (await window.host.fileExists(recent.json))
        ? JSON.parse(await window.host.readTextFile(recent.json))
        : kiraStandard;
    updateConfig(config as PersistedConfig, _currentState('locale'));
    toggleLoading();
  } catch (e) {
    resetConfig();
    popupSimpleToast('error', 'Failed to load layout');
  }
}
