/**
 * Automation MCP Tools — Ferramentas de Automação Inteligente
 * DentCare V35 — 100% Gratuito
 *
 * 3 novas tools de automação:
 * - gerar_lista_reactivacao: Lista inteligente de pacientes para reativar
 * - optimizar_agenda: Sugestões de otimização de horários
 * - gerar_relatorio_semanal: Relatório semanal automático com insights
 */

import type { MCPToolDefinition, MCPContext, MCPToolResult } from "../mcpServer";
import { getDb } from "../../db";
import { consultas, faturas, utentes, tratamentos, medicos } from "../../../drizzle/schema";
import { eq, and, gte, lte, sql, count, ne, lt, desc, asc } from "drizzle-orm";

// ─── Tool: Gerar Lista de Reativação ────────────────────────────────────────

const gerarListaReactivacao: MCPToolDefinition = {
  name: "gerar_lista_reactivacao",
  description: "Gera uma lista inteligente de pacientes inativos que devem ser contactados para reativação. Prioriza por valor do paciente, tempo de inatividade e tipo de último tratamento.",
  parameters: {
    type: "object",
    properties: {
      meses_inatividade: {
        type: "string",
        description: "Mínimo de meses sem consulta para considerar inativo (padrão: 6)",
        default: "6",
      },
      limite: {
        type: "string",
        description: "Número máximo de pacientes na lista (padrão: 20)",
        default: "20",
      },
      motivo: {
        type: "string",
        description: "Motivo da reativação para personalizar a mensagem",
        enum: ["check_up", "tratamento_pendente", "limpeza", "campanha", "geral"],
        default: "geral",
      },
    },
    required: [],
  },
  handler: async (args: Record<string, unknown>, _context: MCPContext): Promise<MCPToolResult> => {
    try {
      const db = await getDb();
      if (!db) return { success: false, error: "Base de dados indisponível" };

      const mesesInatividade = parseInt(String(args.meses_inatividade || "6"), 10);
      const limite = parseInt(String(args.limite || "20"), 10);
      const motivo = String(args.motivo || "geral");

      const dataLimite = new Date();
      dataLimite.setMonth(dataLimite.getMonth() - mesesInatividade);

      // Encontrar pacientes cuja última consulta foi antes da data limite
      const pacientesInativos = await db
        .select({
          id: utentes.id,
          nome: utentes.nome,
          telemovel: utentes.telemovel,
          email: utentes.email,
          ultimaConsulta: sql<Date>`MAX(${consultas.dataHoraInicio})`,
          totalConsultas: count(),
        })
        .from(utentes)
        .leftJoin(consultas, eq(utentes.id, consultas.utenteId))
        .groupBy(utentes.id, utentes.nome, utentes.telemovel, utentes.email)
        .having(sql`MAX(${consultas.dataHoraInicio}) < ${dataLimite} OR MAX(${consultas.dataHoraInicio}) IS NULL`)
        .orderBy(desc(sql`MAX(${consultas.dataHoraInicio})`))
        .limit(limite);

      // Calcular valor estimado de cada paciente
      const listaReactivacao = await Promise.all(
        pacientesInativos.map(async (p) => {
          const [valorTotal] = await db
            .select({ total: sql<string>`COALESCE(SUM(valor_total), 0)` })
            .from(faturas)
            .where(and(eq(faturas.utenteId, p.id), eq(faturas.estado, "paga")));

          const diasInativo = p.ultimaConsulta
            ? Math.floor((Date.now() - new Date(p.ultimaConsulta).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          const valorHistorico = Math.round(Number(valorTotal?.total || 0));

          // Score de prioridade: valor alto + mais tempo inativo = mais prioritário
          const prioridade = Math.min(100, Math.round(
            (valorHistorico > 500 ? 40 : valorHistorico > 200 ? 25 : 10) +
            (diasInativo > 365 ? 30 : diasInativo > 180 ? 20 : 10) +
            (p.totalConsultas > 5 ? 30 : p.totalConsultas > 2 ? 20 : 10)
          ));

          const mensagemSugerida = gerarMensagemReactivacao(p.nome, motivo, diasInativo);

          return {
            id: p.id,
            nome: p.nome,
            telefone: p.telemovel || "N/A",
            email: p.email || "N/A",
            ultimaConsulta: p.ultimaConsulta ? new Date(p.ultimaConsulta).toLocaleDateString("pt-PT") : "Nunca",
            diasInativo,
            totalConsultas: p.totalConsultas,
            valorHistorico: `${valorHistorico}€`,
            prioridade,
            mensagemSugerida,
          };
        })
      );

      // Ordenar por prioridade
      listaReactivacao.sort((a, b) => b.prioridade - a.prioridade);

      return {
        success: true,
        data: {
          total: listaReactivacao.length,
          criterio: `Inativos há mais de ${mesesInatividade} meses`,
          motivo,
          pacientes: listaReactivacao,
        },
        message: `Encontrados ${listaReactivacao.length} pacientes para reativação. O paciente mais prioritário é ${listaReactivacao[0]?.nome || "N/A"} com ${listaReactivacao[0]?.diasInativo || 0} dias de inatividade.`,
      };
    } catch (error: any) {
      return { success: false, error: `Erro ao gerar lista: ${error.message}` };
    }
  },
  category: "analytics",
  requiresAuth: true,
};

function gerarMensagemReactivacao(nome: string, motivo: string, diasInativo: number): string {
  const primeiroNome = nome.split(" ")[0];
  const mensagens: Record<string, string> = {
    check_up: `Olá ${primeiroNome}! Já passaram ${Math.floor(diasInativo / 30)} meses desde a sua última visita. Que tal agendar um check-up para garantir que está tudo bem? Temos horários disponíveis esta semana.`,
    tratamento_pendente: `Olá ${primeiroNome}! Reparámos que tem um tratamento pendente connosco. Gostaríamos de agendar a continuação para garantir os melhores resultados. Quando lhe dá jeito?`,
    limpeza: `Olá ${primeiroNome}! Está na altura da sua limpeza dentária semestral. Uma higiene regular previne problemas futuros. Quer agendar?`,
    campanha: `Olá ${primeiroNome}! Temos uma campanha especial este mês. Como nosso paciente, tem condições exclusivas. Saiba mais agendando uma consulta.`,
    geral: `Olá ${primeiroNome}! Sentimos a sua falta na clínica. Já passaram ${Math.floor(diasInativo / 30)} meses desde a última consulta. Gostaríamos de saber como está. Quer agendar uma visita?`,
  };
  return mensagens[motivo] || mensagens.geral;
}

// ─── Tool: Otimizar Agenda ──────────────────────────────────────────────────

const optimizarAgenda: MCPToolDefinition = {
  name: "optimizar_agenda",
  description: "Analisa a agenda da próxima semana e sugere otimizações: horários com baixa ocupação, redistribuição de consultas, e horários ideais para diferentes tipos de tratamento.",
  parameters: {
    type: "object",
    properties: {
      dias_analisar: {
        type: "string",
        description: "Número de dias a analisar a partir de hoje (padrão: 7)",
        default: "7",
      },
    },
    required: [],
  },
  handler: async (args: Record<string, unknown>, _context: MCPContext): Promise<MCPToolResult> => {
    try {
      const db = await getDb();
      if (!db) return { success: false, error: "Base de dados indisponível" };

      const dias = parseInt(String(args.dias_analisar || "7"), 10);
      const agora = new Date();
      const fim = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000);

      // Buscar consultas da próxima semana
      const consultasSemana = await db
        .select({
          id: consultas.id,
          dataHoraInicio: consultas.dataHoraInicio,
          dataHoraFim: consultas.dataHoraFim,
          estado: consultas.estado,
          tipoConsulta: consultas.tipoConsulta,
          medicoNome: consultas.medicoNome,
        })
        .from(consultas)
        .where(
          and(
            gte(consultas.dataHoraInicio, agora),
            lte(consultas.dataHoraInicio, fim),
            ne(consultas.estado, "cancelada")
          )
        )
        .orderBy(asc(consultas.dataHoraInicio));

      // Análise por dia da semana
      const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      const ocupacaoPorDia: Record<string, { total: number; horarios: string[] }> = {};

      for (const c of consultasSemana) {
        const dia = diasSemana[new Date(c.dataHoraInicio).getDay()];
        const hora = new Date(c.dataHoraInicio).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
        if (!ocupacaoPorDia[dia]) ocupacaoPorDia[dia] = { total: 0, horarios: [] };
        ocupacaoPorDia[dia].total++;
        ocupacaoPorDia[dia].horarios.push(hora);
      }

      // Análise por faixa horária
      const faixas: Record<string, number> = {
        "08:00-10:00": 0,
        "10:00-12:00": 0,
        "12:00-14:00": 0,
        "14:00-16:00": 0,
        "16:00-18:00": 0,
        "18:00-20:00": 0,
      };

      for (const c of consultasSemana) {
        const hora = new Date(c.dataHoraInicio).getHours();
        if (hora >= 8 && hora < 10) faixas["08:00-10:00"]++;
        else if (hora >= 10 && hora < 12) faixas["10:00-12:00"]++;
        else if (hora >= 12 && hora < 14) faixas["12:00-14:00"]++;
        else if (hora >= 14 && hora < 16) faixas["14:00-16:00"]++;
        else if (hora >= 16 && hora < 18) faixas["16:00-18:00"]++;
        else if (hora >= 18 && hora < 20) faixas["18:00-20:00"]++;
      }

      // Gerar sugestões
      const sugestoes: string[] = [];
      const faixaMinima = Object.entries(faixas).reduce((a, b) => a[1] < b[1] ? a : b);
      const faixaMaxima = Object.entries(faixas).reduce((a, b) => a[1] > b[1] ? a : b);

      if (faixaMinima[1] === 0) {
        sugestoes.push(`A faixa ${faixaMinima[0]} está vazia. Considere oferecer promoções para este horário ou reagendar consultas de horários congestionados.`);
      }

      if (faixaMaxima[1] > 5 * dias / 7) {
        sugestoes.push(`A faixa ${faixaMaxima[0]} está muito cheia (${faixaMaxima[1]} consultas). Considere redistribuir para horários com menos ocupação.`);
      }

      const totalSlots = 8 * dias; // 8 slots/dia
      const ocupacaoGeral = Math.round((consultasSemana.length / totalSlots) * 100);

      if (ocupacaoGeral < 50) {
        sugestoes.push(`Ocupação geral de apenas ${ocupacaoGeral}%. Recomenda-se campanha de reativação de pacientes inativos.`);
      } else if (ocupacaoGeral > 90) {
        sugestoes.push(`Ocupação de ${ocupacaoGeral}% — quase lotado! Considere abrir horários extra ou lista de espera.`);
      }

      // Verificar se há gaps (buracos) na agenda
      const diasComGaps: string[] = [];
      for (const [dia, info] of Object.entries(ocupacaoPorDia)) {
        if (info.total > 0 && info.total < 4) {
          diasComGaps.push(dia);
        }
      }
      if (diasComGaps.length > 0) {
        sugestoes.push(`${diasComGaps.join(", ")} têm poucos agendamentos. Tente concentrar consultas para evitar tempos mortos.`);
      }

      return {
        success: true,
        data: {
          periodoAnalisado: `${dias} dias`,
          totalConsultas: consultasSemana.length,
          ocupacaoGeral: `${ocupacaoGeral}%`,
          ocupacaoPorDia,
          faixasHorarias: faixas,
          sugestoes,
        },
        message: `Análise de ${dias} dias: ${consultasSemana.length} consultas agendadas (${ocupacaoGeral}% ocupação). ${sugestoes.length} sugestão(ões) de otimização.`,
      };
    } catch (error: any) {
      return { success: false, error: `Erro ao otimizar agenda: ${error.message}` };
    }
  },
  category: "agenda",
  requiresAuth: true,
};

// ─── Tool: Gerar Relatório Semanal ──────────────────────────────────────────

const gerarRelatorioSemanal: MCPToolDefinition = {
  name: "gerar_relatorio_semanal",
  description: "Gera um relatório semanal completo com KPIs, destaques, alertas e recomendações para a próxima semana. Ideal para reuniões de equipa.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  handler: async (_args: Record<string, unknown>, _context: MCPContext): Promise<MCPToolResult> => {
    try {
      const db = await getDb();
      if (!db) return { success: false, error: "Base de dados indisponível" };

      const agora = new Date();
      const inicioSemana = new Date(agora);
      inicioSemana.setDate(agora.getDate() - agora.getDay() + 1); // Segunda
      inicioSemana.setHours(0, 0, 0, 0);
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);
      fimSemana.setHours(23, 59, 59, 999);

      // Semana anterior para comparação
      const inicioSemanaAnterior = new Date(inicioSemana);
      inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 7);
      const fimSemanaAnterior = new Date(inicioSemana);
      fimSemanaAnterior.setDate(fimSemanaAnterior.getDate() - 1);
      fimSemanaAnterior.setHours(23, 59, 59, 999);

      // KPIs desta semana
      const [consultasEsta] = await db.select({ total: count() }).from(consultas)
        .where(and(gte(consultas.dataHoraInicio, inicioSemana), lte(consultas.dataHoraInicio, fimSemana), ne(consultas.estado, "cancelada")));
      const [receitaEsta] = await db.select({ total: sql<string>`COALESCE(SUM(valor_total), 0)` }).from(faturas)
        .where(and(gte(faturas.dataEmissao, inicioSemana), lte(faturas.dataEmissao, fimSemana), eq(faturas.estado, "paga")));
      const [novosEsta] = await db.select({ total: count() }).from(utentes)
        .where(and(gte(utentes.createdAt, inicioSemana), lte(utentes.createdAt, fimSemana)));
      const [noShowEsta] = await db.select({ total: count() }).from(consultas)
        .where(and(gte(consultas.dataHoraInicio, inicioSemana), lte(consultas.dataHoraInicio, fimSemana), eq(consultas.estado, "no-show")));
      const [realizadasEsta] = await db.select({ total: count() }).from(consultas)
        .where(and(gte(consultas.dataHoraInicio, inicioSemana), lte(consultas.dataHoraInicio, fimSemana), eq(consultas.estado, "realizada")));

      // KPIs semana anterior
      const [consultasAnterior] = await db.select({ total: count() }).from(consultas)
        .where(and(gte(consultas.dataHoraInicio, inicioSemanaAnterior), lte(consultas.dataHoraInicio, fimSemanaAnterior), ne(consultas.estado, "cancelada")));
      const [receitaAnterior] = await db.select({ total: sql<string>`COALESCE(SUM(valor_total), 0)` }).from(faturas)
        .where(and(gte(faturas.dataEmissao, inicioSemanaAnterior), lte(faturas.dataEmissao, fimSemanaAnterior), eq(faturas.estado, "paga")));

      const cE = consultasEsta?.total || 0;
      const cA = consultasAnterior?.total || 0;
      const rE = Math.round(Number(receitaEsta?.total || 0));
      const rA = Math.round(Number(receitaAnterior?.total || 0));
      const nsE = noShowEsta?.total || 0;
      const nE = novosEsta?.total || 0;
      const reE = realizadasEsta?.total || 0;

      const calcVar = (a: number, b: number) => b > 0 ? ((a - b) / b * 100).toFixed(1) : "N/A";

      // Destaques
      const destaques: string[] = [];
      if (rE > rA) destaques.push(`Receita cresceu ${calcVar(rE, rA)}% face à semana anterior.`);
      if (nE > 0) destaques.push(`${nE} novo(s) paciente(s) registado(s).`);
      if (nsE === 0) destaques.push("Zero no-shows esta semana — excelente!");
      if (reE > 0) destaques.push(`${reE} consulta(s) realizada(s) com sucesso.`);

      // Alertas
      const alertas: string[] = [];
      if (nsE > 2) alertas.push(`${nsE} no-shows esta semana — acima do aceitável.`);
      if (rE < rA * 0.8) alertas.push("Receita caiu mais de 20% face à semana anterior.");
      if (cE < 10) alertas.push("Poucas consultas agendadas — considere ações de marketing.");

      return {
        success: true,
        data: {
          periodo: {
            inicio: inicioSemana.toLocaleDateString("pt-PT"),
            fim: fimSemana.toLocaleDateString("pt-PT"),
          },
          kpis: {
            consultas: { valor: cE, variacao: `${calcVar(cE, cA)}%`, anterior: cA },
            receita: { valor: `${rE}€`, variacao: `${calcVar(rE, rA)}%`, anterior: `${rA}€` },
            novosUtentes: nE,
            noShows: nsE,
            consultasRealizadas: reE,
            taxaRealizacao: cE > 0 ? `${Math.round((reE / cE) * 100)}%` : "N/A",
          },
          destaques,
          alertas,
        },
        message: `Relatório semanal: ${cE} consultas, ${rE}€ receita, ${nE} novos pacientes, ${nsE} no-shows. ${destaques.length} destaque(s) e ${alertas.length} alerta(s).`,
      };
    } catch (error: any) {
      return { success: false, error: `Erro ao gerar relatório: ${error.message}` };
    }
  },
  category: "analytics",
  requiresAuth: true,
};

// ─── Exportação ─────────────────────────────────────────────────────────────

export const automationTools: MCPToolDefinition[] = [
  gerarListaReactivacao,
  optimizarAgenda,
  gerarRelatorioSemanal,
];
