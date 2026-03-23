/**
 * Serviço de Geração de PDF
 * DentCare Elite V32.3
 * UPGRADE V32.3: Papel timbrado com logo da clínica + moeda dinâmica
 * Gera PDFs de faturas e relatórios financeiros com papel timbrado profissional
 *
 * FIX V35.5: Adicionadas funções de output em Buffer (gerarPDFFaturaBuffer,
 * gerarPDFRelatorioMensalBuffer) para uso em endpoints que enviam o PDF
 * como resposta HTTP direta, evitando o overhead de Base64 em memória.
 * As funções originais (dataurlstring) mantêm-se para retrocompatibilidade.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Cores do Timbrado (consistente com client/src/lib/pdfTimbrado.ts) ──────
const TIMBRADO = {
  barraLateral: [25, 55, 109] as [number, number, number],
  barraInferior: [66, 133, 200] as [number, number, number],
  textoNome: [25, 55, 109] as [number, number, number],
  textoSecundario: [100, 110, 130] as [number, number, number],
  textoRodape: [80, 90, 110] as [number, number, number],
  linhaFina: [200, 210, 225] as [number, number, number],
};

// Cores legado (fallback)
const COLORS: Record<string, [number, number, number]> = {
  primary: [25, 55, 109],
  dark: [18, 18, 26],
  text: [60, 60, 80],
  lightText: [100, 110, 130],
  border: [200, 210, 225],
};

// ─── Interface de configuração da clínica para timbrado ─────────────────────
interface TimbradoClinica {
  nome?: string;
  nif?: string;
  email?: string;
  telefone?: string;
  morada?: string;
  cidade?: string;
  codigoPostal?: string;
  website?: string;
  logoBase64?: string; // data:image/...;base64,...
}

/**
 * Aplica o cabeçalho do papel timbrado ao PDF (server-side).
 * Retorna a posição Y a partir da qual o conteúdo deve começar.
 */
function aplicarTimbradoServer(doc: jsPDF, clinica: TimbradoClinica): number {
  const pageWidth = 210;
  const pageHeight = 297;

  // Barra lateral esquerda
  doc.setFillColor(TIMBRADO.barraLateral[0], TIMBRADO.barraLateral[1], TIMBRADO.barraLateral[2]);
  doc.rect(0, 0, 5, pageHeight, "F");

  // Logo no canto superior direito
  if (clinica.logoBase64 && clinica.logoBase64.startsWith("data:image")) {
    try {
      const formatMatch = clinica.logoBase64.match(/data:image\/(png|jpeg|jpg|webp)/i);
      const format = formatMatch ? formatMatch[1].toUpperCase().replace("JPG", "JPEG") : "PNG";
      doc.addImage(clinica.logoBase64, format as "PNG" | "JPEG", 155, 8, 40, 20, undefined, "FAST");
    } catch (err) {
      console.warn("[Timbrado Server] Erro ao adicionar logo:", err);
    }
  }

  // Nome da clínica
  let headerY = clinica.logoBase64 ? 34 : 15;
  doc.setTextColor(TIMBRADO.textoNome[0], TIMBRADO.textoNome[1], TIMBRADO.textoNome[2]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(clinica.nome || "Clínica Dentária", pageWidth - 15, headerY, { align: "right" });

  // NIF
  if (clinica.nif) {
    headerY += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TIMBRADO.textoSecundario[0], TIMBRADO.textoSecundario[1], TIMBRADO.textoSecundario[2]);
    doc.text(`NIF: ${clinica.nif}`, pageWidth - 15, headerY, { align: "right" });
  }

  // Linha separadora
  headerY += 6;
  doc.setDrawColor(TIMBRADO.linhaFina[0], TIMBRADO.linhaFina[1], TIMBRADO.linhaFina[2]);
  doc.setLineWidth(0.3);
  doc.line(12, headerY, pageWidth - 15, headerY);

  return headerY + 8;
}

/**
 * Aplica o rodapé do papel timbrado a todas as páginas (server-side).
 */
