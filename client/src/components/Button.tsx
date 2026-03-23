/**
 * Button.tsx — Componente de Botão Reutilizável
 * DentCare Elite V32 — Design System v1.0
 *
 * Padrões de botão: Primary, Secondary, Success, Warning, Error, Ghost
 * Tamanhos: sm, md, lg
 * Estados: default, hover, active, disabled, loading
 */

import React, { ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "success" | "warning" | "error" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: `
    bg-brand-primary text-[var(--text-primary)]
    hover:bg-brand-primary-dark
    active:bg-brand-primary-dark/80
    disabled:bg-brand-primary/50 disabled:cursor-not-allowed
    transition-all duration-200 ease-smooth
  `,
  secondary: `
    bg-transparent border border-brand-primary text-brand-primary
    hover:bg-brand-primary/10
    active:bg-brand-primary/20
    disabled:border-brand-primary/50 disabled:text-brand-primary/50 disabled:cursor-not-allowed
    transition-all duration-200 ease-smooth
  `,
  success: `
    bg-semantic-success text-[var(--text-primary)]
    hover:bg-semantic-success-dark
    active:bg-semantic-success-dark/80
    disabled:bg-semantic-success/50 disabled:cursor-not-allowed
    transition-all duration-200 ease-smooth
  `,
  warning: `
    bg-semantic-warning text-[var(--text-primary)]
    hover:bg-semantic-warning-dark
    active:bg-semantic-warning-dark/80
    disabled:bg-semantic-warning/50 disabled:cursor-not-allowed
    transition-all duration-200 ease-smooth
  `,
  error: `
    bg-semantic-error text-[var(--text-primary)]
    hover:bg-semantic-error-dark
    active:bg-semantic-error-dark/80
    disabled:bg-semantic-error/50 disabled:cursor-not-allowed
    transition-all duration-200 ease-smooth
  `,
  ghost: `
    bg-transparent text-text-dark-primary
    hover:bg-[var(--bg-subtle)]
    active:bg-white/[0.12]
    disabled:text-text-dark-muted disabled:cursor-not-allowed
    transition-all duration-200 ease-smooth
  `,
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-md py-xs text-xs font-medium rounded-md",
  md: "px-lg py-md text-sm font-medium rounded-lg",
  lg: "px-xl py-lg text-base font-semibold rounded-lg",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          flex items-center justify-center gap-md
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className || ""}
        `}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {leftIcon && <span className="flex items-center">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="flex items-center">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
