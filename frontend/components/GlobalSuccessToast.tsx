'use client';

import { useEffect, useState } from 'react';
import { SuccessToast } from './SuccessToast';
import { GLOBAL_SUCCESS_TOAST_EVENT } from '@/lib/toast-events';

export default function GlobalSuccessToast() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setMessage(customEvent.detail);
    };

    window.addEventListener(GLOBAL_SUCCESS_TOAST_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(GLOBAL_SUCCESS_TOAST_EVENT, handler as EventListener);
    };
  }, []);

  return (
    <SuccessToast message={message} onClose={() => setMessage('')} />
  );
}
