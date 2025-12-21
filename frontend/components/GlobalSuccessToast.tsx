'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { GLOBAL_SUCCESS_TOAST_EVENT } from '@/lib/toast-events';
import { Toaster } from '@/components/ui/toaster';

export default function GlobalSuccessToast() {
  const { toast } = useToast();

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const text = customEvent.detail;
      if (text) {
        toast({
          description: text,
          duration: 3200,
        });
      }
    };

    window.addEventListener(GLOBAL_SUCCESS_TOAST_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(GLOBAL_SUCCESS_TOAST_EVENT, handler as EventListener);
    };
  }, [toast]);

  return <Toaster />;
}
