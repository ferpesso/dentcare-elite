/**
 * RBAC (Role-Based Access Control) para DentCare V28.0
 * Implementa 4 níveis de acesso: Master, Admin, Médico, Receção
 */

import { TRPCError } from "@trpc/server";
import type { User } from "../drizzle/schema";

export type Role = "master" | "admin" | "medico" | "recepcao" | "user";

/**
 * Permissões por role
 * Define o que cada role pode fazer no sistema
 */
export const rolePermissions: Record<Role, Set<string>> = {
  master: new Set([
    // Master tem acesso total
    "users.create",
    "users.read",
    "users.update",
    "users.delete",
    "users.manage_roles",
    "utentes.create",
    "utentes.read",
    "utentes.update",
    "utentes.delete",
    "medicos.create",
    "medicos.read",
    "medicos.update",
    "medicos.delete",
    "consultas.create",
    "consultas.read",
    "consultas.update",
    "consultas.delete",
    "pagamentos.create",
    "pagamentos.read",
    "pagamentos.update",
    "pagamentos.delete",
    "faturas.create",
    "faturas.read",
    "faturas.update",
    "faturas.delete",
    "comissoes.read",
    "comissoes.update",
    "auditlog.read",
    "dashboard.view_all",
    "reports.generate_all",
    "system.configure",
    "system.backup",
    "laboratorios.create",
    "laboratorios.read",
    "laboratorios.update",
    "laboratorios.delete",
    "envios_lab.create",
    "envios_lab.read",
    "envios_lab.update",
    "envios_lab.delete",
    "termos.create",
    "termos.read",
    "termos.update",
    "termos.delete",
  ]),

  admin: new Set([
    // Admin (Gestor) - Visão financeira e gestão
    "utentes.read",
    "utentes.create",
    "utentes.update",
    "medicos.read",
    "medicos.create",
    "medicos.update",
    "consultas.read",
    "consultas.create",
    "consultas.update",
    "pagamentos.read",
    "pagamentos.create",
    "pagamentos.update",
    "faturas.read",
    "faturas.create",
    "comissoes.read",
    "orcamentos.read",
    "orcamentos.create",
    "orcamentos.update",
    "auditlog.read",
    "dashboard.view_all",
    "dashboard.read",
    "reports.generate_financial",
    "reports.generate_clinical",
    "ai.query",
    "stocks.read",
    "stocks.update",
    "tabelasprecos.read",
    "tabelasprecos.update",
    "imagiologia.create",
    "imagiologia.read",
    "odontograma.read",
    "anamnese.read",
    "anamnese.update",
    "faturacao.create",
    "faturacao.read",
    "faturacao.update",
    "faturacao.delete",
    "financeiro.read",
    "financeiro.update",
    "system.configure",
    "redes_sociais.read",
    "redes_sociais.manage",
    "redes_sociais.publish",
    "relatorios.read",
    "stocks.create",
    "stocks.read",
    "stocks.update",
    "stocks.delete",
    "tabelasprecos.create",
    "tabelasprecos.read",
    "tabelasprecos.update",
    "whatsapp.send",
    "whatsapp.read",
    "laboratorios.create",
    "laboratorios.read",
    "laboratorios.update",
    "envios_lab.create",
    "envios_lab.read",
    "envios_lab.update",
    "termos.create",
    "termos.read",
    "termos.update",
    "termos.delete",
  ]),

  medico: new Set([
    // Médico/Dentista - Foco clínico
    "utentes.read",
    "utentes.update", // Apenas seus pacientes
    "consultas.read",
    "consultas.update", // Apenas suas consultas
    "orcamentos.create",
    "orcamentos.read",
    "orcamentos.update",
    "anamnese.read",
    "anamnese.update",
    "odontograma.read",
    "odontograma.update",
    "imagiologia.read",
    "imagiologia.create",
    "comissoes.read", // Apenas suas comissões
    "dashboard.view_personal",
    "dashboard.read",
    "reports.generate_personal",
    "whatsapp.send",
    "laboratorios.read",
    "envios_lab.create",
    "envios_lab.read",
    "envios_lab.update",
    "termos.read",
  ]),

  recepcao: new Set([
    // Receção - Agendamento e atendimento
    "utentes.read",
    "utentes.create",
    "utentes.update",
    "consultas.read",
    "consultas.create",
    "consultas.update",
    "pagamentos.create",
    "pagamentos.read",
    "pagamentos.update",
    "orcamentos.read",
    "faturas.read",
    "faturas.create",
    "dashboard.view_agenda",
    "dashboard.read",
    "reports.generate_financial",
    "stocks.read",
    "stocks.create",
    "stocks.update",
    "tabelasprecos.read",
    "tabelasprecos.create",
    "faturacao.read",
    "faturacao.update",
    "faturacao.delete",
    "financeiro.read",
    "whatsapp.send",
    "whatsapp.read",
    "laboratorios.read",
    "envios_lab.create",
    "envios_lab.read",
    "envios_lab.update",
    "termos.read",
  ]),

  user: new Set([
    // Utilizador padrão (em dev-login mapeamos para master)
    "utentes.read",
    "consultas.read",
    "consultas.create",
    "termos.read",
  ]),
};

// Garantir que master herda tudo (opcional se já listado)


/**
 * Verifica se um utilizador tem uma permissão específica
 */
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  // Se for master, tem todas as permissões
  if (user.role === "master") return true;
  const permissions = rolePermissions[user.role as Role];
  return permissions?.has(permission) ?? false;
}

/**
 * Verifica se um utilizador tem uma das permissões fornecidas
 */
export function hasAnyPermission(
  user: User | null,
  permissions: string[]
): boolean {
  if (!user) return false;
  return permissions.some((perm) => hasPermission(user, perm));
}

/**
 * Verifica se um utilizador tem todas as permissões fornecidas
 */
export function hasAllPermissions(
  user: User | null,
  permissions: string[]
): boolean {
  if (!user) return false;
  return permissions.every((perm) => hasPermission(user, perm));
}

/**
 * Middleware de autorização para tRPC
 * Lança erro se o utilizador não tem a permissão
 */
export function requirePermission(permission: string) {
  return (user: User | null) => {
    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Autenticação necessária",
      });
    }

    if (!hasPermission(user, permission)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Permissão negada. Necessária: ${permission}`,
      });
    }
  };
}

/**
 * Middleware de autorização para múltiplas permissões (ANY)
 */
export function requireAnyPermission(permissions: string[]) {
  return (user: User | null) => {
    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Autenticação necessária",
      });
    }

    if (!hasAnyPermission(user, permissions)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Permissão negada. Necessária uma de: ${permissions.join(", ")}`,
      });
    }
  };
}

/**
 * Middleware de autorização para múltiplas permissões (ALL)
 */
export function requireAllPermissions(permissions: string[]) {
  return (user: User | null) => {
    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Autenticação necessária",
      });
    }

    if (!hasAllPermissions(user, permissions)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Permissão negada. Necessárias todas: ${permissions.join(", ")}`,
      });
    }
  };
}

/**
 * Verifica se um utilizador é Master
 */
export function isMaster(user: User | null): boolean {
  return user?.role === "master";
}

/**
 * Verifica se um utilizador é Admin
 */
export function isAdmin(user: User | null): boolean {
  return user?.role === "admin";
}

/**
 * Verifica se um utilizador é Médico
 */
export function isMedico(user: User | null): boolean {
  return user?.role === "medico";
}

/**
 * Verifica se um utilizador é Receção
 */
export function isRecepcao(user: User | null): boolean {
  return user?.role === "recepcao";
}
