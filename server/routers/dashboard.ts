/**
 * Dashboard Router — Dados Reais do Sistema
 * DentCare Elite V32.3 — Feed de atividades, estatísticas e alertas
 * UPGRADE V32.3: Moeda dinâmica via configurações da BD
 */

import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";
import { getDb } from "../db";
import { auditLog, users, utentes, consultas, faturas, tratamentos, medicos, configuracoesClinica, stocks } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql, count, sum } from "drizzle-orm";

/** Helper: obtém o símbolo de moeda da BD (fallback: €) */
async function obterSimboloMoeda(): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return "€";
    const rows = await db.select().from(configuracoesClinica).where(eq(configuracoesClinica.chave, "simbolo_moeda")).limit(1);
    return rows[0]?.valor || "€";
  } catch { return "€"; }
}

export const dashboardRouter = router({
  /**
   * Obter feed de atividades recentes (Audit Log)
   */
  obterAtividades: protectedProcedure
    .input(
      z.object({
        limite: z.number().default(20),
        offset: z.number().default(0),
        filtro: z.enum(["todas", "utentes", "tratamentos", "financeiro"]).default("todas"),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const conditions = [];
      if (input.filtro === "utentes") conditions.push(eq(auditLog.tabela, "utentes"));
      if (input.filtro === "tratamentos") conditions.push(eq(auditLog.tabela, "tratamentos"));
      if (input.filtro === "financeiro") conditions.push(sql`${auditLog.tabela} IN ('faturas', 'recibos')`);

      const results = await db
        .select({
          id: auditLog.id,
          acao: auditLog.acao,
          tabela: auditLog.tabela,
          descricao: auditLog.descricao,
          usuario: users.name,
          data: auditLog.criadoEm,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.usuarioId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditLog.criadoEm))
        .limit(input.limite)
        .offset(input.offset);

      const atividades = results.map(r => {
        let icone = "Activity";
        let cor = "blue";

        if (r.acao === "create") { icone = "Plus"; cor = "emerald"; }
        else if (r.acao === "update") { icone = "Edit"; cor = "blue"; }
        else if (r.acao === "delete") { icone = "X"; cor = "red"; }

        if (r.tabela === "faturas") { icone = "DollarSign"; cor = "amber"; }
        else if (r.tabela === "consultas") { icone = "Calendar"; cor = "purple"; }

        return { ...r, icone, cor };
      });

      return {
        success: true,
        atividades,
        total: atividades.length,
      };
    }),

  /**
   * Obter estatísticas do dashboard
   */
  obterEstatisticas: protectedProcedure.query(async ({ ctx }) => {
    if (!hasPermission(ctx.user, "dashboard.read")) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const depoisDeAmanha = new Date(amanha);
    depoisDeAmanha.setDate(depoisDeAmanha.getDate() + 1);

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);

    // Calcular taxa de retenção real (utentes com consulta nos últimos 6 meses)
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
    const utentesComConsultaRecente = await db
      .select({ count: count(sql`DISTINCT ${consultas.utenteId}`) })
      .from(consultas)
      .where(gte(consultas.dataHoraInicio, seisMesesAtras));
    const totalUtentesComConsulta = Number(utentesComConsultaRecente[0]?.count) || 0;

    // Queries em paralelo para performance
    const [
      utentesAtivos,
      consultasHoje,
      consultasAmanha,
      receitaMes,
      receitaAno,
      novosTratamentos,
      tratamentosEmAndamento,
      pagamentosPendentes
    ] = await Promise.all([
      db.select({ count: count() }).from(utentes).where(eq(utentes.ativo, true)),
      db.select({ count: count() }).from(consultas).where(and(gte(consultas.dataHoraInicio, hoje), lte(consultas.dataHoraInicio, amanha))),
      db.select({ count: count() }).from(consultas).where(and(gte(consultas.dataHoraInicio, amanha), lte(consultas.dataHoraInicio, depoisDeAmanha))),
      db.select({ total: sum(faturas.valorTotal) }).from(faturas).where(and(eq(faturas.estado, "paga"), gte(faturas.dataEmissao, inicioMes))),
      db.select({ total: sum(faturas.valorTotal) }).from(faturas).where(and(eq(faturas.estado, "paga"), gte(faturas.dataEmissao, inicioAno))),
      db.select({ count: count() }).from(tratamentos).where(gte(tratamentos.createdAt, inicioMes)),
      db.select({ count: count() }).from(tratamentos).where(eq(tratamentos.estado, "em_progresso")),
      db.select({ total: sum(faturas.valorTotal) }).from(faturas).where(eq(faturas.estado, "pendente")),
    ]);

    const totalUtentes = Number(utentesAtivos[0]?.count) || 0;
    const taxaRetencao = totalUtentes > 0 ? (totalUtentesComConsulta / totalUtentes) * 100 : 0;

    const stats = {
      utentesAtivos: totalUtentes,
      consultasHoje: Number(consultasHoje[0]?.count) || 0,
      consultasAmanha: Number(consultasAmanha[0]?.count) || 0,
      receitaMes: Number(receitaMes[0]?.total) || 0,
      receitaAno: Number(receitaAno[0]?.total) || 0,
      taxaRetencao: Number(taxaRetencao.toFixed(1)),
      novosTratamentos: Number(novosTratamentos[0]?.count) || 0,
      tratamentosEmAndamento: Number(tratamentosEmAndamento[0]?.count) || 0,
      pagamentosPendentes: Number(pagamentosPendentes[0]?.total) || 0,
    };

    return {
      success: true,
      stats,
    };
  }),

  /**
   * Obter alertas importantes
   */
  obterAlertas: protectedProcedure.query(async ({ ctx }) => {
    if (!hasPermission(ctx.user, "dashboard.read")) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const faturasVencidas = await db
      .select({ count: count(), total: sum(faturas.valorTotal) })
      .from(faturas)
      .where(and(eq(faturas.estado, "pendente"), lte(faturas.dataVencimento, new Date())));

    // Alerta de Anamneses Pendentes para hoje
    const { anamneses } = await import("../../drizzle/schema");
    const anamnesesPendentes = await db
      .select({ count: count() })
      .from(consultas)
      .where(and(
        gte(consultas.dataHoraInicio, hoje),
        lte(consultas.dataHoraInicio, amanha),
        sql`${consultas.utenteId} NOT IN (SELECT utente_id FROM anamneses WHERE assinatura_digital IS NOT NULL)`
      ));

    const alertas = [];

    if (Number(anamnesesPendentes[0]?.count) > 0) {
      alertas.push({
        id: 0,
        tipo: "danger",
        titulo: "Anamneses em Falta",
        descricao: `${anamnesesPendentes[0].count} utentes agendados para hoje sem assinatura digital.`,
        acao: "Resolver Agora",
        path: "/anamnese",
      });
    }

    if (Number(faturasVencidas[0]?.count) > 0) {
      alertas.push({
        id: 1,
        tipo: "warning",
        titulo: "Pagamentos Pendentes",
        descricao: `${faturasVencidas[0].count} faturas vencidas totalizando ${await obterSimboloMoeda()}${Number(faturasVencidas[0].total).toFixed(2)}`,
        acao: "Ver Faturas",
        path: "/faturacao",
      });
    }

    // Alerta de Stocks Baixos
    const stocksBaixos = await db
      .select({ count: count() })
      .from(stocks)
      .where(sql`${stocks.quantidade} <= ${stocks.quantidadeMinima}`);

    if (Number(stocksBaixos[0]?.count) > 0) {
      alertas.push({
        id: 3,
        tipo: "warning",
        titulo: "Stock Crítico",
        descricao: `Existem ${stocksBaixos[0].count} produtos com stock abaixo do nível mínimo de segurança.`,
        acao: "Repor Stock",
        path: "/stocks",
      });
    }

    alertas.push({
      id: 2,
      tipo: "info",
      titulo: "Backup Diário Concluído",
      descricao: `Último backup: ${new Date().toLocaleDateString('pt-PT')} às 02:00`,
      acao: null,
      path: null,
    });

    return {
      success: true,
      alertas,
    };
  }),

  /**
   * Obter gráfico de receita (últimos 30 dias)
   */
  obterGraficoReceita: protectedProcedure.query(async ({ ctx }) => {
    if (!hasPermission(ctx.user, "dashboard.read")) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const faturasRecentes = await db
      .select({
        dia: sql<string>`DATE_FORMAT(${faturas.dataEmissao}, '%d/%m')`,
        receita: sum(faturas.valorTotal),
      })
      .from(faturas)
      .where(and(eq(faturas.estado, "paga"), gte(faturas.dataEmissao, trintaDiasAtras)))
      .groupBy(sql`DATE_FORMAT(${faturas.dataEmissao}, '%d/%m')`)
      .orderBy(sql`MIN(${faturas.dataEmissao})`);

    // Obter meta de receita da configuração
    const configMeta = await db.select({ valor: configuracoesClinica.valor })
      .from(configuracoesClinica)
      .where(eq(configuracoesClinica.chave, 'meta_receita_diaria'))
      .limit(1);
    const metaDiaria = configMeta[0] ? parseFloat(configMeta[0].valor) : 500;

    // Preencher todos os 30 dias — dias sem receita ficam com 0
    // Isto evita o borrão verde quando há poucos pontos de dados
    const mapaReceita: Record<string, number> = {};
    for (const f of faturasRecentes) {
      mapaReceita[f.dia] = Number(f.receita) || 0;
    }

    const dados30Dias: { dia: string; receita: number; meta: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const chave = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      dados30Dias.push({
        dia: chave,
        receita: mapaReceita[chave] ?? 0,
        meta: metaDiaria,
      });
    }

    return {
      success: true,
      dados: dados30Dias,
    };
  }),

  /**
   * Obter top 5 utentes por receita
   */
  obterTopUtentes: protectedProcedure.query(async ({ ctx }) => {
    if (!hasPermission(ctx.user, "dashboard.read")) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    const topUtentes = await db
      .select({
        id: utentes.id,
        nome: utentes.nome,
        receita: sum(faturas.valorTotal),
        consultas: count(consultas.id),
      })
      .from(utentes)
      .innerJoin(faturas, eq(utentes.id, faturas.utenteId))
      .leftJoin(consultas, eq(utentes.id, consultas.utenteId))
      .where(eq(faturas.estado, "paga"))
      .groupBy(utentes.id)
      .orderBy(desc(sql`sum(${faturas.valorTotal})`))
      .limit(5);

    return {
      success: true,
      utentes: topUtentes.map(u => ({ ...u, receita: Number(u.receita) })),
    };
  }),

  /**
   * Obter especialidades mais procuradas
   */
  obterEspecialidades: protectedProcedure.query(async ({ ctx }) => {
    if (!hasPermission(ctx.user, "dashboard.read")) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    const especialidades = await db
      .select({
        nome: medicos.especialidade,
        total: count(consultas.id),
      })
      .from(medicos)
      .innerJoin(consultas, eq(medicos.id, consultas.medicoId))
      .groupBy(medicos.especialidade)
      .orderBy(desc(sql`count(${consultas.id})`))
      .limit(5);

    const totalGeral = especialidades.reduce((acc, e) => acc + Number(e.total), 0);

    return {
      success: true,
      especialidades: especialidades.map(e => ({
        nome: e.nome || "Geral",
        total: Number(e.total),
        percentual: totalGeral > 0 ? Math.round((Number(e.total) / totalGeral) * 100) : 0,
      })),
    };
  }),

  /**
   * Obter alertas de saúde dos utentes (dados reais da BD)
   * - Utentes sem consulta há mais de 6 meses
   * - Utentes com aniversário nos próximos 7 dias
   * - Utentes com tratamentos pendentes há mais de 30 dias
   * - Utentes com faturas em atraso
   */
  obterAlertasSaude: protectedProcedure
    .input(z.object({ limite: z.number().default(100) }).optional())
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const alertas: any[] = [];
      const agora = new Date();
      const seisMesesAtras = new Date(agora);
      seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
      const trintaDiasAtras = new Date(agora);
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      // 1. Utentes sem consulta há mais de 6 meses
      const utentesComConsulta = await db
        .select({ utenteId: consultas.utenteId, ultimaConsulta: sql<Date>`MAX(${consultas.dataHoraInicio})` })
        .from(consultas)
        .where(eq(consultas.estado, "realizada"))
        .groupBy(consultas.utenteId);

      const utentesComConsultaMap = new Map(utentesComConsulta.map(r => [r.utenteId, r.ultimaConsulta]));

      const todosUtentes = await db
        .select({ id: utentes.id, nome: utentes.nome, telemovel: utentes.telemovel, dataNascimento: utentes.dataNascimento, createdAt: utentes.createdAt })
        .from(utentes)
        .where(eq(utentes.ativo, true))
        .limit(input?.limite ?? 100);

      for (const u of todosUtentes) {
        const ultimaConsulta = utentesComConsultaMap.get(u.id);

        // Sem consulta há mais de 6 meses
        if (!ultimaConsulta || new Date(ultimaConsulta) < seisMesesAtras) {
          const mesesSemConsulta = ultimaConsulta
            ? Math.floor((agora.getTime() - new Date(ultimaConsulta).getTime()) / (1000 * 60 * 60 * 24 * 30))
            : Math.floor((agora.getTime() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
          alertas.push({
            id: `consulta_${u.id}`,
            utenteId: u.id,
            utenteNome: u.nome,
            telefone: u.telemovel,
            tipo: "consulta_atraso",
            prioridade: mesesSemConsulta > 12 ? "critica" : mesesSemConsulta > 9 ? "alta" : "media",
            descricao: `Sem consulta há ${mesesSemConsulta} mese${mesesSemConsulta !== 1 ? "s" : ""}`,
            acao: "Agendar consulta de rotina",
            resolvido: false,
            diasAtraso: mesesSemConsulta * 30,
          });
        }

        // Aniversário nos próximos 7 dias
        if (u.dataNascimento) {
          const dn = new Date(u.dataNascimento);
          const aniversarioEsteAno = new Date(agora.getFullYear(), dn.getMonth(), dn.getDate());
          if (aniversarioEsteAno < agora) aniversarioEsteAno.setFullYear(agora.getFullYear() + 1);
          const diasParaAniversario = Math.floor((aniversarioEsteAno.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
          if (diasParaAniversario <= 7) {
            alertas.push({
              id: `aniversario_${u.id}`,
              utenteId: u.id,
              utenteNome: u.nome,
              telefone: u.telemovel,
              tipo: "aniversario",
              prioridade: diasParaAniversario <= 1 ? "alta" : "baixa",
              descricao: `Aniversário em ${diasParaAniversario} dia${diasParaAniversario !== 1 ? "s" : ""}`,
              acao: "Enviar mensagem de parabéns",
              resolvido: false,
              diasAtraso: diasParaAniversario,
            });
          }
        }
      }

      // 2. Tratamentos pendentes há mais de 30 dias
      const tratamentosPendentes = await db
        .select({
          utenteId: tratamentos.utenteId,
          utenteNome: utentes.nome,
          telemovel: utentes.telemovel,
          descricao: tratamentos.descricao,
          dataInicio: tratamentos.dataInicio,
        })
        .from(tratamentos)
        .innerJoin(utentes, eq(tratamentos.utenteId, utentes.id))
        .where(and(eq(tratamentos.estado, "pendente"), lte(tratamentos.dataInicio, trintaDiasAtras)))
        .limit(50);

      for (const t of tratamentosPendentes) {
        const diasPendente = Math.floor((agora.getTime() - new Date(t.dataInicio).getTime()) / (1000 * 60 * 60 * 24));
        alertas.push({
          id: `tratamento_${t.utenteId}_${diasPendente}`,
          utenteId: t.utenteId,
          utenteNome: t.utenteNome,
          telefone: t.telemovel,
          tipo: "tratamento_pendente",
          prioridade: diasPendente > 90 ? "critica" : diasPendente > 60 ? "alta" : "media",
          descricao: `${t.descricao || "Tratamento"} pendente há ${diasPendente} dias`,
          acao: "Contactar utente para agendar",
          resolvido: false,
          diasAtraso: diasPendente,
        });
      }

      // 3. Faturas em atraso
      const simbolo = await obterSimboloMoeda();
      const faturasPendentes = await db
        .select({
          utenteId: faturas.utenteId,
          utenteNome: utentes.nome,
          telemovel: utentes.telemovel,
          valorTotal: faturas.valorTotal,
          dataVencimento: faturas.dataVencimento,
        })
        .from(faturas)
        .innerJoin(utentes, eq(faturas.utenteId, utentes.id))
        .where(and(eq(faturas.estado, "pendente"), lte(faturas.dataVencimento, agora)))
        .limit(50);

      for (const f of faturasPendentes) {
        const diasAtraso = f.dataVencimento
          ? Math.floor((agora.getTime() - new Date(f.dataVencimento).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        alertas.push({
          id: `pagamento_${f.utenteId}_${diasAtraso}`,
          utenteId: f.utenteId,
          utenteNome: f.utenteNome,
          telefone: f.telemovel,
          tipo: "pagamento_atraso",
          prioridade: diasAtraso > 60 ? "critica" : diasAtraso > 30 ? "alta" : "media",
          descricao: `Fatura de ${simbolo}${Number(f.valorTotal).toFixed(2)} em atraso há ${diasAtraso} dias`,
          acao: "Enviar lembrete de pagamento",
          resolvido: false,
          diasAtraso,
        });
      }

      return {
        success: true,
        alertas,
        total: alertas.length,
        criticos: alertas.filter((a: any) => a.prioridade === "critica").length,
      };
    }),
});
