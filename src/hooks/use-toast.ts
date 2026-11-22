'use client';

import { useEffect, useState } from 'react';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

const listeners = new Set<(toasts: ToastItem[]) => void>();
let memoryToasts: ToastItem[] = [];

function emit() {
  listeners.forEach((listener) => listener([...memoryToasts]));
}

export function toast(item: Omit<ToastItem, 'id'>) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const nextItem: ToastItem = { id, variant: 'default', ...item };
  memoryToasts = [...memoryToasts, nextItem];
  emit();

  setTimeout(() => {
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    emit();
  }, 3500);
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>(memoryToasts);

  useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  return {
    toasts,
    toast,
    dismiss: (id: string) => {
      memoryToasts = memoryToasts.filter((t) => t.id !== id);
      emit();
    },
  };
}