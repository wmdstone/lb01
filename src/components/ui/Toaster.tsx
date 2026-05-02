'use client';

import React from 'react';
import { useToast, type Toast } from '@/hooks/use-toast';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const isDestructive = toast.variant === 'destructive';

  return (
    <div
      className={cn(
        'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl border p-4 pr-6 shadow-lg transition-all',
        isDestructive
          ? 'border-destructive/50 bg-destructive text-destructive-foreground'
          : 'border-border bg-card text-card-foreground'
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {isDestructive ? (
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive-foreground/80" />
        ) : (
          <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
        )}
        <div className="grid gap-1">
          {toast.title && (
            <div className="text-sm font-semibold">{toast.title}</div>
          )}
          {toast.description && (
            <div className="text-sm opacity-90">{toast.description}</div>
          )}
        </div>
      </div>
      <button
        onClick={onDismiss}
        className={cn(
          'absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100',
          isDestructive
            ? 'hover:bg-destructive-foreground/10'
            : 'hover:bg-muted'
        )}
        aria-label="Tutup"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => dismiss(toast.id)}
        />
      ))}
    </div>
  );
}
