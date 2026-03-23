/**
 * Alert.tsx — Componente de Alerta Reutilizável
 * DentCare Elite V32 — Design System v1.0
 *
 * Tipos: success, warning, error, info
 * Suporta título, descrição e ações
 */

import React, { ReactNode } from "react";
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from "lucide-react";

type AlertType = "success" | "warning" | "error" | "info";

interface AlertProps {
  type?: AlertType;
  title?: string;
  description?: string;
  action?: ReactNode;
  onClose?: () => void;
  className?: string;
  children?: ReactNode;
}

const alertConfig: Record<
  AlertType,
  {
    icon: React.ComponentType<{ className?: string }>;
    bgColor: string;
    borderColor: string;
    textColor: string;
    iconColor: string;
  }
> = {
  success: {
    icon: CheckCircle,
    bgColor: "bg-semantic-success/10",
    borderColor: "border-semantic-success/30",
    textColor: "text-semantic-success",
    iconColor: "text-semantic-success",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-semantic-warning/10",
    borderColor: "border-semantic-warning/30",
    textColor: "text-semantic-warning",
    iconColor: "text-semantic-warning",
  },
  error: {
    icon: AlertCircle,
    bgColor: "bg-semantic-error/10",
    borderColor: "border-semantic-error/30",
    textColor: "text-semantic-error",
    iconColor: "text-semantic-error",
  },
  info: {
    icon: Info,
    bgColor: "bg-semantic-info/10",
    borderColor: "border-semantic-info/30",
    textColor: "text-semantic-info",
    iconColor: "text-semantic-info",
  },
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      type = "info",
      title,
      description,
      action,
      onClose,
      className = "",
      children,
    },
    ref
  ) => {
    const config = alertConfig[type];
    const Icon = config.icon;

    return (
      <div
        ref={ref}
        className={`
          flex items-start gap-lg p-lg
          ${config.bgColor}
          border ${config.borderColor}
          rounded-lg
          ${className}
        `}
      >
        {/* Ícone */}
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`font-semibold text-sm ${config.textColor}`}>
              {title}
            </h4>
          )}
          {description && (
            <p className="text-sm text-text-dark-secondary mt-xs">
              {description}
            </p>
          )}
          {children && (
            <div className="text-sm text-text-dark-secondary mt-md">
              {children}
            </div>
          )}
          {action && (
            <div className="mt-md">
              {action}
            </div>
          )}
        </div>

        {/* Botão de Fechar */}
        {onClose && (
          <button
            onClick={onClose}
            className={`
              flex-shrink-0 p-xs rounded-md
              hover:bg-[var(--bg-subtle)]
              transition-colors duration-200
              ${config.textColor}
            `}
            aria-label="Fechar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = "Alert";
