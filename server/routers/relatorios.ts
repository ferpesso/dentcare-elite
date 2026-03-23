import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { requirePermission } from "../rbac";
import { logAuditAction } from "../auditService";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { consultas, utentes, medicos, faturas } from "../../drizzle/schema";
import { and, gte, lte, sql, count, sum, eq, desc } from "drizzle-orm";

export const relatoriosRouter = router({
  dashboardExecutivo: protectedProcedure
    .input(z.object({ dataInicio: z.date(), dataFim: z.date() }))
    .query(async ({ ctx, input }) => {
      requirePermission("dashboard.view_all")(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const consultasData = await db.select({ total: count() }).from(consultas).where(and(gte(consultas.dataHoraInicio, input.dataInicio), lte(consultas.dataHoraInicio, input.dataFim)));
      const faturacaoData = await db.select({ total: sum(faturas.valorTotal) }).from(faturas).where(and(gte(faturas.dataEmissao, input.dataInicio), lte(faturas.dataEmissao, input.dataFim)));
      const utentesCount = await db.select({ total: count() }).from(utentes);
      const medicosCount = await db.select({ total: count() }).from(medicos);

      return {
        kpis: {
          consultas: { total: consultasData[0]?.total || 0 },
          faturacao: { totalBruto: Number(faturacaoData[0]?.total) || 0 },
          utentes: { total: utentesCount[0]?.total || 0 },
          equipa: { total: medicosCount[0]?.total || 0 },
        },
      };
    }),

  relatorioRetencao: protectedProcedure
    .input(z.object({
      mesesInatividade: z.number().default(6),
      // FIX V35.5: Paginação real para evitar carregar todos os inativos em memória
      limite: z.number().int().min(1).max(500).optional().default(100),
      offset: z.number().int().min(0).optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
        requirePermission("dashboard.view_all")(ctx.user);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

        const dataLimite = new Date();
        dataLimite.setMonth(dataLimite.getMonth() - input.mesesInatividade);
        const limite = input.limite ?? 100;
        const offset = input.offset ?? 0;

        // Contar total de inativos via subquery SQL
        const [totalResult] = await db.execute(sql`
          SELECT COUNT(*) AS total FROM (
            SELECT ${utentes.id}
            FROM ${utentes}
            INNER JOIN ${consultas} ON ${utentes.id} = ${consultas.utenteId}
            GROUP BY ${utentes.id}
            HAVING MAX(${consultas.dataHoraInicio}) < ${dataLimite}
          ) AS sub
        `) as any;
        const totalInativos = Number((totalResult as any)?.[0]?.total ?? 0);

        // Listagem paginada de inativos
        const inativos = await db
          .select({
            id: utentes.id,
            nome: utentes.nome,
            telemovel: utentes.telemovel,
            ultimaConsulta: sql<string>`MAX(${consultas.dataHoraInicio})`,
          })
          .from(utentes)
          .innerJoin(consultas, eq(utentes.id, consultas.utenteId))
          .groupBy(utentes.id)
          .having(sql`MAX(${consultas.dataHoraInicio}) < ${dataLimite}`)
          .orderBy(desc(sql`MAX(${consultas.dataHoraInicio})`))
          .limit(limite)
          .offset(offset);

        return {
          listaInativos: inativos.map(i => ({ ...i, ultimaConsulta: new Date(i.ultimaConsulta) })),
          totalInativos,
          limite,
          offset,
          temMais: offset + inativos.length < totalInativos,
        };
    }),
});
