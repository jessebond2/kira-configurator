import React, { useState } from 'react';
import { makeStyles, Button, Snackbar, CircularProgress, Fab, Theme } from '../../mui';
import { FlashOnIcon } from '../../icons';
import { addDownload } from '../../state/settings';
import { currentConfig } from '../../state/configure';
import {
  useCoreState,
  updatePanel,
  startExecuting,
  stopExecuting,
  Actions,
  Panels,
  popupSimpleToast,
} from '../../state/core';
import { ErrorToast } from '../../toast';
import { SimpleDataModal } from '../../modal';
import log from 'loglevel';

const useStyles = makeStyles(
  (theme: Theme) =>
    ({
      icon: {
        marginRight: theme.spacing(1),
      },
    } as const)
);

export default function CompileFirmwareButton() {
  const classes = useStyles({});
  const [variant] = useCoreState('variant');
  const [toast, setToast] = useState<JSX.Element | null>(null);
  const [compileLog, setCompileLog] = useState<Optional<string>>(undefined);
  const [executing] = useCoreState('executing');

  const compiling = executing.includes(Actions.Compile);

  if (!variant) {
    log.error('Variant not set while CompileFirmwareButton is visible');
    throw Error('Invalid UI state - variant not set');
  }

  const click = async () => {
    if (compiling) return;
    startExecuting(Actions.Compile);
    setToast(null);
    try {
      const result = await window.host.compile(currentConfig(), variant);
      if (result.success) {
        await addDownload(result.firmware);
        popupSimpleToast('success', 'Compilation Successful');
        stopExecuting(Actions.Compile);
        updatePanel(Panels.Flash);
      } else {
        const actions = [];
        if (result.log) {
          actions.push(
            <Button key="showlog" onClick={() => setCompileLog(result.log)} color="inherit">
              Show Log
            </Button>
          );
        }
        stopExecuting(Actions.Compile);
        setToast(
          <ErrorToast
            message={<span>{result.error}</span>}
            actions={actions}
            onClose={() => setToast(null)}
          />
        );
      }
    } catch {
      stopExecuting(Actions.Compile);
    }
  };

  return (
    <div>
      <Fab
        variant="extended"
        color="secondary"
        onClick={click}
        disabled={compiling}
        style={{ position: 'absolute', right: 0, top: -20 }}
      >
        {!compiling ? (
          <FlashOnIcon className={classes.icon} />
        ) : (
          <CircularProgress color="primary" className={classes.icon} size={24} thickness={3} />
        )}
        Compile Firmware
      </Fab>
      <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} open={!!toast}>
        {toast ?? undefined}
      </Snackbar>
      <SimpleDataModal
        open={!!compileLog}
        onClose={() => setCompileLog(undefined)}
        data={compileLog}
        title="Firmware Build Log"
      />
    </div>
  );
}
