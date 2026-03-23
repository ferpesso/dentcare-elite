/**
 * controloAcesso.ts — Router de Controlo de Acesso Dinâmico
 * DentCare Elite V32.8
 *
 * Permite ao utilizador MASTER editar as permissões de cada role
 * em tempo real, persistindo na tabela role_permissions_custom.
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { isMaster } from "../rbac";
import { sql } from "drizzle-orm";

// ─── Definição completa de módulos e permissões disponíveis ──────────────────
export const MODULOS_PERMISSOES = [
  {
    modulo: "Utentes",
    icone: "Users",
    permissoes: [
      { chave: "utentes.read",   label: "Ver utentes" },
      { chave: "utentes.create", label: "Criar utentes" },
      { chave: "utentes.update", label: "Editar utentes" },
      { chave: "utentes.delete", label: "Eliminar utentes" },
    ],
  },
  {
    modulo: "Consultas & Agenda",
    icone: "Calendar",
    permissoes: [
      { chave: "consultas.read",   label: "Ver consultas" },
      { chave: "consultas.create", label: "Criar consultas" },
      { chave: "consultas.update", label: "Editar consultas" },
      { chave: "consultas.delete", label: "Cancelar consultas" },
    ],
  },
  {
    modulo: "Financeiro & Faturação",
    icone: "DollarSign",
    permissoes: [
      { chave: "financeiro.read",    label: "Ver financeiro" },
      { chave: "financeiro.update",  label: "Editar financeiro" },
      { chave: "pagamentos.read",    label: "Ver pagamentos" },
      { chave: "pagamentos.create",  label: "Registar pagamentos" },
      { chave: "faturas.read",       label: "Ver faturas" },
      { chave: "faturas.create",     label: "Criar faturas" },
      { chave: "faturas.update",     label: "Editar faturas" },
      { chave: "faturas.delete",     label: "Anular faturas" },
    ],
  },
  {
    modulo: "Stocks & Inventário",
    icone: "Package",
    permissoes: [
      { chave: "stocks.read",   label: "Ver stocks" },
      { chave: "stocks.create", label: "Adicionar produtos" },
      { chave: "stocks.update", label: "Editar stocks" },
      { chave: "stocks.delete", label: "Eliminar produtos" },
    ],
  },
  {
    modulo: "Equipa & Médicos",
    icone: "Stethoscope",
    permissoes: [
      { chave: "medicos.read",   label: "Ver médicos" },
      { chave: "medicos.create", label: "Adicionar médicos" },
      { chave: "medicos.update", label: "Editar médicos" },
      { chave: "medicos.delete", label: "Remover médicos" },
    ],
  },
  {
    modulo: "WhatsApp & Comunicação",
    icone: "MessageCircle",
    permissoes: [
      { chave: "whatsapp.read", label: "Ver histórico WhatsApp" },
      { chave: "whatsapp.send", label: "Enviar mensagens" },
    ],
  },
  {
    modulo: "Laboratórios",
    icone: "FlaskConical",
    permissoes: [
      { chave: "laboratorios.read",   label: "Ver laboratórios" },
      { chave: "laboratorios.create", label: "Adicionar laboratórios" },
      { chave: "laboratorios.update", label: "Editar laboratórios" },
      { chave: "laboratorios.delete", label: "Eliminar laboratórios" },
      { chave: "envios_lab.read",     label: "Ver envios de lab" },
      { chave: "envios_lab.create",   label: "Criar envios de lab" },
      { chave: "envios_lab.update",   label: "Editar envios de lab" },
      { chave: "envios_lab.delete",   label: "Eliminar envios de lab" },
    ],
  },
  {
    modulo: "Termos & Consentimentos",
    icone: "FileText",
    permissoes: [
      { chave: "termos.read",   label: "Ver termos" },
      { chave: "termos.create", label: "Criar termos" },
      { chave: "termos.update", label: "Editar termos" },
      { chave: "termos.delete", label: "Eliminar termos" },
    ],
  },
  {
    modulo: "Dashboard & Relatórios",
    icone: "BarChart2",
    permissoes: [
      { chave: "dashboard.read",         label: "Ver dashboard" },
      { chave: "reports.generate_all",   label: "Gerar relatórios" },
      { chave: "comissoes.read",         label: "Ver comissões" },
    ],
  },
  {
    modulo: "Sistema & Administração",
    icone: "Settings",
    permissoes: [
      { chave: "system.configure",    label: "Configurar sistema" },
      { chave: "system.backup",       label: "Fazer backups" },
      { chave: "auditlog.read",       label: "Ver audit log" },
      { chave: "users.manage_roles",  label: "Gerir papéis de utilizadores" },
    ],
  },
];

export const ROLES_EDITAVEIS = ["admin", "medico", "recepcao", "user"] as const;
export type RoleEditavel = typeof ROLES_EDITAVEIS[number];

export const controloAcessoRouter = router({
  /**
   * Obter a matriz completa de permissões por role (para o MASTER editar)
   */
  obterMatriz: protectedProcedure
    .query(async ({ ctx }) => {
      if (!isMaster(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o MASTER pode gerir o controlo de acesso." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const rows = await db.execute(
        sql`SELECT role, permission, granted FROM role_permissions_custom ORDER BY role, permission`
      ) as any;

      // Construir mapa: { role: { permission: granted } }
      const matriz: Record<string, Record<string, boolean>> = {};
      for (const role of ROLES_EDITAVEIS) {
        matriz[role] = {};
      }

      const resultRows = Array.isArray(rows) ? rows : (rows as any)[0] ?? [];
      for (const row of resultRows) {
        if (matriz[row.role]) {
          matriz[row.role][row.permission] = Boolean(row.granted);
        }
      }

      return {
        success: true,
        matriz,
        modulos: MODULOS_PERMISSOES,
        roles: ROLES_EDITAVEIS,
      };
    }),

  /**
   * Atualizar uma permissão específica de um role (MASTER only)
   */
  atualizarPermissao: protectedProcedure
    .input(z.object({
      role: z.enum(["admin", "medico", "recepcao", "user"]),
      permission: z.string().min(1).max(100),
      granted: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!isMaster(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o MASTER pode alterar permissões." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      await db.execute(
        sql`INSERT INTO role_permissions_custom (role, permission, granted, updated_by, updated_at)
            VALUES (${input.role}, ${input.permission}, ${input.granted}, ${ctx.user.id}, NOW())
            ON DUPLICATE KEY UPDATE granted = ${input.granted}, updated_by = ${ctx.user.id}, updated_at = NOW()`
      );

      return { success: true, message: `Permissão '${input.permission}' para '${input.role}' ${input.granted ? 'concedida' : 'revogada'}.` };
    }),

  /**
   * Atualizar todas as permissões de um role de uma vez (guardar tudo)
   */
  guardarRole: protectedProcedure
    .input(z.object({
      role: z.enum(["admin", "medico", "recepcao", "user"]),
      permissoes: z.record(z.string(), z.boolean()),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!isMaster(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o MASTER pode alterar permissões." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      for (const [permission, granted] of Object.entries(input.permissoes)) {
        await db.execute(
          sql`INSERT INTO role_permissions_custom (role, permission, granted, updated_by, updated_at)
              VALUES (${input.role}, ${permission}, ${granted}, ${ctx.user.id}, NOW())
              ON DUPLICATE KEY UPDATE granted = ${granted}, updated_by = ${ctx.user.id}, updated_at = NOW()`
        );
      }

      return { success: true, message: `Permissões do role '${input.role}' guardadas com sucesso.` };
    }),

  /**
   * Repor permissões padrão de um role
   */
  reporPadrao: protectedProcedure
    .input(z.object({
      role: z.enum(["admin", "medico", "recepcao", "user"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!isMaster(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o MASTER pode repor permissões." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      await db.execute(
        sql`DELETE FROM role_permissions_custom WHERE role = ${input.role}`
      );

      return { success: true, message: `Permissões do role '${input.role}' repostas para os valores padrão.` };
    }),

  /**
   * Obter permissões do utilizador atual (para uso no frontend)
   */
  minhasPermissoes: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Master tem tudo
      if (ctx.user.role === "master") {
        return { success: true, permissoes: ["*"], isMaster: true };
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const rows = await db.execute(
        sql`SELECT permission FROM role_permissions_custom WHERE role = ${ctx.user.role} AND granted = 1`
      ) as any;

      const resultRows = Array.isArray(rows) ? rows : (rows as any)[0] ?? [];
      const permissoes = resultRows.map((r: any) => r.permission);

      return { success: true, permissoes, isMaster: false };
    }),
});