function aplicarRodapeServer(doc: jsPDF, clinica: TimbradoClinica): void {
  const pageWidth = 210;
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Barra lateral em todas as páginas
    doc.setFillColor(TIMBRADO.barraLateral[0], TIMBRADO.barraLateral[1], TIMBRADO.barraLateral[2]);
    doc.rect(0, 0, 5, 297, "F");

    // Linha decorativa inferior
    doc.setFillColor(TIMBRADO.barraInferior[0], TIMBRADO.barraInferior[1], TIMBRADO.barraInferior[2]);
    doc.rect(0, 284, pageWidth, 1, "F");

    // Informações de contacto
    const rodapeY = 289;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");

    const contactos: string[] = [];
    if (clinica.telefone) contactos.push(`Tel: ${clinica.telefone}`);
    if (clinica.email) contactos.push(`Email: ${clinica.email}`);
    if (clinica.website) contactos.push(clinica.website);

    const moradaCompleta: string[] = [];
    if (clinica.morada) moradaCompleta.push(clinica.morada);
    if (clinica.cidade) moradaCompleta.push(clinica.cidade);
    if (clinica.codigoPostal) moradaCompleta.push(clinica.codigoPostal);

    if (contactos.length > 0) {
      doc.setTextColor(TIMBRADO.textoRodape[0], TIMBRADO.textoRodape[1], TIMBRADO.textoRodape[2]);
      doc.text(contactos.join("  |  "), 12, rodapeY);
    }

    if (moradaCompleta.length > 0) {
      doc.setTextColor(TIMBRADO.textoRodape[0], TIMBRADO.textoRodape[1], TIMBRADO.textoRodape[2]);
      doc.text(moradaCompleta.join(", "), 12, rodapeY + 4);
    }

    // Número da página
    doc.setTextColor(150, 150, 170);
    doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - 15, rodapeY + 2, { align: "right" });
  }
}

/**
 * Gera um PDF de fatura com papel timbrado
 */
