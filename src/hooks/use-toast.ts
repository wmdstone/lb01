/**
 * Simple toast notification hook
 * 
 * Provides a toast() function for showing notifications
 */

import { useState, useCallback, useEffect } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

// Global state for toasts (simple implementation)
let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];
let toastId = 0;

function notifyListeners() {
  toastListeners.forEach(listener => listener([...toasts]));
}

function addToast(toast: Omit<Toast, 'id'>): string {
  const id = `toast-${++toastId}`;
  const newToast = { ...toast, id };
  toasts = [...toasts, newToast];
  notifyListeners();

  // Auto dismiss after duration
  const duration = toast.duration ?? 5000;
  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }

  return id;
}

function dismissToast(id: string) {
  toasts = toasts.filter(t => t.id !== id);
  notifyListeners();
}

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setState({ toasts: newToasts });
    };
    toastListeners.push(listener);
    setState({ toasts: [...toasts] });

    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    return addToast(props);
  }, []);

  const dismiss = useCallback((id: string) => {
    dismissToast(id);
  }, []);

  return {
    toasts: state.toasts,
    toast,
    dismiss,
  };
}

export { addToast as toast, dismissToast as dismiss };
