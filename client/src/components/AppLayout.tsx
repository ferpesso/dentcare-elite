/**
 * AppLayout.tsx — Layout Principal Nano Banana Cyberpunk
 * DentCare Elite V35 — Dual Neon Cyan + Violet
 *
 * Ambiente visual: Ondas animadas suaves (cyan + violet), glassmorphism profundo,
 * profundidade visual com Void Black base.
 * Suporta fundo com ondas ou fundo liso (branco/escuro) via configuração.
 */

import React from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { WaveBackground } from "./WaveBackground";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>

      {/* ── Efeito de Ondas Animadas — Substitui os Orbs Estáticos ── */}
      <WaveBackground />

      {/* ── Barra Lateral ── */}
      <Sidebar />

      {/* ── Área Principal ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Barra Superior */}
        <TopBar />

        {/* Conteúdo da Página */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-premium">
          <div className="max-w-screen-2xl mx-auto p-5 lg:p-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
