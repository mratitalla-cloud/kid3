/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { DesktopHost } from './components/DesktopHost';
import { MobileController } from './components/MobileController';

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Check if URL contains ?session=<ID>
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    if (session) {
      setSessionId(session);
    }
  }, []);

  // If session param is provided, render the Mobile Controller
  if (sessionId) {
    return <MobileController sessionId={sessionId} />;
  }

  // Otherwise, render Desktop Host
  return <DesktopHost />;
}
