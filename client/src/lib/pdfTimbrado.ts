/**
 * pdfTimbrado.ts — Utilitário de Papel Timbrado para PDFs
 * DentCare Elite V32.3
 *
 * Aplica papel timbrado profissional a todos os PDFs gerados pelo sistema.
 * Layout inspirado em papel timbrado de clínica dentária:
 * - Barra lateral esquerda azul decorativa
 * - Logo da clínica no canto superior direito
 * - Nome da clínica e informações no cabeçalho
 * - Barra inferior com contactos (telefone, email, morada)
 * - Linha decorativa inferior
 *
 * Uso:
 *   import { aplicarTimbrado, aplicarRodapeTimbrado } from "../lib/pdfTimbrado";
 *   aplicarTimbrado(doc, { nomeClinica, logoBase64, ... });
 *   // ... conteúdo do PDF ...
 *   aplicarRodapeTimbrado(doc, { telefone, email, morada, website });
 */
import type { jsPDF } from "jspdf";

// ─── Cores do Timbrado ──────────────────────────────────────────────────────
const TIMBRADO_COLORS = {
  barraLateral: [25, 55, 109] as [number, number, number],     // Azul escuro
  barraInferior: [66, 133, 200] as [number, number, number],   // Azul claro
  textoNome: [25, 55, 109] as [number, number, number],        // Azul escuro
  textoSecundario: [100, 110, 130] as [number, number, number], // Cinza
  textoRodape: [80, 90, 110] as [number, number, number],      // Cinza escuro
  iconRodape: [66, 133, 200] as [number, number, number],      // Azul claro
  linhaFina: [200, 210, 225] as [number, number, number],      // Cinza claro
};

export interface TimbradoConfig {
  nomeClinica: string;
  logoBase64?: string;       // data:image/...;base64,...
  nifClinica?: string;
  emailClinica?: string;
  telefoneClinica?: string;
  moradaClinica?: string;
  cidadeClinica?: string;
  codigoPostalClinica?: string;
  websiteClinica?: string;
}

/**
 * Aplica o cabeçalho do papel timbrado ao PDF.
 * Retorna a posição Y a partir da qual o conteúdo deve começar.
 */
export function aplicarTimbrado(doc: jsPDF, config: TimbradoConfig): number {
  const pageWidth = 210; // A4 mm
  const pageHeight = 297;

  // ─── Barra lateral esquerda (decorativa) ─────────────────────────────────
  doc.setFillColor(
    TIMBRADO_COLORS.barraLateral[0],
    TIMBRADO_COLORS.barraLateral[1],
    TIMBRADO_COLORS.barraLateral[2]
  );
  doc.rect(0, 0, 5, pageHeight, "F");

  // ─── Logo no canto superior direito ──────────────────────────────────────
  if (config.logoBase64 && config.logoBase64.startsWith("data:image")) {
    try {
      // Extrair o formato da imagem
      const formatMatch = config.logoBase64.match(/data:image\/(png|jpeg|jpg|webp)/i);
      const format = formatMatch ? formatMatch[1].toUpperCase().replace("JPG", "JPEG") : "PNG";

      // Adicionar logo — tamanho máximo 40x20mm no canto superior direito
      doc.addImage(
        config.logoBase64,
        format as "PNG" | "JPEG",
        155,  // x: canto direito
        8,    // y: topo
        40,   // largura máxima
        20,   // altura máxima
        undefined,
        "FAST"
      );
    } catch (err) {
      console.warn("[Timbrado] Erro ao adicionar logo ao PDF:", err);
    }
  }

  // ─── Nome da clínica (canto superior direito, abaixo da logo) ────────────
  let headerY = config.logoBase64 ? 34 : 15;

  doc.setTextColor(
    TIMBRADO_COLORS.textoNome[0],
    TIMBRADO_COLORS.textoNome[1],
    TIMBRADO_COLORS.textoNome[2]
  );
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(config.nomeClinica || "Clínica Dentária", pageWidth - 15, headerY, { align: "right" });

  // ─── NIF (se disponível) ─────────────────────────────────────────────────
  if (config.nifClinica) {
    headerY += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(
      TIMBRADO_COLORS.textoSecundario[0],
      TIMBRADO_COLORS.textoSecundario[1],
      TIMBRADO_COLORS.textoSecundario[2]
    );
    doc.text(`NIF: ${config.nifClinica}`, pageWidth - 15, headerY, { align: "right" });
  }

  // ─── Linha separadora horizontal ─────────────────────────────────────────
  headerY += 6;
  doc.setDrawColor(
    TIMBRADO_COLORS.linhaFina[0],
    TIMBRADO_COLORS.linhaFina[1],
    TIMBRADO_COLORS.linhaFina[2]
  );
  doc.setLineWidth(0.3);
  doc.line(12, headerY, pageWidth - 15, headerY);

  // Retornar posição Y para o conteúdo começar
  return headerY + 8;
}

