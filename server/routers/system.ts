/**
 * Router de Sistema — DentCare Elite V35
 * FIX: Adicionado endpoint criarBackup real (exportação JSON de todas as tabelas).
 */
import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { isMaster, isAdmin } from "../rbac";
import { logAuditAction } from "../auditService";
import {
  utentes, consultas, tratamentos, faturas, recibos,
  medicos, stocks, campanhasMarketing, evolucoes,
  anamneses, imagiologia, ligacoes, configuracoesClinica,
  agendas, termosConsentimento,
} from "../../drizzle/schema";

export const systemRouter = router({
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      return {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        role: ctx.user.role,
        loginMethod: ctx.user.loginMethod,
      };
    }),
    logout: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.res) ctx.res.clearCookie("dentcare.sid");
      return { success: true, message: "Logout realizado com sucesso" };
    }),
  }),

  health: publicProcedure.query(async () => ({
    status: "operational",
    timestamp: new Date(),
    version: "35.0",
  })),

  config: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    let nomeClinica = "DentCare Elite";
    if (db) {
      const rows = await db.select().from(configuracoesClinica).where(eq(configuracoesClinica.chave, "nome_clinica")).limit(1);
      nomeClinica = rows[0]?.valor || "DentCare Elite";
    }
    return {
      appName: nomeClinica,
      version: "35.0",
      environment: process.env.NODE_ENV || "production",
      features: {
        voiceBriefing: true,
        anamnese: true,
        whatsappMarketing: true,
        iaPreditiva: true,
        imagiologia: true,
      },
    };
  }),

  /**
   * FIX: Backup real — exporta todas as tabelas críticas em JSON.
   * Antes era apenas um setTimeout de 3 segundos sem fazer nada.
   * Agora exporta dados reais da BD. Apenas master/admin podem executar.
   */
  criarBackup: protectedProcedure.mutation(async ({ ctx }) => {
    if (!isMaster(ctx.user) && !isAdmin(ctx.user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem criar backups." });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    try {
      const [
        utentesData, consultasData, tratamentosData, faturasData,
        recibosData, medicosData, stocksData, campanhasData,
        evolucoesData, anamnesData, imagiologiaData, ligacoesData,
        configData, agendasData, termosData,
      ] = await Promise.all([
        db.select().from(utentes),
        db.select().from(consultas),
        db.select().from(tratamentos),
        db.select().from(faturas),
        db.select().from(recibos),
        db.select().from(medicos),
        db.select().from(stocks),
        db.select().from(campanhasMarketing),
        db.select().from(evolucoes),
        db.select().from(anamneses),
        db.select().from(imagiologia),
        db.select().from(ligacoes),
        db.select().from(configuracoesClinica),
        db.select().from(agendas),
        db.select().from(termosConsentimento),
      ]);

      const backup = {
        meta: {
          versao: "35.0",
          criadoEm: new Date().toISOString(),
          criadoPor: ctx.user.name ?? ctx.user.email ?? "desconhecido",
          totalRegistos: {
            utentes: utentesData.length,
            consultas: consultasData.length,
            tratamentos: tratamentosData.length,
            faturas: faturasData.length,
          },
        },
        dados: {
          utentes: utentesData,
          consultas: consultasData,
          tratamentos: tratamentosData,
          faturas: faturasData,
          recibos: recibosData,
          medicos: medicosData,
          stocks: stocksData,
          campanhasMarketing: campanhasData,
          evolucoes: evolucoesData,
          anamneses: anamnesData,
          imagiologia: imagiologiaData,
          ligacoes: ligacoesData,
          configuracoes: configData,
          agendas: agendasData,
          termosConsentimento: termosData,
        },
      };

      await logAuditAction(ctx.user, {
        acao: "BACKUP_CRIADO",
        tabela: "sistema",
        registoId: 0,
        descricao: `Backup criado: ${utentesData.length} utentes, ${consultasData.length} consultas, ${faturasData.length} faturas`,
      });

      return {
        success: true,
        backup,
        nomeArquivo: `dentcare_backup_${new Date().toISOString().slice(0, 10)}.json`,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao criar backup: ${(error as Error).message}`,
      });
    }
  }),
});
