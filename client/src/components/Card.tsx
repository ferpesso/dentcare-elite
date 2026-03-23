/**
 * Card.tsx — Componente de Card Glassmorphism
 * DentCare Elite V35 — Design System v3.0
 *
 * Variantes: default (glass), elevated (glass forte), outlined (borda neon)
 * Efeito: linha neon superior, backdrop-blur, sombra com accent
 */

import React, { ReactNode } from "react";

type CardVariant = "default" | "elevated" | "outlined";

interface CardProps {
  variant?: CardVariant;
  className?: string;
  children: ReactNode;
}

interface CardHeaderProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}

interface CardBodyProps {
  className?: string;
  children: ReactNode;
}

interface CardFooterProps {
  className?: string;
  children: ReactNode;
}

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  default: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(var(--glass-blur))',
    WebkitBackdropFilter: 'blur(var(--glass-blur))',
    border: '1px solid var(--border-light)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.03)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  elevated: {
    background: 'var(--glass-bg-strong)',
    backdropFilter: 'blur(var(--glass-blur-strong))',
    WebkitBackdropFilter: 'blur(var(--glass-blur-strong))',
    border: '1px solid var(--border-lighter)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.05)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  outlined: {
    background: 'transparent',
    border: '1px solid var(--border-light)',
    borderRadius: '16px',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", className = "", children }, ref) => {
    return (
      <div ref={ref} style={variantStyles[variant]} className={className}>
        {/* Linha neon superior */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 212, 255, 0.10) 50%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, className = "", children }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-start justify-between gap-4 px-6 py-4 ${className}`}
        style={{ borderBottom: '1px solid var(--border-lightest)' }}
      >
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-lg font-bold text-[var(--text-primary)]" style={{ letterSpacing: '-0.02em' }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              {subtitle}
            </p>
          )}
          {children}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className = "", children }, ref) => {
    return (
      <div ref={ref} className={`px-6 py-4 ${className}`}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = "CardBody";

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = "", children }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-center justify-end gap-3 px-6 py-4 ${className}`}
        style={{ borderTop: '1px solid var(--border-lightest)' }}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = "CardFooter";
