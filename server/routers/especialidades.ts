/**
 * Router de Especialidades — DentCare Elite V31
 * FIX: Migrado de dados estáticos hardcoded para base de dados real.
 * Fallback para dados estáticos caso a tabela ainda não exista (graceful degradation).
 */
import { z } from "zod";import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { especialidades } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { hasPermission } from "../rbac";

const ESPECIALIDADES_FALLBACK = [
  { id: 1, nome: "Implantologia", cor: "#0066FF", icone: "tooth-implant", descricao: "Colocação e manutenção de implantes dentários", ativo: true },
  { id: 2, nome: "Ortodontia", cor: "#FF6600", icone: "braces", descricao: "Correcção de má-oclusão e alinhamento dentário", ativo: true },
  { id: 3, nome: "Endodontia", cor: "#CC0000", icone: "root-canal", descricao: "Tratamento de canais radiculares", ativo: true },
  { id: 4, nome: "Periodontologia", cor: "#009900", icone: "gum", descricao: "Tratamento de doenças das gengivas e osso alveolar", ativo: true },
  { id: 5, nome: "Cirurgia Oral", cor: "#990099", icone: "scalpel", descricao: "Extracções e cirurgias da cavidade oral", ativo: true },
  { id: 6, nome: "Dentisteria Operatória", cor: "#006699", icone: "filling", descricao: "Restaurações e tratamentos conservadores", ativo: true },
  { id: 7, nome: "Prostodontia", cor: "#CC6600", icone: "crown", descricao: "Próteses dentárias fixas e removíveis", ativo: true },
  { id: 8, nome: "Odontopediatria", cor: "#FF3399", icone: "child-tooth", descricao: "Cuidados dentários para crianças", ativo: true },
];

export const especialidadesRouter = router({
  list: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return ESPECIALIDADES_FALLBACK;
      const results = await db.select().from(especialidades).where(eq(especialidades.ativo, true));
      return results.length > 0 ? results : ESPECIALIDADES_FALLBACK;
    } catch {
      return ESPECIALIDADES_FALLBACK;
    }
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (db) {
          const [esp] = await db.select().from(especialidades).where(eq(especialidades.id, input.id)).limit(1);
          if (esp) return esp;
        }
      } catch { /* fallback */ }
      const esp = ESPECIALIDADES_FALLBACK.find((e) => e.id === input.id);
      if (!esp) throw new TRPCError({ code: "NOT_FOUND", message: "Especialidade não encontrada" });
      return esp;
    }),

  criar: protectedProcedure
    .input(z.object({
      nome: z.string().min(2),
      descricao: z.string().optional(),
      icone: z.string().optional(),
      cor: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "users.manage_roles")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [result] = await db.insert(especialidades).values({
        nome: input.nome,
        descricao: input.descricao ?? null,
        icone: input.icone ?? null,
        cor: input.cor ?? null,
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { success: true, id: result.insertId };
    }),
});
