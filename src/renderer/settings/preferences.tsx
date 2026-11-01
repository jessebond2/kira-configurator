import React from 'react';
import { Card, CardHeader, CardContent, Typography } from '../mui';

export default function Preferences() {
  return (
    <Card>
      <CardHeader title="Preferences" />
      <CardContent>
        <Typography>No preferences yet. Firmware compiles on this computer.</Typography>
      </CardContent>
    </Card>
  );
}
