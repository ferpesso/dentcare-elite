/**
 * MCP Tools — Clínica e Faturação
 * DentCare V33
 *
 * Conectores que permitem à IA aceder a dados clínicos,
 * registar evoluções e gerar relatórios financeiros.
 *
 * Reutiliza: ficha-utente.ts, tratamentos.ts, financeiro.ts, dashboard.ts
 */

import type { MCPToolDefinition, MCPToolResult, MCPContext } from "../mcpServer";
import { getDb } from "../../db";
import {
  utentes,
  consultas,
  tratamentos,
  anamneses,
  medicos,
  evolucoes,
  faturas,
  pagamentos,
} from "../../../drizzle/schema";
import { eq, desc, gte, lte, and, sql, count, sum } from "drizzle-orm";
import { invocarIA, getBestAvailableConfig } from "../../services/iaService";

// ─── Tools Clínicas ──────────────────────────────────────────────────────────

const obterResumoPaciente: MCPToolDefinition = {
  name: "obter_resumo_paciente",
  description: "Obtém um resumo completo do paciente incluindo dados pessoais, alergias, histórico de tratamentos, evoluções clínicas e alertas. Ideal para preparação de consulta (Voice Briefing).",
  parameters: {
    type: "object",
    properties: {
      utenteId: {
        type: "string",
        description: "ID do utente na base de dados.",
      },
      incluirIA: {
        type: "string",
        description: "Se deve gerar um briefing inteligente por IA com alertas e recomendações.",
        enum: ["sim", "nao"],
        default: "sim",
      },
    },
    required: ["utenteId"],
  },
  category: "clinica",
  requiresAuth: true,
  handler: async (args, _context): Promise<MCPToolResult> => {
    const db = await getDb();
    if (!db) return { success: false, error: "Base de dados indisponível" };

    const utenteId = parseInt(args.utenteId as string);

    // Dados do utente
    const [utente] = await db.select().from(utentes).where(eq(utentes.id, utenteId)).limit(1);
    if (!utente) return { success: false, error: `Utente ${utenteId} não encontrado.` };

    // Anamnese mais recente
    const [anamnese] = await db
      .select()
      .from(anamneses)
      .where(eq(anamneses.utenteId, utenteId))
      .orderBy(desc(anamneses.createdAt))
      .limit(1);

    // Últimos tratamentos
    const tratamentosRecentes = await db
      .select()
      .from(tratamentos)
      .where(eq(tratamentos.utenteId, utenteId))
      .orderBy(desc(tratamentos.dataInicio))
      .limit(10);

    // Últimas evoluções
    const evolucoesRecentes = await db
      .select()
      .from(evolucoes)
      .orderBy(desc(evolucoes.data))
      .limit(5);

    // Próximas consultas
    const proximasConsultas = await db
      .select({
        id: consultas.id,
        dataHoraInicio: consultas.dataHoraInicio,
        tipoConsulta: consultas.tipoConsulta,
        estado: consultas.estado,
        medicoNome: medicos.nome,
      })
      .from(consultas)
      .innerJoin(medicos, eq(consultas.medicoId, medicos.id))
      .where(
        and(
          eq(consultas.utenteId, utenteId),
          gte(consultas.dataHoraInicio, new Date()),
          eq(consultas.estado, "agendada")
        )
      )
      .orderBy(consultas.dataHoraInicio)
      .limit(3);

    // Construir resumo
    const resumo: any = {
      dadosPessoais: {
        nome: utente.nome,
        dataNascimento: utente.dataNascimento,
        genero: utente.genero,
        telemovel: utente.telemovel,
        email: utente.email,
        observacoes: utente.observacoes,
      },
      anamnese: anamnese ? {
        alergias: anamnese.alergiasDetectadas,
        problemasSaude: anamnese.problemasSaude,
        dataPreenchimento: anamnese.createdAt,
      } : null,
      tratamentos: tratamentosRecentes.map(t => ({
        descricao: t.descricao,
        estado: t.estado,
        dataInicio: t.dataInicio,
        valor: t.valorBruto,
      })),
      evolucoes: evolucoesRecentes.map(e => ({
        descricao: e.descricao,
        data: e.data,
        profissional: e.profissional,
      })),
      proximasConsultas: proximasConsultas.map(c => ({
        data: c.dataHoraInicio,
        tipo: c.tipoConsulta,
        medico: c.medicoNome,
        estado: c.estado,
      })),
    };

    // Gerar briefing IA se solicitado
    let briefingIA = null;
    if (args.incluirIA !== "nao") {
      try {
        const config = getBestAvailableConfig();
        if (config.ativo || config.apiKey) {
          let idade = "";
          if (utente.dataNascimento) {
            const anos = Math.floor((Date.now() - new Date(utente.dataNascimento).getTime()) / (365.25 * 24 * 3600 * 1000));
            idade = `${anos} anos`;
          }

          const prompt = `Gera um briefing clínico conciso para o médico dentista sobre este paciente:
Nome: ${utente.nome}, ${utente.genero || "género não especificado"}, ${idade}
Alergias: ${anamnese?.alergiasDetectadas || "Nenhuma registada"}
Problemas de saúde: ${anamnese?.problemasSaude || "Nenhum registado"}
Tratamentos recentes: ${tratamentosRecentes.map(t => t.descricao).join(", ") || "Nenhum"}
Observações: ${utente.observacoes || "Nenhuma"}

Inclui: alertas de saúde importantes, recomendações e cuidados especiais. Sê direto e prático.`;

          const resultado = await invocarIA(prompt, config, "clinico");
          briefingIA = resultado.resposta;
        }
      } catch {
        // Não falhar se IA não estiver disponível
      }
    }

    return {
      success: true,
      data: { ...resumo, briefingIA },
      message: `Resumo do paciente ${utente.nome} obtido com sucesso.${briefingIA ? " Briefing IA incluído." : ""}`,
    };
  },
};

