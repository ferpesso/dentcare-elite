/**
 * Toast Notification System — Notificações em Tempo Real
 * DentCare Elite V32 — Feedback visual instantâneo para ações do utilizador
 */

import React, { useState, useCallback, createContext, useContext } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { ...toast, id, duration: toast.duration || 3000 };
    setToasts((prev) => [...prev, newToast]);

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => removeToast(id), newToast.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBgColor = () => {
    switch (toast.type) {
      case "success":
        return "bg-emerald-500/10 border-emerald-500/20";
      case "error":
        return "bg-red-500/10 border-red-500/20";
      case "warning":
        return "bg-amber-500/10 border-amber-500/20";
      case "info":
      default:
        return "bg-blue-500/10 border-blue-500/20";
    }
  };

  const getTextColor = () => {
    switch (toast.type) {
      case "success":
        return "text-emerald-300";
      case "error":
        return "text-red-300";
      case "warning":
        return "text-amber-300";
      case "info":
      default:
        return "text-blue-300";
    }
  };

  return (
    <div
      className={`pointer-events-auto card-premium p-4 border ${getBgColor()} flex items-start gap-3 max-w-sm animate-in fade-in slide-in-from-right-4 duration-300`}
    >
      {getIcon()}
      <div className="flex-1">
        <p className={`font-semibold text-sm ${getTextColor()}`}>{toast.title}</p>
        {toast.message && (
          <p className="text-[var(--text-muted)] text-xs mt-1">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
