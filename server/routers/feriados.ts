/**
 * Router de Feriados — Feriados Internacionais Dinâmicos
 * DentCare Elite V35 — Google Calendar Integration
 *
 * Endpoints:
 * - listar: Feriados do país configurado para um ano (ou intervalo)
 * - proximos: Próximos feriados (para alertas às recepcionistas)
 * - ehHojeFeriado: Verificar se hoje é feriado
 * - paisesDisponiveis: Lista de países suportados
 * - personalizados: Feriados personalizados da clínica
 * - adicionarPersonalizado: Adicionar feriado personalizado
 * - removerPersonalizado: Remover feriado personalizado
 *
 * O país é determinado pela configuração `pais_clinica` ou pelo
 * campo `conector_gcal_country_code` do Google Calendar.
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { configuracoesClinica } from "../../drizzle/schema";
import {
  resolverCodigoPais,
  obterFeriadosPorPaisAno,
  obterProximosFeriados,
  ehHojeFeriado,
  obterPaisesDisponiveis,
  formatarFeriados,
  limparCacheFeriados,
  type HolidayFormatted,
} from "../services/holidayService";

// ─── Helper: Obter código do país da clínica ───────────────────────────────

async function obterCodigoPaisClinica(db: any): Promise<string> {
  // 1. Tentar obter do conector Google Calendar (prioridade)
  // 2. Fallback para pais_clinica nas configurações
  const rows = await db
    .select()
    .from(configuracoesClinica)
    .where(sql`${configuracoesClinica.chave} IN ('conector_gcal_country_code', 'pais_clinica')`);

  let gcalCountry: string | null = null;
  let paisClinica: string | null = null;

  for (const row of rows) {
    if (row.chave === "conector_gcal_country_code" && row.valor) {
      gcalCountry = row.valor;
    }
    if (row.chave === "pais_clinica" && row.valor) {
      paisClinica = row.valor;
    }
  }

  // Prioridade: código do Google Calendar > país da clínica
  if (gcalCountry) {
    const codigo = resolverCodigoPais(gcalCountry);
    if (codigo) return codigo;
  }

  if (paisClinica) {
    const codigo = resolverCodigoPais(paisClinica);
    if (codigo) return codigo;
  }

  // Default: Portugal
  return "PT";
}

// ─── Helper: Obter feriados personalizados ──────────────────────────────────

async function obterFeriadosPersonalizados(db: any, ano: number): Promise<HolidayFormatted[]> {
  const chave = `feriados_personalizados_${ano}`;
  const rows = await db
    .select()
    .from(configuracoesClinica)
    .where(eq(configuracoesClinica.chave, chave))
    .limit(1);

  if (rows.length === 0) return [];

  try {
    const lista = JSON.parse(rows[0].valor) as Array<{ date: string; nome: string }>;
    return lista.map(f => ({
      date: f.date,
      nome: f.nome,
      nomeEN: f.nome,
      tipo: "Public" as const,
      tipos: ["Public" as const],
      global: true,
      countryCode: "CUSTOM",
      categoria: "personalizado" as const,
      cor: "cyan",
      icone: "CalendarPlus",
    }));
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

export const feriadosRouter = router({
  /**
   * Listar feriados do país configurado para um ano (ou intervalo de anos)
   * Inclui feriados personalizados da clínica
   */
  listar: protectedProcedure
    .input(z.object({
      ano: z.number().min(2000).max(2100).optional(),
      anoFim: z.number().min(2000).max(2100).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const countryCode = await obterCodigoPaisClinica(db);
      const anoAtual = new Date().getFullYear();
      const anoInicio = input?.ano ?? anoAtual;
      const anoFim = input?.anoFim ?? anoInicio;

      const todosAnosFeriados: HolidayFormatted[] = [];

      for (let y = anoInicio; y <= anoFim; y++) {
        const feriadosAPI = await obterFeriadosPorPaisAno(countryCode, y);
        todosAnosFeriados.push(...formatarFeriados(feriadosAPI));

        // Adicionar feriados personalizados
        const personalizados = await obterFeriadosPersonalizados(db, y);
        todosAnosFeriados.push(...personalizados);
      }

      return {
        success: true,
        countryCode,
        feriados: todosAnosFeriados,
      };
    }),

  /**
   * Próximos feriados (para alertas às recepcionistas)
   * Retorna os próximos N feriados com contagem de dias
   */
  proximos: protectedProcedure
    .input(z.object({
      limite: z.number().min(1).max(20).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const countryCode = await obterCodigoPaisClinica(db);
      const limite = input?.limite ?? 5;

      const proximos = await obterProximosFeriados(countryCode);
      const formatados = formatarFeriados(proximos).slice(0, limite);

      // Calcular dias até cada feriado
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const comDias = formatados.map(f => {
        const dataFeriado = new Date(f.date + "T00:00:00");
        const diffMs = dataFeriado.getTime() - hoje.getTime();
        const diasAte = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return {
          ...f,
          diasAte,
          ehAmanha: diasAte === 1,
          ehHoje: diasAte === 0,
          ehEstaSemana: diasAte >= 0 && diasAte <= 7,
        };
      });

      return {
        success: true,
        countryCode,
        proximos: comDias,
      };
    }),

  /**
   * Verificar se hoje é feriado no país configurado
   */
  ehHojeFeriado: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const countryCode = await obterCodigoPaisClinica(db);
      const resultado = await ehHojeFeriado(countryCode);

      // Se é feriado, buscar qual
      let feriadoHoje: HolidayFormatted | null = null;
      if (resultado) {
        const ano = new Date().getFullYear();
        const hoje = new Date().toISOString().split("T")[0];
        const feriados = await obterFeriadosPorPaisAno(countryCode, ano);
        const encontrado = feriados.find(f => f.date === hoje);
        if (encontrado) {
          feriadoHoje = formatarFeriados([encontrado])[0];
        }
      }

      return {
        success: true,
        countryCode,
        ehFeriado: resultado,
        feriado: feriadoHoje,
      };
    }),

  /**
   * Lista de países suportados (para o seletor no conector Google Calendar)
   */
  paisesDisponiveis: protectedProcedure
    .query(async () => {
      const paises = await obterPaisesDisponiveis();
      return {
        success: true,
        paises,
      };
    }),

  /**
   * Obter o país atualmente configurado
   */
  paisAtual: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const countryCode = await obterCodigoPaisClinica(db);
      const paises = await obterPaisesDisponiveis();
      const paisInfo = paises.find(p => p.countryCode === countryCode);

      return {
        success: true,
        countryCode,
        paisNome: paisInfo?.name || countryCode,
      };
    }),

  /**
   * Alterar o país dos feriados (via conector Google Calendar)
   */
  alterarPais: protectedProcedure
    .input(z.object({
      countryCode: z.string().length(2),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Verificar se o país é suportado
      const paises = await obterPaisesDisponiveis();
      const valido = paises.find(p => p.countryCode === input.countryCode.toUpperCase());
      if (!valido) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `País ${input.countryCode} não suportado. Consulte a lista de países disponíveis.`,
        });
      }

      // Upsert na configuração
      const chave = "conector_gcal_country_code";
      const existente = await db
        .select()
        .from(configuracoesClinica)
        .where(eq(configuracoesClinica.chave, chave))
        .limit(1);

      if (existente.length > 0) {
        await db
          .update(configuracoesClinica)
          .set({ valor: input.countryCode.toUpperCase(), updatedAt: new Date() })
          .where(eq(configuracoesClinica.id, existente[0].id));
      } else {
        await db.insert(configuracoesClinica).values({
          chave,
          valor: input.countryCode.toUpperCase(),
          tipo: "string",
          updatedAt: new Date(),
        });
      }

      // Limpar cache para forçar reload
      limparCacheFeriados();

      return {
        success: true,
        message: `País dos feriados alterado para ${valido.name} (${input.countryCode.toUpperCase()})`,
        countryCode: input.countryCode.toUpperCase(),
        paisNome: valido.name,
      };
    }),

  /**
   * Listar feriados personalizados da clínica
   */
  personalizados: protectedProcedure
    .input(z.object({
      ano: z.number().min(2000).max(2100).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const ano = input?.ano ?? new Date().getFullYear();
      const personalizados = await obterFeriadosPersonalizados(db, ano);

      return {
        success: true,
        feriados: personalizados,
        ano,
      };
    }),

  /**
   * Adicionar feriado personalizado
   */
  adicionarPersonalizado: protectedProcedure
    .input(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      nome: z.string().min(1).max(100),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const ano = parseInt(input.date.split("-")[0]);
      const chave = `feriados_personalizados_${ano}`;

      // Obter lista existente
      const rows = await db
        .select()
        .from(configuracoesClinica)
        .where(eq(configuracoesClinica.chave, chave))
        .limit(1);

      let lista: Array<{ date: string; nome: string }> = [];
      if (rows.length > 0) {
        try {
          lista = JSON.parse(rows[0].valor);
        } catch { /* ignorar */ }
      }

      // Verificar duplicata
      if (lista.some(f => f.date === input.date)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Já existe um feriado personalizado para ${input.date}`,
        });
      }

      lista.push({ date: input.date, nome: input.nome });
      lista.sort((a, b) => a.date.localeCompare(b.date));

      // Upsert
      if (rows.length > 0) {
        await db
          .update(configuracoesClinica)
          .set({ valor: JSON.stringify(lista), updatedAt: new Date() })
          .where(eq(configuracoesClinica.id, rows[0].id));
      } else {
        await db.insert(configuracoesClinica).values({
          chave,
          valor: JSON.stringify(lista),
          tipo: "json",
          updatedAt: new Date(),
        });
      }

      return {
        success: true,
        message: `Feriado "${input.nome}" adicionado para ${input.date}`,
      };
    }),

  /**
   * Remover feriado personalizado
   */
  removerPersonalizado: protectedProcedure
    .input(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const ano = parseInt(input.date.split("-")[0]);
      const chave = `feriados_personalizados_${ano}`;

      const rows = await db
        .select()
        .from(configuracoesClinica)
        .where(eq(configuracoesClinica.chave, chave))
        .limit(1);

      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feriado não encontrado" });
      }

      let lista: Array<{ date: string; nome: string }> = [];
      try {
        lista = JSON.parse(rows[0].valor);
      } catch { /* ignorar */ }

      const novaLista = lista.filter(f => f.date !== input.date);
      if (novaLista.length === lista.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feriado não encontrado" });
      }

      await db
        .update(configuracoesClinica)
        .set({ valor: JSON.stringify(novaLista), updatedAt: new Date() })
        .where(eq(configuracoesClinica.id, rows[0].id));

      return {
        success: true,
        message: `Feriado removido de ${input.date}`,
      };
    }),
});
