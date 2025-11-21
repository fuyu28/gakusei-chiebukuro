'use client';

import { useEffect } from 'react';

type SuccessToastProps = {
  message: string;
  duration?: number;
  onClose?: () => void;
};

export function SuccessToast({
  message,
  duration = 3000,
  onClose,
}: SuccessToastProps) {
  useEffect(() => {
    if (!message || !onClose) {
      return;
    }

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [message, duration, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-green-600 px-4 py-3 text-white shadow-lg shadow-green-500/40">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-7.25 9a.75.75 0 01-1.127.05l-3.25-3.25a.75.75 0 111.06-1.06l2.635 2.634 6.743-8.378a.75.75 0 011.046-.048z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-medium">{message}</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-full bg-white/20 px-2 py-1 text-xs font-semibold uppercase tracking-wide"
          >
            閉じる
          </button>
        )}
      </div>
    </div>
  );
}
