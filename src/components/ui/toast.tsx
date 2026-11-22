'use client';

import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
      {toasts.map((item) => {
        const styleClass =
          item.variant === 'destructive'
            ? 'border-destructive bg-destructive text-destructive-foreground'
            : item.variant === 'success'
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-border bg-popover text-popover-foreground';

        return (
          <div
            key={item.id}
            role="status"
            className={`flex items-start justify-between gap-3 rounded-lg border p-4 shadow-lg ${styleClass}`}
          >
            <div className="space-y-1 text-sm">
              <p className="font-semibold leading-none">{item.title}</p>
              {item.description && (
                <p className="text-xs opacity-90 leading-relaxed">{item.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Close notification"
              className="rounded p-0.5 opacity-80 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