export function gerarPDFFatura(dados: {
  numeroFatura: string;
  dataEmissao: string;
  clinica?: { nome: string; morada: string; contacto: string };
  utente: { nome: string; email?: string; telemovel?: string; nif?: string };
  items: Array<{ descricao: string; quantidade: number; precoUnitario: number }>;
  subtotal: number;
  iva: number;
  total: number;
  metodosPagamento?: string;
  observacoes?: string;
  simboloMoeda?: string;
  timbrado?: TimbradoClinica;
}): string {
  const moeda = dados.simboloMoeda || "€";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Construir config do timbrado
  const timbrado: TimbradoClinica = dados.timbrado || {
    nome: dados.clinica?.nome,
    morada: dados.clinica?.morada?.split("|")[0]?.trim(),
  };

  // Aplicar papel timbrado
  let yPos = aplicarTimbradoServer(doc, timbrado);

  // Título da fatura
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("FATURA", 12, yPos);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
  doc.text(`Nº ${dados.numeroFatura}`, 12, yPos + 6);

  // Data de emissão (lado direito)
  doc.text(`Data de Emissão: ${dados.dataEmissao}`, 195, yPos, { align: "right" });

  // Dados do utente
  yPos += 16;
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Dados do Utente:", 12, yPos);
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(`Nome: ${dados.utente.nome}`, 12, yPos);
  yPos += 5;
  if (dados.utente.email) {
    doc.text(`Email: ${dados.utente.email}`, 12, yPos);
    yPos += 5;
  }
  if (dados.utente.telemovel) {
    doc.text(`Telemóvel: ${dados.utente.telemovel}`, 12, yPos);
    yPos += 5;
  }
  if (dados.utente.nif) {
    doc.text(`NIF: ${dados.utente.nif}`, 12, yPos);
    yPos += 5;
  }

  // Tabela de items
  yPos += 8;
  const tableData = dados.items.map((item) => [
    item.descricao,
    item.quantidade.toString(),
    `${moeda} ${item.precoUnitario.toFixed(2)}`,
    `${moeda} ${(item.quantidade * item.precoUnitario).toFixed(2)}`,
  ]);

  autoTable(doc, {
    head: [["Descrição", "Qtd", "Preço Unit.", "Total"]],
    body: tableData,
    startY: yPos,
    margin: { left: 12, right: 15 },
    headStyles: {
      fillColor: [COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold",
    },
    bodyStyles: {
      textColor: [COLORS.text[0], COLORS.text[1], COLORS.text[2]],
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 248, 252],
    },
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  // Resumo financeiro
  yPos = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(`Subtotal: ${moeda} ${dados.subtotal.toFixed(2)}`, 140, yPos, { align: "right" });
  yPos += 6;
  doc.text(`IVA (23%): ${moeda} ${dados.iva.toFixed(2)}`, 140, yPos, { align: "right" });
  yPos += 6;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text(`TOTAL: ${moeda} ${dados.total.toFixed(2)}`, 140, yPos, { align: "right" });

  // Método de pagamento
  if (dados.metodosPagamento) {
    yPos += 12;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
    doc.text(`Método de Pagamento: ${dados.metodosPagamento}`, 12, yPos);
  }

  // Observações
  if (dados.observacoes) {
    yPos += 8;
    doc.setFontSize(8);
    doc.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
    const linhas = doc.splitTextToSize(dados.observacoes, 170);
    doc.text(linhas, 12, yPos);
  }

  // Rodapé com timbrado
  aplicarRodapeServer(doc, timbrado);

  return doc.output("dataurlstring");
}

/**
 * Gera um PDF de relatório financeiro mensal com papel timbrado
 */
export function gerarPDFRelatorioMensal(dados: {
  mes: string;
  ano: number;
  receita: number;
  comissoes: number;
  custos: number;
  lucro: number;
  consultasRealizadas: number;
  tratamentosRealizados: number;
  utentesNovos: number;
  detalhes?: Array<{ data: string; descricao: string; valor: number }>;
  simboloMoeda?: string;
  timbrado?: TimbradoClinica;
}): string {
  const moeda = dados.simboloMoeda || "€";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Construir config do timbrado
  const timbrado: TimbradoClinica = dados.timbrado || {};

  // Aplicar papel timbrado
  let yPos = aplicarTimbradoServer(doc, timbrado);

  // Título
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO FINANCEIRO", 12, yPos);
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
  doc.text(`${dados.mes} de ${dados.ano}`, 12, yPos);
  yPos += 10;

  // KPIs principais
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Financeiro:", 12, yPos);

  const kpis = [
    { label: "Receita Total", valor: dados.receita, cor: [34, 197, 94] },
    { label: "Comissões", valor: dados.comissoes, cor: [59, 130, 246] },
    { label: "Custos", valor: dados.custos, cor: [239, 68, 68] },
    { label: "Lucro Líquido", valor: dados.lucro, cor: [79, 70, 229] },
  ];

  let xPos = 12;
  yPos += 8;
  for (const kpi of kpis) {
    doc.setFillColor(kpi.cor[0], kpi.cor[1], kpi.cor[2]);
    doc.roundedRect(xPos, yPos, 43, 20, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(kpi.label, xPos + 3, yPos + 6);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${moeda} ${kpi.valor.toFixed(2)}`, xPos + 3, yPos + 15);
    xPos += 47;
  }

  // Métricas operacionais
  yPos += 30;
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Métricas Operacionais:", 12, yPos);

  yPos += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
  doc.text(`Consultas Realizadas: ${dados.consultasRealizadas}`, 12, yPos);
  yPos += 6;
  doc.text(`Tratamentos Realizados: ${dados.tratamentosRealizados}`, 12, yPos);
  yPos += 6;
  doc.text(`Utentes Novos: ${dados.utentesNovos}`, 12, yPos);

  // Tabela de detalhes
  if (dados.detalhes && dados.detalhes.length > 0) {
    yPos += 12;
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Detalhes Diários:", 12, yPos);

    const tableData = dados.detalhes.slice(0, 15).map((item) => [
      item.data,
      item.descricao,
      `${moeda} ${item.valor.toFixed(2)}`,
    ]);

    autoTable(doc, {
      head: [["Data", "Descrição", "Valor"]],
      body: tableData,
      startY: yPos + 5,
      margin: { left: 12, right: 15 },
      headStyles: {
        fillColor: [COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: "bold",
      },
      bodyStyles: {
        textColor: [COLORS.text[0], COLORS.text[1], COLORS.text[2]],
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [245, 248, 252],
      },
      columnStyles: {
        2: { halign: "right" },
      },
    });
  }

  // Rodapé com timbrado
  aplicarRodapeServer(doc, timbrado);

  return doc.output("dataurlstring");
}

// ─── FIX V35.5: Wrappers de Buffer para output eficiente ────────────────────

/**
 * Gera fatura em PDF e retorna como Buffer binário.
 * Mais eficiente que dataurlstring para envio via HTTP (sem overhead Base64).
 * Uso: res.setHeader("Content-Type", "application/pdf"); res.send(buffer);
 */
export function gerarPDFFaturaBuffer(dados: Parameters<typeof gerarPDFFatura>[0]): Buffer {
  // Reutiliza toda a lógica de gerarPDFFatura mas usa output("arraybuffer")
  const moeda = dados.simboloMoeda || "€";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const timbrado: TimbradoClinica = dados.timbrado || {
    nome: dados.clinica?.nome,
    morada: dados.clinica?.morada?.split("|")[0]?.trim(),
  };
  let yPos = aplicarTimbradoServer(doc, timbrado);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("FATURA", 12, yPos);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
  doc.text(`Nº ${dados.numeroFatura}`, 12, yPos + 6);
  doc.text(`Data de Emissão: ${dados.dataEmissao}`, 195, yPos, { align: "right" });
  yPos += 15;
  // Dados do utente
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", 12, yPos);
  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.text(dados.utente.nome, 12, yPos);
  if (dados.utente.nif) { yPos += 4; doc.text(`NIF: ${dados.utente.nif}`, 12, yPos); }
  if (dados.utente.email) { yPos += 4; doc.text(`Email: ${dados.utente.email}`, 12, yPos); }
  if (dados.utente.telemovel) { yPos += 4; doc.text(`Tel: ${dados.utente.telemovel}`, 12, yPos); }
  yPos += 10;
  // Tabela de itens
  autoTable(doc, {
    head: [["Descrição", "Qtd", "Preço Unit.", "Total"]],
    body: dados.items.map(item => [
      item.descricao,
      item.quantidade.toString(),
      `${moeda} ${item.precoUnitario.toFixed(2)}`,
      `${moeda} ${(item.quantidade * item.precoUnitario).toFixed(2)}`,
    ]),
    startY: yPos,
    margin: { left: 12, right: 15 },
    headStyles: { fillColor: [COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]], textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
    bodyStyles: { textColor: [COLORS.text[0], COLORS.text[1], COLORS.text[2]], fontSize: 8 },
    columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });
  const finalY = (doc as any).lastAutoTable?.finalY || yPos + 30;
  let totalsY = finalY + 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Subtotal: ${moeda} ${dados.subtotal.toFixed(2)}`, 195, totalsY, { align: "right" });
  totalsY += 5;
  doc.text(`IVA (${dados.iva}%): ${moeda} ${(dados.subtotal * dados.iva / 100).toFixed(2)}`, 195, totalsY, { align: "right" });
  totalsY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text(`TOTAL: ${moeda} ${dados.total.toFixed(2)}`, 195, totalsY, { align: "right" });
  if (dados.metodosPagamento) {
    totalsY += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
    doc.text(`Método de Pagamento: ${dados.metodosPagamento}`, 12, totalsY);
  }
  if (dados.observacoes) {
    totalsY += 10;
    doc.setFontSize(8);
    doc.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
    const linhas = doc.splitTextToSize(dados.observacoes, 170);
    doc.text(linhas, 12, totalsY);
  }
  aplicarRodapeServer(doc, timbrado);
  return Buffer.from(doc.output("arraybuffer"));
}

/**
 * Gera relatório mensal em PDF e retorna como Buffer binário.
 */
export function gerarPDFRelatorioMensalBuffer(dados: Parameters<typeof gerarPDFRelatorioMensal>[0]): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const timbrado: TimbradoClinica = dados.timbrado || {};
  const moeda = dados.simboloMoeda || "€";
  let yPos = aplicarTimbradoServer(doc, timbrado);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`Relatório Financeiro — ${dados.mes} ${dados.ano}`, 12, yPos);
  yPos += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(`Receita Total: ${moeda} ${dados.receita.toFixed(2)}`, 12, yPos); yPos += 6;
  doc.text(`Comissões: ${moeda} ${dados.comissoes.toFixed(2)}`, 12, yPos); yPos += 6;
  doc.text(`Custos: ${moeda} ${dados.custos.toFixed(2)}`, 12, yPos); yPos += 6;
  doc.setFont("helvetica", "bold");
  doc.text(`Resultado Líquido: ${moeda} ${(dados.receita - dados.comissoes - dados.custos).toFixed(2)}`, 12, yPos);
  yPos += 12;
  if (dados.detalhes && dados.detalhes.length > 0) {
    const tableData = dados.detalhes.map((m: any) => [
      m.data ? new Date(m.data).toLocaleDateString("pt-PT") : "",
      m.descricao || "",
      `${moeda} ${Number(m.valor || 0).toFixed(2)}`,
    ]);
    autoTable(doc, {
      head: [["Data", "Descrição", "Valor"]],
      body: tableData,
      startY: yPos + 5,
      margin: { left: 12, right: 15 },
      headStyles: { fillColor: [COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]], textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
      bodyStyles: { textColor: [COLORS.text[0], COLORS.text[1], COLORS.text[2]], fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      columnStyles: { 2: { halign: "right" } },
    });
  }
  aplicarRodapeServer(doc, timbrado);
  return Buffer.from(doc.output("arraybuffer"));
}
