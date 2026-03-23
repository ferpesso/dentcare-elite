/**
 * DesignSystemShowcase.tsx
 * Componente de Referência do Design System DentCare V31 Elite
 * 
 * Este ficheiro serve como documentação viva do design system,
 * mostrando padrões de cores, tipografia, componentes e micro-interações.
 * 
 * Uso: Importar e renderizar para visualizar o design system completo.
 */

import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, Zap } from 'lucide-react';

export function DesignSystemShowcase() {
  return (
    <div className="min-h-screen bg-bg-dark-base text-text-dark-primary p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* ─── Cabeçalho ─────────────────────────────────────────────────── */}
        <div className="mb-12">
          <h1 className="text-4xl font-extrabold mb-2 bg-gradient-brand bg-clip-text text-transparent">
            DentCare V31 Elite — Design System
          </h1>
          <p className="text-text-dark-tertiary text-lg">
            Guia de Referência para Componentes, Cores e Padrões
          </p>
        </div>

        {/* ─── Seção: Paleta de Cores ────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-text-dark-primary">
            Paleta de Cores
          </h2>

          {/* Cores Primárias */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-text-dark-secondary">
              Cores Primárias
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="w-full h-24 bg-brand-primary rounded-lg shadow-md"></div>
                <p className="text-sm text-text-dark-tertiary">Primary</p>
                <code className="text-xs text-text-dark-muted">#6366F1</code>
              </div>
              <div className="space-y-2">
                <div className="w-full h-24 bg-brand-secondary rounded-lg shadow-md"></div>
                <p className="text-sm text-text-dark-tertiary">Secondary</p>
                <code className="text-xs text-text-dark-muted">#8B5CF6</code>
              </div>
              <div className="space-y-2">
                <div className="w-full h-24 bg-gradient-brand rounded-lg shadow-md"></div>
                <p className="text-sm text-text-dark-tertiary">Gradient</p>
                <code className="text-xs text-text-dark-muted">Brand Gradient</code>
              </div>
            </div>
          </div>

          {/* Cores Semânticas */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-text-dark-secondary">
              Cores Semânticas (Estados)
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="w-full h-20 bg-semantic-success rounded-lg shadow-md"></div>
                <p className="text-sm text-text-dark-tertiary">Sucesso</p>
                <code className="text-xs text-text-dark-muted">#10B981</code>
              </div>
              <div className="space-y-2">
                <div className="w-full h-20 bg-semantic-warning rounded-lg shadow-md"></div>
                <p className="text-sm text-text-dark-tertiary">Aviso</p>
                <code className="text-xs text-text-dark-muted">#F59E0B</code>
              </div>
              <div className="space-y-2">
                <div className="w-full h-20 bg-semantic-error rounded-lg shadow-md"></div>
                <p className="text-sm text-text-dark-tertiary">Erro</p>
                <code className="text-xs text-text-dark-muted">#F43F5E</code>
              </div>
              <div className="space-y-2">
                <div className="w-full h-20 bg-semantic-info rounded-lg shadow-md"></div>
                <p className="text-sm text-text-dark-tertiary">Informação</p>
                <code className="text-xs text-text-dark-muted">#06B6D4</code>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Seção: Tipografia ─────────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-text-dark-primary">
            Tipografia
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-4xl font-extrabold text-text-dark-primary">Heading 4XL (36px)</p>
              <p className="text-sm text-text-dark-muted mt-2">font-extrabold, line-height: 44px</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-text-dark-primary">Heading 3XL (30px)</p>
              <p className="text-sm text-text-dark-muted mt-2">font-bold, line-height: 36px</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-dark-primary">Heading 2XL (24px)</p>
              <p className="text-sm text-text-dark-muted mt-2">font-semibold, line-height: 32px</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-text-dark-primary">Body Large (18px)</p>
              <p className="text-sm text-text-dark-muted mt-2">font-semibold, line-height: 28px</p>
            </div>
            <div>
              <p className="text-base font-normal text-text-dark-primary">Body Base (16px)</p>
              <p className="text-sm text-text-dark-muted mt-2">font-normal, line-height: 24px</p>
            </div>
            <div>
              <p className="text-sm font-normal text-text-dark-secondary">Body Small (14px)</p>
              <p className="text-xs text-text-dark-muted mt-2">font-normal, line-height: 20px</p>
            </div>
          </div>
        </section>

        {/* ─── Seção: Componentes de Alerta ──────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-text-dark-primary">
            Componentes de Alerta
          </h2>
          <div className="space-y-4">
            
            {/* Sucesso */}
            <div className="flex items-start gap-3 p-4 bg-bg-dark-surface border border-semantic-success/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-semantic-success flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-semantic-success">Sucesso</p>
                <p className="text-sm text-text-dark-secondary mt-1">
                  A operação foi concluída com sucesso. Utilize esta cor para confirmar ações positivas.
                </p>
              </div>
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-3 p-4 bg-bg-dark-surface border border-semantic-warning/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-semantic-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-semantic-warning">Aviso</p>
                <p className="text-sm text-text-dark-secondary mt-1">
                  Utilize para alertar o utilizador sobre situações que requerem atenção, mas não são críticas.
                </p>
              </div>
            </div>

            {/* Erro */}
            <div className="flex items-start gap-3 p-4 bg-bg-dark-surface border border-semantic-error/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-semantic-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-semantic-error">Erro</p>
                <p className="text-sm text-text-dark-secondary mt-1">
                  Utilize para erros críticos que impedem a continuação da operação.
                </p>
              </div>
            </div>

            {/* Informação */}
            <div className="flex items-start gap-3 p-4 bg-bg-dark-surface border border-semantic-info/20 rounded-lg">
              <Info className="w-5 h-5 text-semantic-info flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-semantic-info">Informação</p>
                <p className="text-sm text-text-dark-secondary mt-1">
                  Utilize para informações gerais ou dicas úteis para o utilizador.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Seção: Botões ─────────────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-text-dark-primary">
            Padrões de Botões
          </h2>
          <div className="space-y-6">
            
            {/* Botão Primário */}
            <div>
              <p className="text-sm font-semibold text-text-dark-secondary mb-3">Botão Primário</p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-brand-primary text-[var(--text-primary)] rounded-md font-semibold hover:bg-brand-primary-dark transition-colors duration-200">
                  Primário
                </button>
                <button className="px-4 py-2 bg-brand-primary text-[var(--text-primary)] rounded-md font-semibold opacity-50 cursor-not-allowed">
                  Desativado
                </button>
              </div>
            </div>

            {/* Botão Secundário */}
            <div>
              <p className="text-sm font-semibold text-text-dark-secondary mb-3">Botão Secundário</p>
              <div className="flex gap-3">
                <button className="px-4 py-2 border border-brand-primary text-brand-primary rounded-md font-semibold hover:bg-brand-primary/10 transition-colors duration-200">
                  Secundário
                </button>
              </div>
            </div>

            {/* Botão de Ação */}
            <div>
              <p className="text-sm font-semibold text-text-dark-secondary mb-3">Botão de Ação (Sucesso)</p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-semantic-success text-[var(--text-primary)] rounded-md font-semibold hover:bg-semantic-success-dark transition-colors duration-200">
                  Confirmar
                </button>
              </div>
            </div>

            {/* Botão de Perigo */}
            <div>
              <p className="text-sm font-semibold text-text-dark-secondary mb-3">Botão de Perigo (Erro)</p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-semantic-error text-[var(--text-primary)] rounded-md font-semibold hover:bg-semantic-error-dark transition-colors duration-200">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Seção: Espaçamento ────────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-text-dark-primary">
            Escala de Espaçamento
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-primary rounded-md"></div>
              <p className="text-sm text-text-dark-secondary">12px (md)</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-12 bg-brand-primary rounded-md"></div>
              <p className="text-sm text-text-dark-secondary">16px (lg)</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 h-12 bg-brand-primary rounded-md"></div>
              <p className="text-sm text-text-dark-secondary">24px (xl)</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-32 h-12 bg-brand-primary rounded-md"></div>
              <p className="text-sm text-text-dark-secondary">32px (2xl)</p>
            </div>
          </div>
        </section>

        {/* ─── Rodapé ────────────────────────────────────────────────────── */}
        <div className="border-t border-border-light pt-8 mt-12">
          <p className="text-sm text-text-dark-muted">
            Design System v1.0 — DentCare V31 Elite
          </p>
        </div>
      </div>
    </div>
  );
}