/**
 * Aplica o rodapé do papel timbrado a todas as páginas do PDF.
 * Deve ser chamado DEPOIS de todo o conteúdo ter sido adicionado.
 */
export function aplicarRodapeTimbrado(doc: jsPDF, config: TimbradoConfig): void {
  const pageWidth = 210;
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // ─── Barra lateral esquerda (em todas as páginas) ──────────────────────
    doc.setFillColor(
      TIMBRADO_COLORS.barraLateral[0],
      TIMBRADO_COLORS.barraLateral[1],
      TIMBRADO_COLORS.barraLateral[2]
    );
    doc.rect(0, 0, 5, 297, "F");

    // ─── Linha decorativa inferior ─────────────────────────────────────────
    doc.setFillColor(
      TIMBRADO_COLORS.barraInferior[0],
      TIMBRADO_COLORS.barraInferior[1],
      TIMBRADO_COLORS.barraInferior[2]
    );
    doc.rect(0, 284, pageWidth, 1, "F");

    // ─── Informações de contacto no rodapé ─────────────────────────────────
    const rodapeY = 289;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");

    // Construir linhas de contacto
    const contactos: string[] = [];
    if (config.telefoneClinica) contactos.push(`Tel: ${config.telefoneClinica}`);
    if (config.emailClinica) contactos.push(`Email: ${config.emailClinica}`);
    if (config.websiteClinica) contactos.push(config.websiteClinica);

    const moradaCompleta: string[] = [];
    if (config.moradaClinica) moradaCompleta.push(config.moradaClinica);
    if (config.cidadeClinica) moradaCompleta.push(config.cidadeClinica);
    if (config.codigoPostalClinica) moradaCompleta.push(config.codigoPostalClinica);

    // Linha 1: Contactos
    if (contactos.length > 0) {
      doc.setTextColor(
        TIMBRADO_COLORS.textoRodape[0],
        TIMBRADO_COLORS.textoRodape[1],
        TIMBRADO_COLORS.textoRodape[2]
      );
      doc.text(contactos.join("  |  "), 12, rodapeY);
    }

    // Linha 2: Morada
    if (moradaCompleta.length > 0) {
      doc.setTextColor(
        TIMBRADO_COLORS.textoRodape[0],
        TIMBRADO_COLORS.textoRodape[1],
        TIMBRADO_COLORS.textoRodape[2]
      );
      doc.text(moradaCompleta.join(", "), 12, rodapeY + 4);
    }

    // Número da página (canto direito)
    doc.setTextColor(150, 150, 170);
    doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - 15, rodapeY + 2, { align: "right" });
  }
}

/**
 * Função utilitária que aplica timbrado completo (cabeçalho + rodapé).
 * Retorna a posição Y inicial para o conteúdo.
 *
 * Uso típico:
 *   const startY = aplicarTimbradoCompleto(doc, config);
 *   // ... adicionar conteúdo a partir de startY ...
 *   // No final, chamar aplicarRodapeTimbrado(doc, config) para o rodapé
 */
export function aplicarTimbradoCompleto(doc: jsPDF, config: TimbradoConfig): number {
  return aplicarTimbrado(doc, config);
}

/**
 * Constrói um TimbradoConfig a partir das configurações do ConfigContext.
 * Uso: const timbradoConfig = buildTimbradoConfig(config);
 */
export function buildTimbradoConfig(config: { [key: string]: string }): TimbradoConfig {
  return {
    nomeClinica: config.nome_clinica || "Clínica Dentária",
    logoBase64: config.logo_clinica || "",
    nifClinica: config.nif_clinica || "",
    emailClinica: config.email_clinica || "",
    telefoneClinica: config.telefone_clinica || "",
    moradaClinica: config.morada_clinica || "",
    cidadeClinica: config.cidade_clinica || "",
    codigoPostalClinica: config.codigo_postal_clinica || "",
    websiteClinica: config.website_clinica || "",
  };
}
