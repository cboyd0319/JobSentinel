/**
 * Toast Hook
 * 
 * Custom hook for managing toast notifications
 */

import { useState } from 'react'
import type { ToastProps, ToastType } from '../components/Toast'

export const useToast = () => {
  const [toasts, setToasts] = useState<Array<Omit<ToastProps, 'onClose'>>>([])

  const addToast = (
    type: ToastType,
    message: string,
    duration?: number
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, type, message, duration }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return {
    toasts,
    addToast,
    removeToast,
    success: (message: string, duration?: number) => addToast('success', message, duration),
    error: (message: string, duration?: number) => addToast('error', message, duration),
    warning: (message: string, duration?: number) => addToast('warning', message, duration),
    info: (message: string, duration?: number) => addToast('info', message, duration),
  }
}
