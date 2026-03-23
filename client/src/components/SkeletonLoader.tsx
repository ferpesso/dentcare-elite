/**
 * SkeletonLoader.tsx — Componentes de Skeleton Loading
 * DentCare Elite V32 — Performance & UX
 *
 * Indicadores visuais de carregamento para widgets e componentes
 */

import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
  circle?: boolean;
}

/**
 * Componente base de Skeleton
 */
export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ width = "100%", height = "20px", className = "", count = 1, circle = false }, ref) => {
    const skeletons = Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        ref={i === 0 ? ref : undefined}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          height: typeof height === "number" ? `${height}px` : height,
        }}
        className={`
          bg-gradient-to-r from-bg-dark-surface via-bg-dark-elevated to-bg-dark-surface
          animate-pulse rounded-md
          ${circle ? "rounded-full" : ""}
          ${className}
        `}
      />
    ));

    return count === 1 ? skeletons[0] : <div className="space-y-md">{skeletons}</div>;
  }
);

Skeleton.displayName = "Skeleton";

/**
 * Skeleton para KPI Widget
 */
export function SkeletonKPI() {
  return (
    <div className="p-lg bg-bg-dark-surface border border-border-light rounded-lg space-y-lg">
      <div className="flex items-start justify-between">
        <Skeleton width={40} height={40} circle />
        <Skeleton width={60} height={20} />
      </div>
      <div className="space-y-md">
        <Skeleton width="60%" height={16} />
        <Skeleton width="80%" height={28} />
      </div>
    </div>
  );
}

/**
 * Skeleton para Card
 */
export function SkeletonCard() {
  return (
    <div className="p-lg bg-bg-dark-surface border border-border-light rounded-lg space-y-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-md">
          <Skeleton width="70%" height={20} />
          <Skeleton width="90%" height={16} />
        </div>
        <Skeleton width={32} height={32} />
      </div>
      <Skeleton count={3} />
    </div>
  );
}

/**
 * Skeleton para Lista de Itens
 */
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-md">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-lg p-lg bg-bg-dark-surface border border-border-light rounded-lg">
          <Skeleton width={40} height={40} circle />
          <div className="flex-1 space-y-md">
            <Skeleton width="60%" height={16} />
            <Skeleton width="80%" height={14} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para Gráfico
 */
export function SkeletonChart() {
  return (
    <div className="p-lg bg-bg-dark-surface border border-border-light rounded-lg space-y-lg">
      <Skeleton width="50%" height={20} />
      <div className="space-y-md">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-lg">
            <Skeleton width={30} height={20} />
            <Skeleton width={["75%", "55%", "90%", "65%"][i % 4]} height={16} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton para Tabela
 */
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="border border-border-light rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex bg-bg-dark-elevated border-b border-border-light p-lg gap-lg">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} width={`${100 / columns}%`} height={16} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex border-b border-border-lighter p-lg gap-lg">
          {Array.from({ length: columns }, (_, j) => (
            <Skeleton key={j} width={`${100 / columns}%`} height={16} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Wrapper para mostrar skeleton enquanto query está a carregar
 */
interface SkeletonWrapperProps {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}

export function SkeletonWrapper({ isLoading, skeleton, children }: SkeletonWrapperProps) {
  return isLoading ? <>{skeleton}</> : <>{children}</>;
}