const registarEvolucao: MCPToolDefinition = {
  name: "registar_evolucao",
  description: "Regista uma evolução clínica na ficha do paciente. Pode ser usado para ditado clínico — o médico dita e a IA estrutura o texto profissionalmente.",
  parameters: {
    type: "object",
    properties: {
      tratamentoId: {
        type: "string",
        description: "ID do tratamento associado.",
      },
      descricao: {
        type: "string",
        description: "Descrição da evolução clínica. Pode ser texto ditado que será estruturado pela IA.",
      },
      anotacoes: {
        type: "string",
        description: "Anotações adicionais (opcional).",
      },
      profissional: {
        type: "string",
        description: "Nome do profissional responsável.",
      },
      usarIA: {
        type: "string",
        description: "Se deve usar IA para estruturar e profissionalizar o texto ditado.",
        enum: ["sim", "nao"],
        default: "nao",
      },
    },
    required: ["tratamentoId", "descricao", "profissional"],
  },
  category: "clinica",
  requiresAuth: true,
  handler: async (args, context): Promise<MCPToolResult> => {
    const db = await getDb();
    if (!db) return { success: false, error: "Base de dados indisponível" };

    let descricaoFinal = args.descricao as string;

    // Usar IA para estruturar o texto se solicitado
    if (args.usarIA === "sim") {
      try {
        const config = getBestAvailableConfig();
        if (config.ativo || config.apiKey) {
          const prompt = `Estrutura esta nota clínica ditada por um médico dentista de forma profissional e organizada. 
Mantém toda a informação clínica, mas melhora a redação para registo clínico formal em português europeu.
Não adiciones informação que não esteja no texto original.

Texto ditado: "${args.descricao}"

Responde APENAS com o texto estruturado, sem explicações.`;

          const resultado = await invocarIA(prompt, config, "clinico");
          descricaoFinal = resultado.resposta;
        }
      } catch {
        // Usar texto original se IA falhar
      }
    }

    // Inserir evolução
    await db.insert(evolucoes).values({
      tratamentoId: BigInt(parseInt(args.tratamentoId as string)) as any,
      descricao: descricaoFinal,
      anotacoes: (args.anotacoes as string) || null,
      data: new Date(),
      profissional: args.profissional as string,
      criadoPor: BigInt(context.userId || 0) as any,
    });

    return {
      success: true,
      message: `Evolução clínica registada com sucesso.${args.usarIA === "sim" ? " Texto estruturado pela IA." : ""}`,
      data: {
        tratamentoId: args.tratamentoId,
        descricao: descricaoFinal,
        profissional: args.profissional,
        estruturadoPorIA: args.usarIA === "sim",
      },
    };
  },
};

