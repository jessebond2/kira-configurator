import React, { useEffect } from 'react';
import { MuiThemeProvider } from './mui';
import theme from './theme';
import AppLayout from './app-layout';
import { loadFromDb } from './state/settings';
import { popupToast } from './state/core';
import NewVersionToast from './toast/new-version';
import { GenericToast } from './toast';

async function initApp() {
  await loadFromDb();
}

function App() {
  useEffect(() => {
    initApp();
  }, []);

  return (
    <MuiThemeProvider theme={theme}>
      <AppLayout />
    </MuiThemeProvider>
  );
}

export default App;
