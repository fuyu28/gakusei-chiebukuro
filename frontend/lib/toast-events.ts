'use client';

export const GLOBAL_SUCCESS_TOAST_EVENT = 'global-success-toast';

export const showGlobalSuccessToast = (message: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(GLOBAL_SUCCESS_TOAST_EVENT, { detail: message }));
};
