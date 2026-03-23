/**
 * exportService.ts — Serviço de Exportação de Dados
 * DentCare Elite V32
 *
 * Funcionalidades:
 * - Exportação para CSV (sem dependências externas, nativo)
 * - Exportação para XLSX (via exceljs, instalado como dependência)
 * - Suporte a: Utentes, Consultas, Pagamentos, Faturação
 *
 * PONTOS NEGATIVOS HONESTOS:
 * - O XLSX gerado é básico (sem formatação avançada de células)
 * - Exportações muito grandes (>50k linhas) podem ser lentas; considerar streaming
 */

import type { Response } from "express";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export type ExportRow = Record<string, string | number | boolean | null | undefined | Date>;

// ─── CSV ──────────────────────────────────────────────────────────────────────

/**
 * Escapar valor para CSV (RFC 4180)
 */
function escapeCsvValue(value: string | number | boolean | null | undefined | Date): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return `"${value.toLocaleDateString("pt-PT")}"`;
  }
  const str = String(value);
  // Se contém vírgula, aspas ou nova linha, envolver em aspas
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes(";")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Gerar CSV a partir de colunas e linhas
 */
export function gerarCSV(colunas: ExportColumn[], linhas: ExportRow[]): string {
  const separador = ";"; // Ponto e vírgula — padrão europeu (Excel PT)

  // Cabeçalho
  const cabecalho = colunas.map((c) => escapeCsvValue(c.header)).join(separador);

  // Linhas de dados
  const corpo = linhas.map((linha) =>
    colunas.map((c) => escapeCsvValue(linha[c.key])).join(separador)
  );

  // BOM UTF-8 para compatibilidade com Excel em Windows
  return "\uFEFF" + [cabecalho, ...corpo].join("\r\n");
}

/**
 * Enviar CSV como resposta HTTP
 */
export function enviarCSV(
  res: Response,
  nomeArquivo: string,
  colunas: ExportColumn[],
  linhas: ExportRow[]
): void {
  const csv = gerarCSV(colunas, linhas);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}.csv"`);
  res.send(csv);
}

// ─── XLSX ─────────────────────────────────────────────────────────────────────

/**
 * Gerar XLSX e enviar como resposta HTTP
 * Usa exceljs (deve estar instalado: pnpm add exceljs)
 * Fallback para CSV se exceljs não estiver disponível
 */
export async function enviarXLSX(
  res: Response,
  nomeArquivo: string,
  colunas: ExportColumn[],
  linhas: ExportRow[],
  nomeSheet = "Dados"
): Promise<void> {
  try {
    // Usar a biblioteca xlsx (SheetJS) que já está nas dependências do projeto
    const XLSX = await import("xlsx").catch(() => null);

    if (!XLSX) {
      console.warn("[exportService] xlsx não disponível, a usar CSV como fallback.");
      enviarCSV(res, nomeArquivo, colunas, linhas);
      return;
    }

    // Construir array de arrays: [cabecalho, ...linhas]
    const cabecalho = colunas.map((c) => c.header);
    const dados = linhas.map((linha) =>
      colunas.map((c) => {
        const val = linha[c.key];
        if (val instanceof Date) return val.toLocaleDateString("pt-PT");
        return val ?? "";
      })
    );

    const wsData = [cabecalho, ...dados];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Definir largura das colunas
    ws["!cols"] = colunas.map((c) => ({ wch: c.width ?? 20 }));

    // Congelar primeira linha
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nomeSheet);

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nomeArquivo}.xlsx"`
    );
    res.send(buffer);
  } catch (err: unknown) {
    console.error("[exportService] Erro ao gerar XLSX:", err);
    // Fallback para CSV em caso de erro
    enviarCSV(res, nomeArquivo, colunas, linhas);
  }
}

// ─── Definições de colunas por entidade ──────────────────────────────────────

export const COLUNAS_UTENTES: ExportColumn[] = [
  { header: "ID",           key: "id",          width: 8  },
  { header: "Nome",         key: "nome",         width: 30 },
  { header: "Email",        key: "email",        width: 30 },
  { header: "Telemóvel",    key: "telemovel",    width: 18 },
  { header: "NIF",          key: "nif",          width: 14 },
  { header: "Data Nasc.",   key: "dataNascimento", width: 14 },
  { header: "Género",       key: "genero",       width: 12 },
  { header: "Morada",       key: "morada",       width: 35 },
  { header: "Localidade",   key: "localidade",   width: 20 },
  { header: "Criado em",    key: "createdAt",    width: 18 },
];

export const COLUNAS_CONSULTAS: ExportColumn[] = [
  { header: "ID",           key: "id",              width: 8  },
  { header: "Utente",       key: "utenteNome",       width: 30 },
  { header: "Médico",       key: "medicoNome",       width: 25 },
  { header: "Data/Hora",    key: "dataHoraInicio",   width: 20 },
  { header: "Estado",       key: "estado",           width: 14 },
  { header: "Tipo",         key: "tipo",             width: 16 },
  { header: "Notas",        key: "notas",            width: 40 },
];

export const COLUNAS_PAGAMENTOS: ExportColumn[] = [
  { header: "ID",           key: "id",              width: 8  },
  { header: "Utente",       key: "utenteNome",       width: 30 },
  { header: "Valor",        key: "valor",            width: 14 },
  { header: "Método",       key: "metodo",           width: 16 },
  { header: "Estado",       key: "estado",           width: 14 },
  { header: "Data",         key: "data",             width: 18 },
  { header: "Referência",   key: "referencia",       width: 20 },
  { header: "Notas",        key: "notas",            width: 35 },
];

export const COLUNAS_FATURACAO: ExportColumn[] = [
  { header: "Nº Fatura",    key: "numero",           width: 16 },
  { header: "Utente",       key: "utenteNome",       width: 30 },
  { header: "NIF Utente",   key: "utenteNif",        width: 14 },
  { header: "Data Emissão", key: "dataEmissao",      width: 18 },
  { header: "Subtotal",     key: "subtotal",         width: 14 },
  { header: "IVA",          key: "iva",              width: 12 },
  { header: "Total",        key: "total",            width: 14 },
  { header: "Estado",       key: "estado",           width: 14 },
];