const gerarRelatorioFinanceiro: MCPToolDefinition = {
  name: "gerar_relatorio_financeiro",
  description: "Gera um relatório financeiro detalhado da clínica com faturação, pagamentos, comparações mensais e insights. Pode filtrar por período, especialidade ou médico.",
  parameters: {
    type: "object",
    properties: {
      periodo: {
        type: "string",
        description: "Período do relatório.",
        enum: ["hoje", "semana", "mes", "trimestre", "ano"],
        default: "mes",
      },
      medicoId: {
        type: "string",
        description: "Filtrar por médico específico (opcional).",
      },
      compararAnterior: {
        type: "string",
        description: "Se deve comparar com o período anterior.",
        enum: ["sim", "nao"],
        default: "sim",
      },
    },
    required: [],
  },
  category: "financeiro",
  requiresAuth: true,
  handler: async (args, _context): Promise<MCPToolResult> => {
    const db = await getDb();
    if (!db) return { success: false, error: "Base de dados indisponível" };

    // Calcular datas do período
    const agora = new Date();
    let dataInicio: Date;
    let dataInicioAnterior: Date;
    let dataFimAnterior: Date;

    switch (args.periodo) {
      case "hoje":
        dataInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        dataInicioAnterior = new Date(dataInicio);
        dataInicioAnterior.setDate(dataInicioAnterior.getDate() - 1);
        dataFimAnterior = new Date(dataInicio);
        break;
      case "semana":
        dataInicio = new Date(agora);
        dataInicio.setDate(agora.getDate() - 7);
        dataInicioAnterior = new Date(dataInicio);
        dataInicioAnterior.setDate(dataInicioAnterior.getDate() - 7);
        dataFimAnterior = new Date(dataInicio);
        break;
      case "trimestre":
        dataInicio = new Date(agora);
        dataInicio.setMonth(agora.getMonth() - 3);
        dataInicioAnterior = new Date(dataInicio);
        dataInicioAnterior.setMonth(dataInicioAnterior.getMonth() - 3);
        dataFimAnterior = new Date(dataInicio);
        break;
      case "ano":
        dataInicio = new Date(agora.getFullYear(), 0, 1);
        dataInicioAnterior = new Date(agora.getFullYear() - 1, 0, 1);
        dataFimAnterior = new Date(agora.getFullYear(), 0, 1);
        break;
      default: // mes
        dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
        dataInicioAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
        dataFimAnterior = new Date(dataInicio);
    }

    // Faturação do período atual
    const faturasAtual = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${faturas.valorTotal} AS DECIMAL(10,2))), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(faturas)
      .where(gte(faturas.dataEmissao, dataInicio));

    // Faturação do período anterior (para comparação)
    let faturasAnterior = null;
    if (args.compararAnterior !== "nao") {
      faturasAnterior = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${faturas.valorTotal} AS DECIMAL(10,2))), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(faturas)
        .where(
          and(
            gte(faturas.dataEmissao, dataInicioAnterior),
            lte(faturas.dataEmissao, dataFimAnterior)
          )
        );
    }

    // Pagamentos recebidos
    const pagamentosRecebidos = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${pagamentos.valor} AS DECIMAL(10,2))), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(pagamentos)
      .where(
        and(
          gte(pagamentos.data, dataInicio),
          eq(pagamentos.estado, "pago")
        )
      );

    // Consultas realizadas
    const consultasRealizadas = await db
      .select({
        total: sql<number>`COUNT(*)`,
        realizadas: sql<number>`SUM(CASE WHEN ${consultas.estado} = 'realizada' THEN 1 ELSE 0 END)`,
        noShows: sql<number>`SUM(CASE WHEN ${consultas.estado} = 'no-show' THEN 1 ELSE 0 END)`,
        canceladas: sql<number>`SUM(CASE WHEN ${consultas.estado} = 'cancelada' THEN 1 ELSE 0 END)`,
      })
      .from(consultas)
      .where(gte(consultas.dataHoraInicio, dataInicio));

    // Construir relatório
    const totalAtual = Number(faturasAtual[0]?.total) || 0;
    const totalAnterior = faturasAnterior ? (Number(faturasAnterior[0]?.total) || 0) : 0;
    const variacao = totalAnterior > 0 ? ((totalAtual - totalAnterior) / totalAnterior * 100).toFixed(1) : null;

    const relatorio = {
      periodo: args.periodo || "mes",
      faturacao: {
        total: totalAtual,
        numeroFaturas: Number(faturasAtual[0]?.count) || 0,
        ticketMedio: (Number(faturasAtual[0]?.count) || 0) > 0
          ? (totalAtual / Number(faturasAtual[0]?.count)).toFixed(2)
          : "0.00",
      },
      comparacao: faturasAnterior ? {
        totalAnterior,
        variacao: variacao ? `${variacao}%` : "N/A",
        tendencia: totalAtual > totalAnterior ? "crescimento" : totalAtual < totalAnterior ? "decrescimo" : "estavel",
      } : null,
      pagamentos: {
        totalRecebido: Number(pagamentosRecebidos[0]?.total) || 0,
        numeroPagamentos: Number(pagamentosRecebidos[0]?.count) || 0,
      },
      consultas: {
        total: Number(consultasRealizadas[0]?.total) || 0,
        realizadas: Number(consultasRealizadas[0]?.realizadas) || 0,
        noShows: Number(consultasRealizadas[0]?.noShows) || 0,
        canceladas: Number(consultasRealizadas[0]?.canceladas) || 0,
        taxaOcupacao: (Number(consultasRealizadas[0]?.total) || 0) > 0
          ? `${((Number(consultasRealizadas[0]?.realizadas) || 0) / Number(consultasRealizadas[0]?.total) * 100).toFixed(1)}%`
          : "N/A",
      },
    };

    // Gerar insights com IA
    let insightsIA = null;
    try {
      const config = getBestAvailableConfig();
      if (config.ativo || config.apiKey) {
        const prompt = `Analisa estes dados financeiros de uma clínica dentária e fornece 3 insights práticos em português europeu:
Faturação: ${totalAtual}€ (${variacao ? `${variacao}% vs período anterior` : "sem comparação"})
Consultas: ${relatorio.consultas.realizadas} realizadas, ${relatorio.consultas.noShows} faltas, ${relatorio.consultas.canceladas} canceladas
Ticket médio: ${relatorio.faturacao.ticketMedio}€
Taxa de ocupação: ${relatorio.consultas.taxaOcupacao}

Sê conciso e prático. Foca em ações que a clínica pode tomar.`;

        const resultado = await invocarIA(prompt, config, "financeiro");
        insightsIA = resultado.resposta;
      }
    } catch {}

    return {
      success: true,
      data: { ...relatorio, insightsIA },
      message: `Relatório financeiro (${args.periodo || "mês"}): Faturação ${totalAtual}€${variacao ? ` (${variacao}% vs anterior)` : ""}, ${relatorio.consultas.realizadas} consultas realizadas.`,
    };
  },
};

// ─── Exportar todas as tools clínicas ────────────────────────────────────────

export const clinicaTools: MCPToolDefinition[] = [
  obterResumoPaciente,
  registarEvolucao,
  gerarRelatorioFinanceiro,
];
