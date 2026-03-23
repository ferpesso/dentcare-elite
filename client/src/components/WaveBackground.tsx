/**
 * WaveBackground.tsx — Imagem Decorativa de Fundo
 * DentCare Elite V35 — Nano Banana Design System
 *
 * Coloca a imagem das ondas (installer sidebar) como elemento decorativo
 * no canto inferior direito da tela, com opacidade suave.
 * Suporta modo escuro (imagem original) e modo claro (versão light).
 *
 * Configurável via localStorage: 'dentcare-bg-style'
 *   - 'waves'  → imagem decorativa no canto (padrão)
 *   - 'plain'  → fundo liso sem efeitos
 */

import React, { useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";

type BgStyle = "waves" | "plain";

function getBgStyle(): BgStyle {
  const stored = localStorage.getItem("dentcare-bg-style");
  if (stored === "plain") return "plain";
  return "waves";
}

export function WaveBackground() {
  const { theme } = useTheme();
  const [bgStyle, setBgStyle] = React.useState<BgStyle>(getBgStyle);

  // Escutar mudanças no localStorage (para atualizar em tempo real)
  useEffect(() => {
    const handler = () => setBgStyle(getBgStyle());
    window.addEventListener("dentcare-bg-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("dentcare-bg-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  if (bgStyle === "plain") return null;

  const isDark = theme === "dark";
  const imageSrc = isDark ? "/bg-waves-dark.webp" : "/bg-waves-light.webp";

  return (
    <>
      {/* Imagem decorativa — canto inferior direito, formato vertical como a imagem original */}
      <div
        className="fixed pointer-events-none select-none"
        style={{
          bottom: 0,
          right: 0,
          width: '380px',
          height: '100vh',
          zIndex: 0,
          opacity: isDark ? 0.35 : 0.18,
          maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%)',
        }}
      >
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
          }}
        />
      </div>

      {/* Glow suave complementar — canto inferior direito */}
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: '-5%',
          right: '-3%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(179, 136, 255, 0.05) 0%, rgba(0, 229, 255, 0.03) 40%, transparent 70%)'
            : 'radial-gradient(circle, rgba(124, 77, 255, 0.03) 0%, rgba(0, 153, 187, 0.02) 40%, transparent 70%)',
          filter: 'blur(80px)',
          zIndex: 0,
        }}
      />

      {/* Glow suave — canto superior esquerdo (equilíbrio visual) */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-8%',
          left: '10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(0, 229, 255, 0.04) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(0, 153, 187, 0.025) 0%, transparent 70%)',
          filter: 'blur(100px)',
          zIndex: 0,
        }}
      />
    </>
  );
}

/**
 * Hook utilitário para obter/definir o estilo de fundo
 */
export function useBgStyle() {
  const [bgStyle, setBgStyle] = React.useState<BgStyle>(getBgStyle);

  const setStyle = React.useCallback((style: BgStyle) => {
    localStorage.setItem("dentcare-bg-style", style);
    setBgStyle(style);
    // Disparar evento customizado para atualizar em tempo real
    window.dispatchEvent(new Event("dentcare-bg-change"));
  }, []);

  return { bgStyle, setStyle };
}
