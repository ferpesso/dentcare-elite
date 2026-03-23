/**
 * useOptimizedQuery.ts — Hook Customizado para Queries Otimizadas
 * DentCare Elite V32 — Performance Optimization
 *
 * Implementa cache agressivo, lazy loading e retry automático
 */

import { UseQueryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/**
 * Configuração padrão para queries otimizadas
 * - staleTime: 5 minutos (dados considerados "fresh" por 5 min)
 * - gcTime: 10 minutos (dados mantidos em cache por 10 min)
 * - retry: 2 tentativas em caso de erro
 * - retryDelay: exponencial (1s, 2s, 4s)
 */
export const OPTIMIZED_QUERY_CONFIG = {
  staleTime: 1000 * 60 * 5,        // 5 minutos
  gcTime: 1000 * 60 * 10,          // 10 minutos
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;

/**
 * Configuração para queries críticas (mais agressivas)
 * - staleTime: 10 minutos
 * - gcTime: 30 minutos
 */
export const CRITICAL_QUERY_CONFIG = {
  staleTime: 1000 * 60 * 10,       // 10 minutos
  gcTime: 1000 * 60 * 30,          // 30 minutos
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;

/**
 * Configuração para queries de baixa prioridade (menos agressivas)
 * - staleTime: 2 minutos
 * - gcTime: 5 minutos
 */
export const LOW_PRIORITY_QUERY_CONFIG = {
  staleTime: 1000 * 60 * 2,        // 2 minutos
  gcTime: 1000 * 60 * 5,           // 5 minutos
  retry: 1,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
} as const;

/**
 * Hook para lazy loading de queries
 * Permite carregar queries apenas quando necessário (e.g., quando widget é visível)
 */
export function useLazyQuery<T>(
  queryFn: () => Promise<T>,
  options?: UseQueryOptions<T>
) {
  const [shouldLoad, setShouldLoad] = useState(false);

  return {
    shouldLoad,
    setShouldLoad,
    queryOptions: {
      ...OPTIMIZED_QUERY_CONFIG,
      ...options,
      enabled: shouldLoad,
    },
  };
}

/**
 * Hook para detectar quando um elemento entra na viewport (Intersection Observer)
 * Útil para lazy loading de widgets
 */
export function useInView(ref: React.RefObject<HTMLElement>) {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref]);

  return isInView;
}

/**
 * Hook para debounce de valores
 * Útil para filtros e pesquisas que disparam queries
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para prefetching inteligente de queries relacionadas
 * Permite prefetch de dados quando o utilizador interage com certos elementos
 */
export function usePrefetchQuery(
  queryKey: string,
  queryFn: () => Promise<any>,
  shouldPrefetch: boolean = false
) {
  useEffect(() => {
    if (shouldPrefetch) {
      // Prefetch será implementado com React Query's prefetchQuery
      // Este é um placeholder para demonstrar o padrão
    }
  }, [shouldPrefetch, queryKey, queryFn]);
}
